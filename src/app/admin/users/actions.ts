"use server";

import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function adjustPoints(formData: FormData) {
  await requireAdminSession();
  const profileId = String(formData.get("profileId") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);

  if (!profileId) {
    redirect("/admin/users?error=対象ユ��ザーが見つかりま���ん");
  }

  if (!Number.isInteger(amount) || amount === 0 || amount < -9999 || amount > 9999) {
    redirect("/admin/users?error=ポイントは -9999〜9999 の整数で入力してください");
  }

  const admin = getSupabaseAdminClient();

  if (amount > 0) {
    const { error } = await admin.rpc("increment_points", { uid: profileId, pts: amount });
    if (error) {
      redirect(`/admin/users?error=${encodeURIComponent(error.message)}`);
    }
  } else {
    // 減算: 0未満になら��いようにする
    const { data: profile } = await admin
      .from("profiles")
      .select("points")
      .eq("id", profileId)
      .single();
    const currentPoints = profile?.points ?? 0;
    const safeAmount = Math.max(amount, -currentPoints);
    if (safeAmount !== 0) {
      const { error } = await admin.rpc("increment_points", { uid: profileId, pts: safeAmount });
      if (error) {
        redirect(`/admin/users?error=${encodeURIComponent(error.message)}`);
      }
    }
  }

  redirect(
    `/admin/users?success=${encodeURIComponent(`${amount > 0 ? "+" : ""}${amount}pt を適用しました`)}`
  );
}

export async function adminTogglePremium(formData: FormData) {
  await requireAdminSession();
  const profileId = String(formData.get("profileId") ?? "").trim();
  const nextValue = String(formData.get("nextValue") ?? "") === "true";

  if (!profileId) {
    redirect("/admin/users?error=対象ユーザーが��つかりません");
  }

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ is_premium: nextValue })
    .eq("id", profileId);

  if (error) {
    redirect(`/admin/users?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/users?success=${encodeURIComponent("プランを更新しました")}`);
}

export async function adminAwardBadge(formData: FormData) {
  await requireAdminSession();
  const profileId = String(formData.get("profileId") ?? "").trim();
  const badgeId = String(formData.get("badgeId") ?? "").trim();

  if (!profileId || !badgeId) {
    redirect("/admin/users?error=ユーザーまたはバッジが指定されて���ません");
  }

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("user_badges")
    .upsert({ user_id: profileId, badge_id: badgeId }, { onConflict: "user_id,badge_id" });

  if (error) {
    redirect(`/admin/users?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/users?success=${encodeURIComponent("バッジを付与しました")}`);
}

export async function adminRevokeBadge(formData: FormData) {
  await requireAdminSession();
  const profileId = String(formData.get("profileId") ?? "").trim();
  const badgeId = String(formData.get("badgeId") ?? "").trim();

  if (!profileId || !badgeId) {
    redirect("/admin/users?error=ユーザーまたはバッジが指定されていませ���");
  }

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("user_badges")
    .delete()
    .eq("user_id", profileId)
    .eq("badge_id", badgeId);

  if (error) {
    redirect(`/admin/users?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/users?success=${encodeURIComponent("��ッジを取り消しました")}`);
}
