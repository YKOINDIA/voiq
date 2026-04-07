import Link from "next/link";
import { updateProfile } from "@/app/settings/profile/actions";
import { updatePassword } from "@/app/sign-in/actions";
import { getBadgesForUser } from "@/lib/badges";
import { getLevelFromPoints } from "@/lib/points";
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
  const { session, profile: resolvedProfile } = await getOrCreateProfileForCurrentUser();
  const userBadges = await getBadgesForUser(resolvedProfile.id);
  const levelInfo = getLevelFromPoints(resolvedProfile.points ?? 0);

  return (
    <main className="settings-shell">
      <div className="settings-layout">
        {/* サイドナビ */}
        <aside className="settings-nav">
          <h2>設定</h2>
          <nav>
            <a href="#profile" className="settings-nav__link settings-nav__link--active">プロフィール</a>
            <a href="#account" className="settings-nav__link">アカウント</a>
            <a href="#badges" className="settings-nav__link">称号・バッジ</a>
            <a href="#password" className="settings-nav__link">パスワード</a>
            <a href="#notifications" className="settings-nav__link">通知</a>
          </nav>
          <div className="settings-nav__footer">
            <Link href="/dashboard" className="secondary-button">マイページへ</Link>
          </div>
        </aside>

        <div className="settings-content">
          {resolvedSearchParams.success ? (
            <p className="notice notice--success">{resolvedSearchParams.success}</p>
          ) : null}
          {resolvedSearchParams.error ? (
            <p className="notice notice--error">{resolvedSearchParams.error}</p>
          ) : null}

          {/* プロフィール */}
          <section id="profile" className="settings-section">
            <h2>プロフィール</h2>
            <p>公開ページやランキングに表示される情報です。</p>
            <form className="settings-form" action={updateProfile}>
              <label htmlFor="displayName">名前</label>
              <input id="displayName" name="displayName" defaultValue={resolvedProfile.display_name ?? ""} maxLength={40} />

              <label htmlFor="username">ニックネーム（ユーザーID）</label>
              <input id="username" name="username" defaultValue={resolvedProfile.username ?? ""} maxLength={20} placeholder="英数字とアンダースコアのみ" />

              <label htmlFor="bio">自己紹介</label>
              <textarea id="bio" name="bio" defaultValue={resolvedProfile.bio ?? ""} rows={3} maxLength={160} placeholder="声の特徴や好きなジャンルなど" />

              <label htmlFor="birthday">生年月日</label>
              <input id="birthday" name="birthday" type="date" defaultValue={resolvedProfile.birthday ?? ""} />

              <button type="submit" className="primary-button">保存する</button>
            </form>
          </section>

          {/* アカウント */}
          <section id="account" className="settings-section">
            <h2>アカウント</h2>
            <div className="settings-info-grid">
              <div>
                <strong>メールアドレス</strong>
                <p>{session.user.email ?? "未設定"}</p>
              </div>
              <div>
                <strong>プラン</strong>
                <p>{resolvedProfile.is_premium ? "Premium（60秒録音・無期限保存）" : "Free（10秒録音・24h自動消去）"}</p>
              </div>
              <div>
                <strong>登録日</strong>
                <p>{new Date(resolvedProfile.created_at).toLocaleDateString("ja-JP")}</p>
              </div>
              <div>
                <strong>質問募集URL</strong>
                <p>
                  {resolvedProfile.username
                    ? `${process.env.NEXT_PUBLIC_SITE_URL}/ask/${resolvedProfile.username}`
                    : "ニックネームを設定してください"}
                </p>
              </div>
            </div>
          </section>

          {/* 称号・バッジ */}
          <section id="badges" className="settings-section">
            <h2>称号・バッジ</h2>
            <div className="settings-level-display">
              <span className="level-badge" style={{ backgroundColor: levelInfo.color }}>
                Lv.{levelInfo.level} {levelInfo.title}
              </span>
              <span className="level-points">{resolvedProfile.points ?? 0} pt</span>
            </div>
            <p className="level-description">{levelInfo.description}</p>
            {userBadges.length > 0 ? (
              <div className="badge-grid" style={{ marginTop: "12px" }}>
                {userBadges.map((b) => (
                  <span key={b.id} className="badge-chip" title={b.description}>
                    {b.icon} {b.name}
                  </span>
                ))}
              </div>
            ) : (
              <p>まだバッジを獲得していません。ボイスを投稿して集めましょう。</p>
            )}
          </section>

          {/* パスワード */}
          <section id="password" className="settings-section">
            <h2>パスワード</h2>
            <p>Magic Link で作成したアカウントでも、ここでパスワードを設定すれば通常ログインできます。</p>
            <form className="settings-form" action={updatePassword}>
              <label htmlFor="newPassword">新しいパスワード</label>
              <input id="newPassword" name="password" type="password" minLength={8} required />

              <label htmlFor="confirmPassword">確認用パスワード</label>
              <input id="confirmPassword" name="confirmPassword" type="password" minLength={8} required />

              <button type="submit" className="secondary-button">パスワードを設定する</button>
            </form>
          </section>

          {/* 通知 */}
          <section id="notifications" className="settings-section">
            <h2>通知</h2>
            <p>通知設定は今後のアップデートで対応予定です。</p>
            <div className="settings-info-grid">
              <div>
                <strong>質問が届いたとき</strong>
                <p>メール通知（Coming Soon）</p>
              </div>
              <div>
                <strong>リアクションをもらったとき</strong>
                <p>アプリ内通知（Coming Soon）</p>
              </div>
              <div>
                <strong>レベルアップしたとき</strong>
                <p>アプリ内通知（Coming Soon）</p>
              </div>
              <div>
                <strong>フォローされたとき</strong>
                <p>メール通知（Coming Soon）</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
