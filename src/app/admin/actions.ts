"use server";

import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function togglePremium(formData: FormData) {
  await requireAdminSession();
  const profileId = String(formData.get("profileId") ?? "");
  const nextValue = String(formData.get("nextValue") ?? "") === "true";

  if (!profileId) {
    redirect("/admin?error=対象ユーザーが見つかりません");
  }

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ is_premium: nextValue })
    .eq("id", profileId);

  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin?success=${encodeURIComponent("プランを更新しました")}`);
}
