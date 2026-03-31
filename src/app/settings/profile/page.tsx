import Link from "next/link";
import { redirect } from "next/navigation";
import { updateProfile } from "@/app/settings/profile/actions";
import { ensureProfileForUser } from "@/lib/profiles";
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

  const profile = await ensureProfileForUser(session.user);

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
          {profile.username ? `${process.env.NEXT_PUBLIC_SITE_URL}/ask/${profile.username}` : "ユーザー名未設定"}
        </p>

        <form className="auth-placeholder" action={updateProfile}>
          <label htmlFor="username">ユーザー名</label>
          <input id="username" name="username" defaultValue={profile.username ?? ""} />

          <label htmlFor="displayName">表示名</label>
          <input id="displayName" name="displayName" defaultValue={profile.display_name ?? ""} />

          <label htmlFor="bio">ひとこと</label>
          <textarea id="bio" name="bio" defaultValue={profile.bio ?? ""} rows={5} />

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
