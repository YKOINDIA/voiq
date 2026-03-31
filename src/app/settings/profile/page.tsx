import Link from "next/link";
import { updateProfile } from "@/app/settings/profile/actions";
import { updatePassword } from "@/app/sign-in/actions";
import { getOrCreateProfileForCurrentUser } from "@/lib/profiles-server";

type ProfileSettingsPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function ProfileSettingsPage({ searchParams }: ProfileSettingsPageProps) {
  const resolvedSearchParams: { error?: string; success?: string } =
    (await searchParams) ?? {};
  const { profile: resolvedProfile } = await getOrCreateProfileForCurrentUser();

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

        <div className="settings-divider" />

        <div className="password-panel">
          <h2>プラン状態</h2>
          <p>
            現在のプラン: <strong>{resolvedProfile.is_premium ? "Premium" : "Free"}</strong>
          </p>
          <p>
            {resolvedProfile.is_premium
              ? "60秒録音と無期限保存が有効です。"
              : "無料プランでは 10 秒録音、24時間で自動削除です。"}
          </p>
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
