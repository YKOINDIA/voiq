import Link from "next/link";
import { redirect } from "next/navigation";
import { updateProfile } from "@/app/settings/profile/actions";
import { updatePassword } from "@/app/sign-in/actions";
import { buildProfileSeed, type Profile } from "@/lib/profiles";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type ProfileSettingsPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function ProfileSettingsPage({ searchParams }: ProfileSettingsPageProps) {
  const resolvedSearchParams: { error?: string; success?: string } =
    (await searchParams) ?? {};
  const supabase = await getSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/sign-in?error=先にログインしてください");
  }

  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();

  if (!profile) {
    const seed = buildProfileSeed(session.user);
    const insertResult = await supabase.from("profiles").insert(seed);

    if (insertResult.error) {
      throw new Error(insertResult.error.message);
    }

    const reloadResult = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (reloadResult.error) {
      throw new Error(reloadResult.error.message);
    }

    profile = reloadResult.data;
  }

  const resolvedProfile = profile as Profile;

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <span className="eyebrow">Profile Settings</span>
        <h1>声のプロフィールを整える。</h1>
        <p>
          ユーザー名、表示名、自己紹介を登録しておくと、質問の受け皿とランキング上の見え方を整えやすくなります。
        </p>
        <p className="notice">
          現在の質問募集URL:{" "}
          {resolvedProfile.username
            ? `${process.env.NEXT_PUBLIC_SITE_URL}/ask/${resolvedProfile.username}`
            : "ユーザー名未設定"}
        </p>

        <form className="auth-placeholder" action={updateProfile}>
          <label htmlFor="username">ユーザー名</label>
          <input id="username" name="username" defaultValue={resolvedProfile.username ?? ""} />

          <label htmlFor="displayName">表示名</label>
          <input id="displayName" name="displayName" defaultValue={resolvedProfile.display_name ?? ""} />

          <label htmlFor="bio">ひとこと</label>
          <textarea id="bio" name="bio" defaultValue={resolvedProfile.bio ?? ""} rows={5} />

          <button type="submit" className="primary-button">
            保存する
          </button>
        </form>

        {resolvedSearchParams.success ? (
          <p className="notice notice--success">{resolvedSearchParams.success}</p>
        ) : null}
        {resolvedSearchParams.error ? (
          <p className="notice notice--error">{resolvedSearchParams.error}</p>
        ) : null}

        <div className="settings-divider" />

        <div className="password-panel">
          <h2>パスワード設定</h2>
          <p>
            以前に Magic Link で作成したアカウントでも、ここでパスワードを設定すれば次回から通常ログインできます。
          </p>
          <form className="auth-placeholder" action={updatePassword}>
            <label htmlFor="newPassword">新しいパスワード</label>
            <input id="newPassword" name="password" type="password" minLength={8} required />

            <label htmlFor="confirmPassword">確認用パスワード</label>
            <input id="confirmPassword" name="confirmPassword" type="password" minLength={8} required />

            <button type="submit" className="secondary-button">
              パスワードを設定する
            </button>
          </form>
        </div>

        <div className="auth-links">
          <Link className="secondary-button" href="/dashboard">
            ダッシュボードへ
          </Link>
          <Link className="secondary-button" href="/">
            トップへ戻る
          </Link>
        </div>
      </section>
    </main>
  );
}
