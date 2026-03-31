import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type RankingEntry = {
  authorId: string;
  username: string | null;
  displayName: string | null;
  badge: string | null;
  totalReactions: number;
  voicePosts: number;
  clap: number;
  laugh: number;
  replay: number;
};

type ReactionRow = {
  voice_post_id: string;
  sound_type: "clap" | "laugh" | "replay";
};

export async function getVoiceRankings() {
  const admin = getSupabaseAdminClient();
  const [profilesResult, voicePostsResult, reactionsResult] = await Promise.all([
    admin.from("profiles").select("id, username, display_name, badge"),
    admin.from("voice_posts").select("id, author_id"),
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

  const voicePosts = voicePostsResult.data ?? [];
  const reactionRows = (reactionsResult.data ?? []) as ReactionRow[];
  const profileMap = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
  const postToAuthorMap = new Map(voicePosts.map((post) => [post.id, post.author_id]));
  const rankingMap = new Map<string, RankingEntry>();

  voicePosts.forEach((post) => {
    const profile = profileMap.get(post.author_id);
    rankingMap.set(post.author_id, {
      authorId: post.author_id,
      username: profile?.username ?? null,
      displayName: profile?.display_name ?? null,
      badge: profile?.badge ?? null,
      totalReactions: 0,
      voicePosts: (rankingMap.get(post.author_id)?.voicePosts ?? 0) + 1,
      clap: rankingMap.get(post.author_id)?.clap ?? 0,
      laugh: rankingMap.get(post.author_id)?.laugh ?? 0,
      replay: rankingMap.get(post.author_id)?.replay ?? 0
    });
  });

  reactionRows.forEach((reaction) => {
    const authorId = postToAuthorMap.get(reaction.voice_post_id);

    if (!authorId) {
      return;
    }

    const current = rankingMap.get(authorId);
    const profile = profileMap.get(authorId);

    if (!current) {
      rankingMap.set(authorId, {
        authorId,
        username: profile?.username ?? null,
        displayName: profile?.display_name ?? null,
        badge: profile?.badge ?? null,
        totalReactions: 1,
        voicePosts: 0,
        clap: reaction.sound_type === "clap" ? 1 : 0,
        laugh: reaction.sound_type === "laugh" ? 1 : 0,
        replay: reaction.sound_type === "replay" ? 1 : 0
      });
      return;
    }

    current.totalReactions += 1;
    current[reaction.sound_type] += 1;
  });

  return Array.from(rankingMap.values())
    .sort((a, b) => {
      if (b.totalReactions !== a.totalReactions) {
        return b.totalReactions - a.totalReactions;
      }

      return b.voicePosts - a.voicePosts;
    })
    .slice(0, 20);
}
