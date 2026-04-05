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

type VoicePostRow = {
  id: string;
  author_id: string;
  question_id: string | null;
  storage_path: string;
  duration_seconds: number;
  voice_mode: string;
  expires_at: string | null;
  created_at: string;
};

type ReactionRow = {
  voice_post_id: string;
  sound_type: "clap" | "laugh" | "replay";
};

export async function getPublicFeed(
  category: FeedCategory = "all",
  query = "",
  limit = 24
): Promise<FeedItem[]> {
  const admin = getSupabaseAdminClient();

  let postsQuery = admin
    .from("voice_posts")
    .select("*")
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

  const voicePosts = posts as VoicePostRow[];
  const authorIds = [...new Set(voicePosts.map((p) => p.author_id))];
  const questionIds = voicePosts.map((p) => p.question_id).filter((id): id is string => Boolean(id));

  const [profilesResult, questionsResult, reactionsResult] = await Promise.all([
    admin.from("profiles").select("id, username, display_name, avatar_url, is_premium, points").in("id", authorIds),
    questionIds.length > 0
      ? admin.from("questions").select("id, content").in("id", questionIds)
      : Promise.resolve({ data: [], error: null }),
    admin.from("reactions").select("voice_post_id, sound_type").in("voice_post_id", voicePosts.map((p) => p.id))
  ]);

  if (profilesResult.error) throw new Error(profilesResult.error.message);
  if (questionsResult.error) throw new Error(questionsResult.error.message);
  if (reactionsResult.error) throw new Error(reactionsResult.error.message);

  const profileMap = new Map(
    (profilesResult.data ?? []).map((p) => [p.id, p])
  );
  const questionMap = new Map(
    (questionsResult.data ?? []).map((q) => [q.id, q.content as string])
  );

  const reactionMap = new Map<string, { clap: number; laugh: number; replay: number }>();
  for (const r of (reactionsResult.data ?? []) as ReactionRow[]) {
    const cur = reactionMap.get(r.voice_post_id) ?? { clap: 0, laugh: 0, replay: 0 };
    cur[r.sound_type] += 1;
    reactionMap.set(r.voice_post_id, cur);
  }

  let items: FeedItem[] = voicePosts.map((post) => {
    const profile = profileMap.get(post.author_id);
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
      questionContent: post.question_id ? questionMap.get(post.question_id) ?? null : null,
      voiceMode: post.voice_mode,
      durationSeconds: post.duration_seconds,
      expiresAt: post.expires_at,
      createdAt: post.created_at,
      audioUrl: admin.storage.from("voice-posts").getPublicUrl(post.storage_path).data.publicUrl,
      shareUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/share/${post.id}`,
      reactions: reactionMap.get(post.id) ?? { clap: 0, laugh: 0, replay: 0 }
    };
  });

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

export async function getFollowingFeed(userId: string, limit = 24): Promise<FeedItem[]> {
  const admin = getSupabaseAdminClient();
  const { data: follows, error: followsError } = await admin
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);
  if (followsError) throw new Error(followsError.message);
  if (!follows || follows.length === 0) return [];

  const followingIds = follows.map((f) => f.following_id);
  const { data: posts, error: postsError } = await admin
    .from("voice_posts")
    .select("*")
    .in("author_id", followingIds)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (postsError) throw new Error(postsError.message);
  if (!posts || posts.length === 0) return [];

  // 再利用のため getPublicFeed と同じ enrichment
  const voicePosts = posts as VoicePostRow[];
  const authorIds = [...new Set(voicePosts.map((p) => p.author_id))];
  const questionIds = voicePosts.map((p) => p.question_id).filter((id): id is string => Boolean(id));

  const [profilesResult, questionsResult, reactionsResult] = await Promise.all([
    admin.from("profiles").select("id, username, display_name, avatar_url, is_premium, points").in("id", authorIds),
    questionIds.length > 0
      ? admin.from("questions").select("id, content").in("id", questionIds)
      : Promise.resolve({ data: [], error: null }),
    admin.from("reactions").select("voice_post_id, sound_type").in("voice_post_id", voicePosts.map((p) => p.id))
  ]);

  if (profilesResult.error) throw new Error(profilesResult.error.message);
  if (questionsResult.error) throw new Error(questionsResult.error.message);
  if (reactionsResult.error) throw new Error(reactionsResult.error.message);

  const profileMap = new Map((profilesResult.data ?? []).map((p) => [p.id, p]));
  const questionMap = new Map((questionsResult.data ?? []).map((q) => [q.id, q.content as string]));
  const reactionMap = new Map<string, { clap: number; laugh: number; replay: number }>();
  for (const r of (reactionsResult.data ?? []) as ReactionRow[]) {
    const cur = reactionMap.get(r.voice_post_id) ?? { clap: 0, laugh: 0, replay: 0 };
    cur[r.sound_type] += 1;
    reactionMap.set(r.voice_post_id, cur);
  }

  return voicePosts.map((post) => {
    const profile = profileMap.get(post.author_id);
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
      questionContent: post.question_id ? questionMap.get(post.question_id) ?? null : null,
      voiceMode: post.voice_mode,
      durationSeconds: post.duration_seconds,
      expiresAt: post.expires_at,
      createdAt: post.created_at,
      audioUrl: admin.storage.from("voice-posts").getPublicUrl(post.storage_path).data.publicUrl,
      shareUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/share/${post.id}`,
      reactions: reactionMap.get(post.id) ?? { clap: 0, laugh: 0, replay: 0 }
    };
  });
}
