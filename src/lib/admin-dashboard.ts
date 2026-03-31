import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildCreatorIdentity } from "@/lib/profile-insights";
import { getFollowStats } from "@/lib/follows";
import { getVoicePostsForAuthor } from "@/lib/voice-posts";
import type { Profile } from "@/lib/profiles";

type PlatformCounts = {
  profiles: number;
  questions: number;
  voicePosts: number;
  reactions: number;
  follows: number;
};

export type AdminCreatorRow = {
  profile: Profile;
  posts: number;
  reactions: number;
  followers: number;
  badge: string;
  title: string;
};

export type AdminQuestionRow = {
  id: string;
  content: string;
  sender_name: string | null;
  is_anonymous: boolean;
  answered_at: string | null;
  created_at: string;
  recipient: {
    username: string | null;
    display_name: string | null;
  } | null;
};

export type AdminVoicePostRow = {
  id: string;
  created_at: string;
  duration_seconds: number;
  voice_mode: string;
  expires_at: string | null;
  author: {
    username: string | null;
    display_name: string | null;
  } | null;
};

export async function getPlatformCounts(): Promise<PlatformCounts> {
  const admin = getSupabaseAdminClient();
  const [
    profilesResult,
    questionsResult,
    voicePostsResult,
    reactionsResult,
    followsResult
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("questions").select("*", { count: "exact", head: true }),
    admin.from("voice_posts").select("*", { count: "exact", head: true }),
    admin.from("reactions").select("*", { count: "exact", head: true }),
    admin.from("follows").select("*", { count: "exact", head: true })
  ]);

  for (const result of [
    profilesResult,
    questionsResult,
    voicePostsResult,
    reactionsResult,
    followsResult
  ]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  return {
    profiles: profilesResult.count ?? 0,
    questions: questionsResult.count ?? 0,
    voicePosts: voicePostsResult.count ?? 0,
    reactions: reactionsResult.count ?? 0,
    follows: followsResult.count ?? 0
  };
}

export async function getAdminCreators(limit = 16): Promise<AdminCreatorRow[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const profiles = (data ?? []) as Profile[];
  const creators = await Promise.all(
    profiles.map(async (profile) => {
      const [voicePosts, followStats] = await Promise.all([
        getVoicePostsForAuthor(profile.id),
        getFollowStats(profile.id)
      ]);
      const identity = buildCreatorIdentity(profile, voicePosts);

      return {
        profile,
        posts: identity.totalPosts,
        reactions: identity.totalReactions,
        followers: followStats.followers,
        badge: identity.badge,
        title: identity.title
      };
    })
  );

  return creators.sort((a, b) => {
    if (b.reactions !== a.reactions) {
      return b.reactions - a.reactions;
    }
    return b.posts - a.posts;
  });
}

export async function getRecentQuestions(limit = 12): Promise<AdminQuestionRow[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("questions")
    .select("id, content, sender_name, is_anonymous, answered_at, created_at, recipient:profiles(username, display_name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    content: item.content,
    sender_name: item.sender_name,
    is_anonymous: item.is_anonymous,
    answered_at: item.answered_at,
    created_at: item.created_at,
    recipient: Array.isArray(item.recipient) ? item.recipient[0] ?? null : item.recipient ?? null
  })) as AdminQuestionRow[];
}

export async function getRecentVoicePosts(limit = 12): Promise<AdminVoicePostRow[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("voice_posts")
    .select("id, created_at, duration_seconds, voice_mode, expires_at, author:profiles(username, display_name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    created_at: item.created_at,
    duration_seconds: item.duration_seconds,
    voice_mode: item.voice_mode,
    expires_at: item.expires_at,
    author: Array.isArray(item.author) ? item.author[0] ?? null : item.author ?? null
  })) as AdminVoicePostRow[];
}
