import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/profiles";

export type Question = {
  id: string;
  recipient_id: string;
  content: string;
  sender_name: string | null;
  is_anonymous: boolean;
  answered_at: string | null;
  created_at: string;
};

export async function getQuestionsForRecipient(recipientId: string) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("questions")
    .select("*")
    .eq("recipient_id", recipientId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Question[];
}

export async function getProfileByUsername(username: string) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Profile;
}
