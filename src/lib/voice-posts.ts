import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileById } from "@/lib/profiles";

export type VoicePost = {
  id: string;
  author_id: string;
  question_id: string | null;
  storage_path: string;
  duration_seconds: number;
  voice_mode: string;
  category: string | null;
  transcript: string | null;
  share_video_path: string | null;
  expires_at: string | null;
  created_at: string;
  question_content?: string | null;
  audio_url?: string;
  reactions?: {
    clap: number;
    laugh: number;
    replay: number;
  };
  share_url?: string;
};

type ReactionRow = {
  voice_post_id: string;
  sound_type: "clap" | "laugh" | "replay";
};

async function enrichVoicePosts(posts: VoicePost[]) {
  const admin = getSupabaseAdminClient();
  const questionIds = posts.map((post) => post.question_id).filter((value): value is string => Boolean(value));

  const [questionResult, reactionResult] = await Promise.all([
    questionIds.length > 0
      ? admin.from("questions").select("id, content").in("id", questionIds)
      : Promise.resolve({ data: [], error: null }),
    posts.length > 0
      ? admin.from("reactions").select("voice_post_id, sound_type").in(
          "voice_post_id",
          posts.map((post) => post.id)
        )
      : Promise.resolve({ data: [], error: null })
  ]);

  if (questionResult.error) {
    throw new Error(questionResult.error.message);
  }

  if (reactionResult.error) {
    throw new Error(reactionResult.error.message);
  }

  const questionMap = new Map((questionResult.data ?? []).map((item) => [item.id, item.content]));
  const reactionMap = new Map<string, { clap: number; laugh: number; replay: number }>();

  (reactionResult.data as ReactionRow[]).forEach((reaction) => {
    const current = reactionMap.get(reaction.voice_post_id) ?? { clap: 0, laugh: 0, replay: 0 };
    current[reaction.sound_type] += 1;
    reactionMap.set(reaction.voice_post_id, current);
  });

  return posts.map((item) => ({
    ...item,
    question_content: item.question_id ? questionMap.get(item.question_id) ?? null : null,
    audio_url: admin.storage.from("voice-posts").getPublicUrl(item.storage_path).data.publicUrl,
    reactions: reactionMap.get(item.id) ?? { clap: 0, laugh: 0, replay: 0 },
    share_url: `${process.env.NEXT_PUBLIC_SITE_URL}/share/${item.id}`
  }));
}

export async function getVoicePostsForAuthor(authorId: string) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("voice_posts")
    .select("*")
    .eq("author_id", authorId)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(error.message);
  }

  return enrichVoicePosts((data ?? []) as VoicePost[]);
}

export async function getPublicVoicePostsForAuthor(authorId: string) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("voice_posts")
    .select("*")
    .eq("author_id", authorId)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    throw new Error(error.message);
  }

  return enrichVoicePosts((data ?? []) as VoicePost[]);
}

export async function getVoicePostById(voicePostId: string) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("voice_posts")
    .select("*")
    .eq("id", voicePostId)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const [enriched] = await enrichVoicePosts([data as VoicePost]);
  const author = await getProfileById(enriched.author_id);

  return {
    post: enriched,
    author
  };
}
