import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { checkAndAwardBadges } from "@/lib/badges";
import { addPoints } from "@/lib/points";
import { ensureProfileForUser } from "@/lib/profiles";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isVoiceCategory } from "@/lib/voice-categories";
import { isVoiceModeAllowed } from "@/lib/voice-modes";

let bucketEnsured = false;

function getFileExtension(file: File) {
  if (file.type === "audio/wav") {
    return "wav";
  }

  if (file.type === "audio/mpeg") {
    return "mp3";
  }

  if (file.type === "audio/mp4") {
    return "m4a";
  }

  return "webm";
}

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
  const questionId = String(formData.get("questionId") ?? "").trim();
  const voiceMode = String(formData.get("voiceMode") ?? "original");
  const categoryRaw = String(formData.get("category") ?? "").trim();
  const durationSeconds = Number(formData.get("durationSeconds") ?? 0);

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "音声ファイルがありません。" }, { status: 400 });
  }

  if (!file.type.startsWith("audio/")) {
    return NextResponse.json({ error: "音声ファイルのみ投稿できます。" }, { status: 400 });
  }

  if (!isVoiceModeAllowed(voiceMode, profile.is_premium)) {
    return NextResponse.json({ error: "このボイスモードは利用できません。" }, { status: 400 });
  }

  let category: string | null = null;
  if (categoryRaw.length > 0) {
    if (!isVoiceCategory(categoryRaw)) {
      return NextResponse.json({ error: "カテゴリが不正です。" }, { status: 400 });
    }
    category = categoryRaw;
  }

  // 単独投稿（カテゴリ）か質問返信のどちらかが必要
  if (!questionId && !category) {
    return NextResponse.json(
      { error: "質問の選択またはカテゴリの選択が必要です。" },
      { status: 400 }
    );
  }

  const maxDurationSeconds = profile.is_premium ? 60 : 10;

  if (durationSeconds < 1 || durationSeconds > maxDurationSeconds) {
    return NextResponse.json(
      {
        error: profile.is_premium
          ? "Premium ユーザーは60秒まで録音できます。"
          : "Free ユーザーは10秒まで録音できます。"
      },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdminClient();

  if (!bucketEnsured) {
    const bucketLookup = await admin.storage.getBucket("voice-posts");

    if (bucketLookup.error) {
      const createBucketResult = await admin.storage.createBucket("voice-posts", {
        public: true
      });

      if (createBucketResult.error && !createBucketResult.error.message.includes("already exists")) {
        return NextResponse.json({ error: createBucketResult.error.message }, { status: 500 });
      }
    }

    bucketEnsured = true;
  }

  const path = `${profile.id}/${randomUUID()}.${getFileExtension(file)}`;
  const arrayBuffer = await file.arrayBuffer();

  const uploadResult = await admin.storage
    .from("voice-posts")
    .upload(path, arrayBuffer, { contentType: file.type, upsert: false });

  if (uploadResult.error) {
    return NextResponse.json({ error: uploadResult.error.message }, { status: 500 });
  }

  const insertResult = await admin.from("voice_posts").insert({
    author_id: profile.id,
    question_id: questionId || null,
    storage_path: path,
    duration_seconds: durationSeconds,
    voice_mode: voiceMode,
    category,
    expires_at: profile.is_premium ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  });

  if (insertResult.error) {
    return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
  }

  if (questionId) {
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
  }

  // ポイント付与 & バッジチェック（投稿成功後、非ブロッキング）
  addPoints(profile.id, 5).catch(() => {});
  checkAndAwardBadges(profile.id, "voice_post").catch(() => {});
  checkAndAwardBadges(profile.id, "streak").catch(() => {});

  return NextResponse.json({ success: true });
}
