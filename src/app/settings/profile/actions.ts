"use server";

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/sign-in?error=先にログインしてください");
  }

  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);
  const displayName = String(formData.get("displayName") ?? "").trim().slice(0, 40);
  const bio = String(formData.get("bio") ?? "").trim().slice(0, 160);
  const birthday = String(formData.get("birthday") ?? "").trim() || null;

  // 生年月日バリデーション
  if (birthday) {
    const parsed = new Date(birthday);
    if (Number.isNaN(parsed.getTime())) {
      redirect("/settings/profile?error=生年月日の形式が正しくありません");
    }
    const age = (Date.now() - parsed.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (age < 13) {
      redirect("/settings/profile?error=13歳以上である必要があります");
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      username: username || null,
      display_name: displayName || null,
      bio: bio || null,
      birthday
    })
    .eq("id", session.user.id);

  if (error) {
    redirect(`/settings/profile?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/settings/profile?success=プロフィールを更新しました");
}
