import { getLevelFromPoints } from "@/lib/points";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type RankingEntry = {
  authorId: string;
  username: string | null;
  displayName: string | null;
  badge: string | null;
  title: string | null;
  bio: string | null;
  isPremium: boolean;
  level: number;
  levelTitle: string;
  levelColor: string;
  totalReactions: number;
  voicePosts: number;
  clap: number;
  laugh: number;
  replay: number;
  originalPosts: number;
  highPosts: number;
  lowPosts: number;
  robotPosts: number;
  telephonePosts: number;
};

export type RankingBoard = {
  id: string;
  title: string;
  description: string;
  entries: RankingEntry[];
};

/** Maximum number of candidate authors to aggregate before scoring. */
const TOP_AUTHORS_LIMIT = 50;

function getBoardScore(boardId: string, entry: RankingEntry) {
  switch (boardId) {
    case "best-voice":
      return entry.clap * 3 + entry.replay * 1.6 + entry.lowPosts * 1.4 + entry.totalReactions;
    case "distinctive-voice":
      return entry.laugh * 2.4 + entry.replay * 1.9 + entry.robotPosts * 2 + entry.telephonePosts * 1.7;
    case "mimic-voice":
      return entry.robotPosts * 3 + entry.telephonePosts * 2.4 + entry.highPosts * 1.6 + entry.replay * 1.8;
    case "animal-voice":
      return entry.highPosts * 2.6 + entry.laugh * 2.1 + entry.replay * 1.2;
    case "sexy-voice":
      return entry.lowPosts * 2.8 + entry.clap * 2.2 + (entry.isPremium ? 6 : 0) - entry.laugh * 0.35;
    default:
      return entry.totalReactions * 2 + entry.voicePosts;
  }
}

function sortForBoard(boardId: string, entries: RankingEntry[]) {
  return [...entries]
    .sort((left, right) => {
      const scoreDiff = getBoardScore(boardId, right) - getBoardScore(boardId, left);

      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      if (right.totalReactions !== left.totalReactions) {
        return right.totalReactions - left.totalReactions;
      }

      return right.voicePosts - left.voicePosts;
    })
    .filter((entry) => entry.voicePosts > 0)
    .slice(0, 10);
}

/**
 * Fetch voice rankings using efficient, bounded queries.
 *
 * Strategy:
 * 1. Fetch voice posts joined with their reaction counts, limited to authors
 *    with the most posts (top N by post count as a proxy for ranking relevance).
 * 2. For those posts, fetch aggregated reaction breakdowns per author.
 * 3. Fetch only the profiles needed for those top authors.
 *
 * This avoids loading entire tables into memory.
 */
export async function getVoiceRankings() {
  const admin = getSupabaseAdminClient();

  // Step 1: Get voice posts for authors who have at least one post.
  // We fetch author_id and voice_mode, selecting only posts from the most
  // active authors. Supabase PostgREST doesn't support GROUP BY directly,
  // so we fetch posts scoped to top authors by using a subquery approach:
  // first find the top author IDs, then fetch their posts and reactions.

  // 1a: Find the top N authors by total reaction count received on their posts.
  // We use a joined query: voice_posts with a count of reactions.
  const topAuthorsResult = await admin
    .from("voice_posts")
    .select("author_id, reactions(count)")
    .limit(1000);

  if (topAuthorsResult.error) {
    throw new Error(topAuthorsResult.error.message);
  }

  // Aggregate post counts and reaction counts per author in JS (on a bounded set).
  const authorStats = new Map<string, { postCount: number; reactionCount: number }>();

  for (const row of topAuthorsResult.data ?? []) {
    const authorId = row.author_id as string;
    const reactionCount = (row.reactions as unknown as { count: number }[])?.[0]?.count ?? 0;
    const existing = authorStats.get(authorId);

    if (existing) {
      existing.postCount += 1;
      existing.reactionCount += reactionCount;
    } else {
      authorStats.set(authorId, { postCount: 1, reactionCount });
    }
  }

  // Rank authors by a rough proxy score (reactions * 2 + posts) and take top N.
  const rankedAuthorIds = Array.from(authorStats.entries())
    .sort(([, a], [, b]) => (b.reactionCount * 2 + b.postCount) - (a.reactionCount * 2 + a.postCount))
    .slice(0, TOP_AUTHORS_LIMIT)
    .map(([id]) => id);

  if (rankedAuthorIds.length === 0) {
    return buildBoards([]);
  }

  // Step 2: Fetch detailed data only for top authors — posts and reactions in parallel.
  const [postsResult, reactionsResult, profilesResult] = await Promise.all([
    admin
      .from("voice_posts")
      .select("id, author_id, voice_mode")
      .in("author_id", rankedAuthorIds),
    admin
      .from("reactions")
      .select("voice_post_id, sound_type, voice_posts!inner(author_id)")
      .in("voice_posts.author_id", rankedAuthorIds),
    admin
      .from("profiles")
      .select("id, username, display_name, badge, title, bio, is_premium, points")
      .in("id", rankedAuthorIds)
  ]);

  if (postsResult.error) {
    throw new Error(postsResult.error.message);
  }

  if (reactionsResult.error) {
    throw new Error(reactionsResult.error.message);
  }

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  // Step 3: Build ranking entries from the bounded result sets.
  const rankingMap = new Map<string, RankingEntry>();

  for (const profile of profilesResult.data ?? []) {
    const levelInfo = getLevelFromPoints(profile.points ?? 0);
    rankingMap.set(profile.id, {
      authorId: profile.id,
      username: profile.username,
      displayName: profile.display_name,
      badge: profile.badge,
      title: profile.title,
      bio: profile.bio,
      isPremium: profile.is_premium,
      level: levelInfo.level,
      levelTitle: levelInfo.title,
      levelColor: levelInfo.color,
      totalReactions: 0,
      voicePosts: 0,
      clap: 0,
      laugh: 0,
      replay: 0,
      originalPosts: 0,
      highPosts: 0,
      lowPosts: 0,
      robotPosts: 0,
      telephonePosts: 0
    });
  }

  const postToAuthorMap = new Map<string, string>();

  for (const post of postsResult.data ?? []) {
    postToAuthorMap.set(post.id, post.author_id);
    const current = rankingMap.get(post.author_id);

    if (!current) {
      continue;
    }

    current.voicePosts += 1;

    switch (post.voice_mode) {
      case "high":
        current.highPosts += 1;
        break;
      case "low":
        current.lowPosts += 1;
        break;
      case "robot":
        current.robotPosts += 1;
        break;
      case "telephone":
        current.telephonePosts += 1;
        break;
      default:
        current.originalPosts += 1;
        break;
    }
  }

  for (const reaction of reactionsResult.data ?? []) {
    const nested = reaction.voice_posts as unknown as { author_id: string } | null;
    const authorId = nested?.author_id ?? postToAuthorMap.get(reaction.voice_post_id);

    if (!authorId) {
      continue;
    }

    const current = rankingMap.get(authorId);

    if (!current) {
      continue;
    }

    current.totalReactions += 1;
    const soundType = reaction.sound_type as "clap" | "laugh" | "replay";
    current[soundType] += 1;
  }

  const allEntries = Array.from(rankingMap.values()).filter((entry) => entry.voicePosts > 0);

  return buildBoards(allEntries);
}

function buildBoards(allEntries: RankingEntry[]): RankingBoard[] {
  return [
    {
      id: "overall",
      title: "総合ランキング",
      description: "拍手・笑い声・もう一回の合計で並ぶ、いま一番反応されている声。",
      entries: sortForBoard("overall", allEntries)
    },
    {
      id: "best-voice",
      title: "良い声ランキング",
      description: "拍手が集まりやすく、何度も聞き返されている声を上位表示。",
      entries: sortForBoard("best-voice", allEntries)
    },
    {
      id: "distinctive-voice",
      title: "特徴ある声ランキング",
      description: "笑い声やリプレイが多く、印象に残る個性派ボイスのランキング。",
      entries: sortForBoard("distinctive-voice", allEntries)
    },
    {
      id: "mimic-voice",
      title: "声モノマネランキング",
      description: "ロボット声や通話風など、変化の大きい声遊びが強い人のランキング。",
      entries: sortForBoard("mimic-voice", allEntries)
    },
    {
      id: "animal-voice",
      title: "動物の鳴き声ランキング",
      description: "高めボイスと笑い声を軸に、鳴き声ネタっぽい盛り上がりを拾うランキング。",
      entries: sortForBoard("animal-voice", allEntries)
    },
    {
      id: "sexy-voice",
      title: "セクシーボイスランキング",
      description: "低めボイスと拍手を中心に、色気のある声として反応された人のランキング。",
      entries: sortForBoard("sexy-voice", allEntries)
    }
  ];
}
