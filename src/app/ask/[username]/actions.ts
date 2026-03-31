"use server";

import { redirect } from "next/navigation";
import { getProfileByUsername } from "@/lib/questions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function submitQuestion(username: string, formData: FormData) {
  const profile = await getProfileByUsername(username);
  const content = String(formData.get("content") ?? "").trim().slice(0, 280);
  const senderName = String(formData.get("senderName") ?? "").trim().slice(0, 30);
  const isAnonymous = formData.get("isAnonymous") === "on";
  const supabase = await getSupabaseServerClient();

  if (!content) {
    redirect(`/ask/${username}?error=質問内容を入力してください`);
  }

  const { error } = await supabase.from("questions").insert({
    recipient_id: profile.id,
    content,
    sender_name: isAnonymous ? null : senderName || null,
    is_anonymous: isAnonymous
  });

  if (error) {
    redirect(`/ask/${username}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/ask/${username}?success=${encodeURIComponent("質問を送信しました")}`);
}
