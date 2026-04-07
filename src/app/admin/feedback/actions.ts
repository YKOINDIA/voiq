"use server";

import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function adminReplyToThread(formData: FormData) {
  await requireAdminSession();
  const threadId = String(formData.get("threadId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!threadId) {
    redirect("/admin/feedback?error=スレッドが見つかりません");
  }

  if (!body) {
    redirect(`/admin/feedback?thread=${threadId}&error=メッセージを入力してください`);
  }

  const admin = getSupabaseAdminClient();

  // Insert the admin message
  const { error: msgError } = await admin
    .from("feedback_messages")
    .insert({ thread_id: threadId, body, is_admin: true });

  if (msgError) {
    redirect(`/admin/feedback?thread=${threadId}&error=${encodeURIComponent(msgError.message)}`);
  }

  // Update thread: last_message, unread flags
  const { error: threadError } = await admin
    .from("feedback_threads")
    .update({
      last_message: body,
      unread_user: true,
      unread_admin: false
    })
    .eq("id", threadId);

  if (threadError) {
    redirect(`/admin/feedback?thread=${threadId}&error=${encodeURIComponent(threadError.message)}`);
  }

  redirect(`/admin/feedback?thread=${threadId}&success=返信を送信しました`);
}

export async function adminUpdateThreadStatus(formData: FormData) {
  await requireAdminSession();
  const threadId = String(formData.get("threadId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!threadId) {
    redirect("/admin/feedback?error=スレッドが見つかりません");
  }

  const validStatuses = ["未対応", "対応中", "解決済み"];
  if (!validStatuses.includes(status)) {
    redirect(`/admin/feedback?thread=${threadId}&error=無効なステータスです`);
  }

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("feedback_threads")
    .update({ status })
    .eq("id", threadId);

  if (error) {
    redirect(`/admin/feedback?thread=${threadId}&error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/feedback?thread=${threadId}&success=ステータスを更新しました`);
}

export async function adminMarkThreadRead(formData: FormData) {
  await requireAdminSession();
  const threadId = String(formData.get("threadId") ?? "").trim();

  if (!threadId) {
    redirect("/admin/feedback?error=スレッドが見つかりません");
  }

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("feedback_threads")
    .update({ unread_admin: false })
    .eq("id", threadId);

  if (error) {
    redirect(`/admin/feedback?thread=${threadId}&error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/feedback?thread=${threadId}`);
}
