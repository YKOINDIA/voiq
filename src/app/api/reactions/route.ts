import { NextResponse } from "next/server";
import { checkAndAwardBadges } from "@/lib/badges";
import { addPoints } from "@/lib/points";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const ALLOWED_REACTIONS = new Set(["clap", "laugh", "replay"]);

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  const body = (await request.json()) as {
    voicePostId?: string;
    soundType?: string;
  };

  if (!body.voicePostId || !body.soundType) {
    return NextResponse.json({ error: "リアクション情報が不足しています。" }, { status: 400 });
  }

  if (!ALLOWED_REACTIONS.has(body.soundType)) {
    return NextResponse.json({ error: "不正なリアクションです。" }, { status: 400 });
  }

  const { error } = await supabase.from("reactions").insert({
    voice_post_id: body.voicePostId,
    sound_type: body.soundType
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 投稿者にリアクションポイント +1 & バッジチェック
  const admin = getSupabaseAdminClient();
  (async () => {
    const { data: post } = await admin
      .from("voice_posts")
      .select("author_id")
      .eq("id", body.voicePostId)
      .single();
    if (post?.author_id) {
      await addPoints(post.author_id, 1).catch(() => {});
      await checkAndAwardBadges(post.author_id, "reaction").catch(() => {});
    }
  })().catch(() => {});

  return NextResponse.json({ success: true });
}
