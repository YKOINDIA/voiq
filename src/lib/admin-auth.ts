import { redirect } from "next/navigation";
import { getAdminEmails } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function requireAdminSession() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/sign-in?error=管理画面を開くにはログインが必要です");
  }

  const email = session.user.email?.toLowerCase() ?? "";
  const isAdmin = getAdminEmails().includes(email);

  if (!isAdmin) {
    redirect("/dashboard");
  }

  return session;
}
