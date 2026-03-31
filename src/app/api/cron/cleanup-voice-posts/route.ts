import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function isAuthorized(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data: expiredPosts, error: selectError } = await admin
    .from("voice_posts")
    .select("id, storage_path")
    .not("expires_at", "is", null)
    .lte("expires_at", now);

  if (selectError) {
    return NextResponse.json({ error: selectError.message }, { status: 500 });
  }

  const posts = expiredPosts ?? [];

  if (posts.length === 0) {
    return NextResponse.json({ success: true, deleted: 0 });
  }

  const storagePaths = posts.map((post) => post.storage_path).filter(Boolean);

  if (storagePaths.length > 0) {
    const removeResult = await admin.storage.from("voice-posts").remove(storagePaths);

    if (removeResult.error) {
      return NextResponse.json({ error: removeResult.error.message }, { status: 500 });
    }
  }

  const { error: deleteError } = await admin
    .from("voice_posts")
    .delete()
    .in(
      "id",
      posts.map((post) => post.id)
    );

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, deleted: posts.length });
}
