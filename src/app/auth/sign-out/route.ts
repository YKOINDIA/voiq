import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();

  const url = new URL("/sign-in?success=%E3%83%AD%E3%82%B0%E3%82%A2%E3%82%A6%E3%83%88%E3%81%97%E3%81%BE%E3%81%97%E3%81%9F", request.url);
  return NextResponse.redirect(url);
}
