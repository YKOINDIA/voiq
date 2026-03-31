import Link from "next/link";

export default function AskNotFoundPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <span className="eyebrow">Not Found</span>
        <h1>その質問ページは見つかりませんでした。</h1>
        <p>ユーザー名がまだ設定されていないか、存在しないプロフィールです。</p>
        <div className="auth-links">
          <Link className="secondary-button" href="/">
            トップへ戻る
          </Link>
        </div>
      </section>
    </main>
  );
}
