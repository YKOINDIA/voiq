import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type RankingEntry = {
  authorId: string;
  username: string | null;
  displayName: string | null;
  badge: string | null;
  title: string | null;
  bio: string | null;
  isPremium: boolean;
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

type ReactionRow = {
  voice_post_id: string;
  sound_type: "clap" | "laugh" | "replay";
};

type VoicePostRow = {
  id: string;
  author_id: string;
  voice_mode: string;
};

function createEmptyEntry(profile: {
  id: string;
  username: string | null;
  display_name: string | null;
  badge: string | null;
  title: string | null;
  bio: string | null;
  is_premium: boolean;
}): RankingEntry {
  return {
    authorId: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    badge: profile.badge,
    title: profile.title,
    bio: profile.bio,
    isPremium: profile.is_premium,
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
  };
}

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

export async function getVoiceRankings() {
  const admin = getSupabaseAdminClient();
  const [profilesResult, voicePostsResult, reactionsResult] = await Promise.all([
    admin.from("profiles").select("id, username, display_name, badge, title, bio, is_premium"),
    admin.from("voice_posts").select("id, author_id, voice_mode"),
    admin.from("reactions").select("voice_post_id, sound_type")
  ]);

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  if (voicePostsResult.error) {
    throw new Error(voicePostsResult.error.message);
  }

  if (reactionsResult.error) {
    throw new Error(reactionsResult.error.message);
  }

  const voicePosts = (voicePostsResult.data ?? []) as VoicePostRow[];
  const reactionRows = (reactionsResult.data ?? []) as ReactionRow[];
  const rankingMap = new Map<string, RankingEntry>();

  for (const profile of profilesResult.data ?? []) {
    rankingMap.set(profile.id, createEmptyEntry(profile));
  }

  const postToAuthorMap = new Map<string, string>();

  for (const post of voicePosts) {
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

  for (const reaction of reactionRows) {
    const authorId = postToAuthorMap.get(reaction.voice_post_id);

    if (!authorId) {
      continue;
    }

    const current = rankingMap.get(authorId);

    if (!current) {
      continue;
    }

    current.totalReactions += 1;
    current[reaction.sound_type] += 1;
  }

  const allEntries = Array.from(rankingMap.values()).filter((entry) => entry.voicePosts > 0);

  const boards: RankingBoard[] = [
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

  return boards;
}
