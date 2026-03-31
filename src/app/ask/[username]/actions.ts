"use server";

import { redirect } from "next/navigation";
import { getProfileByUsername } from "@/lib/questions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function submitQuestion(username: string, formData: FormData) {
  const profile = await getProfileByUsername(username);
  const content = String(formData.get("content") ?? "").trim().slice(0, 280);
  const senderName = String(formData.get("senderName") ?? "").trim().slice(0, 30);
  const isAnonymous = formData.get("isAnonymous") === "on";
  const supabase = await getSupabaseServerClient();

  if (!content) {
    redirect(`/ask/${username}?error=${encodeURIComponent("質問内容を入力してください")}`);
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

export async function toggleFollow(username: string) {
  const targetProfile = await getProfileByUsername(username);
  const supabase = await getSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    redirect(`/sign-in?error=${encodeURIComponent("フォローするにはログインが必要です")}`);
  }

  if (session.user.id === targetProfile.id) {
    redirect(`/ask/${username}?error=${encodeURIComponent("自分自身はフォローできません")}`);
  }

  const admin = getSupabaseAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("follows")
    .select("follower_id")
    .eq("follower_id", session.user.id)
    .eq("following_id", targetProfile.id)
    .maybeSingle();

  if (existingError) {
    redirect(`/ask/${username}?error=${encodeURIComponent(existingError.message)}`);
  }

  if (existing) {
    const { error } = await admin
      .from("follows")
      .delete()
      .eq("follower_id", session.user.id)
      .eq("following_id", targetProfile.id);

    if (error) {
      redirect(`/ask/${username}?error=${encodeURIComponent(error.message)}`);
    }

    redirect(`/ask/${username}?success=${encodeURIComponent("フォローを解除しました")}`);
  }

  const { error } = await admin.from("follows").insert({
    follower_id: session.user.id,
    following_id: targetProfile.id
  });

  if (error) {
    redirect(`/ask/${username}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/ask/${username}?success=${encodeURIComponent("フォローしました")}`);
}
