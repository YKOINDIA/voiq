import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type VoicePost = {
  id: string;
  author_id: string;
  question_id: string | null;
  storage_path: string;
  duration_seconds: number;
  voice_mode: string;
  transcript: string | null;
  share_video_path: string | null;
  expires_at: string | null;
  created_at: string;
  audio_url?: string;
};

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

  return (data ?? []).map((item) => ({
    ...(item as VoicePost),
    audio_url: admin.storage.from("voice-posts").getPublicUrl(item.storage_path).data.publicUrl
  }));
}
