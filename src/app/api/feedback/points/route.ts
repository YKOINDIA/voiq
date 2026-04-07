import { NextResponse } from "next/server";
import { addPoints } from "@/lib/points";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  await addPoints(session.user.id, 5).catch(() => {});

  return NextResponse.json({ ok: true });
}
