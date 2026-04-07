import { getLevelFromPoints } from "@/lib/points";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type FeedItem = {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
  authorLevel: number;
  authorLevelTitle: string;
  authorLevelColor: string;
  authorIsPremium: boolean;
  questionContent: string | null;
  voiceMode: string;
  durationSeconds: number;
  expiresAt: string | null;
  createdAt: string;
  audioUrl: string;
  shareUrl: string;
  reactions: { clap: number; laugh: number; replay: number };
};

export type FeedCategory = "all" | "latest" | "popular" | "short" | "long" | "anonymous";

/* ------------------------------------------------------------------ */
/*  Joined row shape returned by the voice_posts query with embeds    */
/* ------------------------------------------------------------------ */

type JoinedPostRow = {
  id: string;
  author_id: string;
  question_id: string | null;
  storage_path: string;
  duration_seconds: number;
  voice_mode: string;
  expires_at: string | null;
  created_at: string;
  profiles: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    is_premium: boolean;
    points: number;
  } | null;
  questions: {
    id: string;
    content: string;
  } | null;
};

/* ------------------------------------------------------------------ */
/*  Shared select string – embeds profiles & questions via FK joins    */
/* ------------------------------------------------------------------ */

const POSTS_SELECT = [
  "id",
  "author_id",
  "question_id",
  "storage_path",
  "duration_seconds",
  "voice_mode",
  "expires_at",
  "created_at",
  "profiles!author_id(id, username, display_name, avatar_url, is_premium, points)",
  "questions!question_id(id, content)",
].join(", ");

/* ------------------------------------------------------------------ */
/*  Build reaction map via RPC (aggregated server-side)               */
/* ------------------------------------------------------------------ */

type ReactionCountRow = {
  voice_post_id: string;
  sound_type: "clap" | "laugh" | "replay";
  cnt: number;
};

async function fetchReactionCounts(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  postIds: string[]
): Promise<Map<string, { clap: number; laugh: number; replay: number }>> {
  const map = new Map<string, { clap: number; laugh: number; replay: number }>();
  if (postIds.length === 0) return map;

  const { data, error } = await admin.rpc("get_reaction_counts", {
    post_ids: postIds,
  });
  if (error) throw new Error(error.message);

  for (const r of (data ?? []) as ReactionCountRow[]) {
    const cur = map.get(r.voice_post_id) ?? { clap: 0, laugh: 0, replay: 0 };
    cur[r.sound_type] += r.cnt;
    map.set(r.voice_post_id, cur);
  }
  return map;
}

/* ------------------------------------------------------------------ */
/*  Map joined rows to FeedItem[]                                     */
/* ------------------------------------------------------------------ */

function mapPostsToFeedItems(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  posts: JoinedPostRow[],
  reactionMap: Map<string, { clap: number; laugh: number; replay: number }>
): FeedItem[] {
  return posts.map((post) => {
    const profile = post.profiles;
    const levelInfo = getLevelFromPoints(profile?.points ?? 0);
    return {
      id: post.id,
      authorId: post.author_id,
      authorName: profile?.display_name ?? profile?.username ?? "Voiq user",
      authorUsername: profile?.username ?? null,
      authorAvatarUrl: profile?.avatar_url ?? null,
      authorLevel: levelInfo.level,
      authorLevelTitle: levelInfo.title,
      authorLevelColor: levelInfo.color,
      authorIsPremium: profile?.is_premium ?? false,
      questionContent: post.questions?.content ?? null,
      voiceMode: post.voice_mode,
      durationSeconds: post.duration_seconds,
      expiresAt: post.expires_at,
      createdAt: post.created_at,
      audioUrl: admin.storage.from("voice-posts").getPublicUrl(post.storage_path).data.publicUrl,
      shareUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/share/${post.id}`,
      reactions: reactionMap.get(post.id) ?? { clap: 0, laugh: 0, replay: 0 },
    };
  });
}

/* ------------------------------------------------------------------ */
/*  getPublicFeed                                                     */
/* ------------------------------------------------------------------ */

export async function getPublicFeed(
  category: FeedCategory = "all",
  query = "",
  limit = 24
): Promise<FeedItem[]> {
  const admin = getSupabaseAdminClient();

  // Single query: voice_posts + profiles + questions via FK joins
  let postsQuery = admin
    .from("voice_posts")
    .select(POSTS_SELECT)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  // カテゴリフィルタ
  if (category === "short") {
    postsQuery = postsQuery.lte("duration_seconds", 10);
  } else if (category === "long") {
    postsQuery = postsQuery.gt("duration_seconds", 10);
  } else if (category === "anonymous") {
    postsQuery = postsQuery.neq("voice_mode", "original");
  }

  const { data: posts, error: postsError } = await postsQuery;
  if (postsError) throw new Error(postsError.message);
  if (!posts || posts.length === 0) return [];

  const joinedPosts = posts as unknown as JoinedPostRow[];

  // Aggregated reaction counts via RPC (no individual rows in memory)
  const reactionMap = await fetchReactionCounts(
    admin,
    joinedPosts.map((p) => p.id)
  );

  let items = mapPostsToFeedItems(admin, joinedPosts, reactionMap);

  // 検索フィルタ
  if (query) {
    const q = query.toLowerCase();
    items = items.filter(
      (item) =>
        item.authorName.toLowerCase().includes(q) ||
        (item.authorUsername ?? "").toLowerCase().includes(q) ||
        (item.questionContent ?? "").toLowerCase().includes(q)
    );
  }

  // popular カテゴリはリアクション数でソート
  if (category === "popular") {
    items.sort((a, b) => {
      const aTotal = a.reactions.clap + a.reactions.laugh + a.reactions.replay;
      const bTotal = b.reactions.clap + b.reactions.laugh + b.reactions.replay;
      return bTotal - aTotal;
    });
  }

  return items;
}

/* ------------------------------------------------------------------ */
/*  getFollowingFeed                                                  */
/* ------------------------------------------------------------------ */

export async function getFollowingFeed(userId: string, limit = 24): Promise<FeedItem[]> {
  const admin = getSupabaseAdminClient();

  const { data: follows, error: followsError } = await admin
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);
  if (followsError) throw new Error(followsError.message);
  if (!follows || follows.length === 0) return [];

  const followingIds = follows.map((f) => f.following_id);

  // Single query: voice_posts + profiles + questions via FK joins
  const { data: posts, error: postsError } = await admin
    .from("voice_posts")
    .select(POSTS_SELECT)
    .in("author_id", followingIds)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (postsError) throw new Error(postsError.message);
  if (!posts || posts.length === 0) return [];

  const joinedPosts = posts as unknown as JoinedPostRow[];

  // Aggregated reaction counts via RPC (no individual rows in memory)
  const reactionMap = await fetchReactionCounts(
    admin,
    joinedPosts.map((p) => p.id)
  );

  return mapPostsToFeedItems(admin, joinedPosts, reactionMap);
}
