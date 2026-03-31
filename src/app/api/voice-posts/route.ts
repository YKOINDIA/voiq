import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ensureProfileForUser } from "@/lib/profiles";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await ensureProfileForUser(session.user);
  const formData = await request.formData();
  const file = formData.get("audio");
  const questionId = String(formData.get("questionId") ?? "");
  const voiceMode = String(formData.get("voiceMode") ?? "original");
  const durationSeconds = Number(formData.get("durationSeconds") ?? 0);

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "音声ファイルがありません。" }, { status: 400 });
  }

  if (!questionId) {
    return NextResponse.json({ error: "質問が選択されていません。" }, { status: 400 });
  }

  const maxDurationSeconds = profile.is_premium ? 60 : 10;

  if (durationSeconds < 1 || durationSeconds > maxDurationSeconds) {
    return NextResponse.json(
      {
        error: profile.is_premium
          ? "Premium ユーザーは60秒まで録音できます。"
          : "無料ユーザーは10秒までです。"
      },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdminClient();
  const bucketLookup = await admin.storage.getBucket("voice-posts");

  if (bucketLookup.error) {
    const createBucketResult = await admin.storage.createBucket("voice-posts", {
      public: true
    });

    if (createBucketResult.error && !createBucketResult.error.message.includes("already exists")) {
      return NextResponse.json({ error: createBucketResult.error.message }, { status: 500 });
    }
  }

  const path = `${profile.id}/${randomUUID()}.webm`;
  const arrayBuffer = await file.arrayBuffer();

  const uploadResult = await admin.storage
    .from("voice-posts")
    .upload(path, arrayBuffer, { contentType: "audio/webm", upsert: false });

  if (uploadResult.error) {
    return NextResponse.json({ error: uploadResult.error.message }, { status: 500 });
  }

  const insertResult = await admin.from("voice_posts").insert({
    author_id: profile.id,
    question_id: questionId,
    storage_path: path,
    duration_seconds: durationSeconds,
    voice_mode: voiceMode,
    expires_at: profile.is_premium ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  });

  if (insertResult.error) {
    return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
  }

  const questionUpdateResult = await admin
    .from("questions")
    .update({
      answered_at: new Date().toISOString()
    })
    .eq("id", questionId)
    .eq("recipient_id", profile.id);

  if (questionUpdateResult.error) {
    return NextResponse.json({ error: questionUpdateResult.error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
