import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <span className="eyebrow">Auth Error</span>
        <h1>ログインを完了できませんでした。</h1>
        <p>
          Magic Link の期限切れや、メール内リンクの再利用が原因のことがあります。
          もう一度ログイン画面から試してください。
        </p>
        <div className="auth-links">
          <Link className="primary-button" href="/sign-in">
            ログイン画面へ
          </Link>
          <Link className="secondary-button" href="/">
            トップへ戻る
          </Link>
        </div>
      </section>
    </main>
  );
}
