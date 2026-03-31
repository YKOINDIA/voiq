"use server";

import { redirect } from "next/navigation";
import { getPublicEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function signInWithPassword(formData: FormData) {
  const email = getString(formData, "email");
  const password = getString(formData, "password");

  if (!email || !password) {
    redirect("/sign-in?error=メールアドレスとパスワードを入力してください");
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    redirect(`/sign-in?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function signUpWithPassword(formData: FormData) {
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const confirmPassword = getString(formData, "confirmPassword");
  const env = getPublicEnv();

  if (!email || !password) {
    redirect("/sign-in?error=メールアドレスとパスワードを入力してください");
  }

  if (password.length < 8) {
    redirect("/sign-in?error=パスワードは8文字以上にしてください");
  }

  if (password !== confirmPassword) {
    redirect("/sign-in?error=確認用パスワードが一致しません");
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${env.siteUrl}/auth/callback`
    }
  });

  if (error) {
    redirect(`/sign-in?error=${encodeURIComponent(error.message)}`);
  }

  if (data.session) {
    redirect("/dashboard");
  }

  redirect(
    `/sign-in?success=${encodeURIComponent(
      "アカウントを作成しました。メール認証が必要な場合は受信トレイを確認してください。"
    )}`
  );
}

export async function updatePassword(formData: FormData) {
  const password = getString(formData, "password");
  const confirmPassword = getString(formData, "confirmPassword");

  if (!password) {
    redirect("/settings/profile?error=新しいパスワードを入力してください");
  }

  if (password.length < 8) {
    redirect("/settings/profile?error=パスワードは8文字以上にしてください");
  }

  if (password !== confirmPassword) {
    redirect("/settings/profile?error=確認用パスワードが一致しません");
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    password
  });

  if (error) {
    redirect(`/settings/profile?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/settings/profile?success=パスワードを更新しました");
}

export async function signOut() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/sign-in?success=ログアウトしました");
}
