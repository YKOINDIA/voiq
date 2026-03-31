"use server";

import { redirect } from "next/navigation";
import { getPublicEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function signInWithMagicLink(formData: FormData) {
  const emailValue = formData.get("email");

  if (typeof emailValue !== "string" || emailValue.trim().length === 0) {
    redirect("/sign-in?error=メールアドレスを入力してください");
  }

  const supabase = await getSupabaseServerClient();
  const env = getPublicEnv();
  const email = emailValue.trim();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${env.siteUrl}/auth/callback`
    }
  });

  if (error) {
    redirect(`/sign-in?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/sign-in?success=${encodeURIComponent("Magic Link を送信しました。メールを確認してください。")}`);
}
