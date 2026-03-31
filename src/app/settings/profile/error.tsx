"use client";

import Link from "next/link";

export default function ProfileSettingsError({
  error,
  reset
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <span className="eyebrow">Profile Settings</span>
        <h1>プロフィール設定を開けませんでした。</h1>
        <p>{error.message || "しばらくしてからもう一度お試しください。"}</p>
        <div className="auth-links">
          <button type="button" className="primary-button" onClick={() => reset()}>
            再試行
          </button>
          <Link className="secondary-button" href="/dashboard">
            ダッシュボードへ
          </Link>
        </div>
      </section>
    </main>
  );
}
