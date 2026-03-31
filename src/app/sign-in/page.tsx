import Link from "next/link";

export default function SignInPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <span className="eyebrow">Email Sign In</span>
        <h1>メールでログインして、声のプロフィールを育てる。</h1>
        <p>
          質問投稿はログイン不要のまま、回答者だけメールログインにする想定です。
          本実装では Supabase Auth の Magic Link か OTP をつなぎ込む予定です。
        </p>

        <div className="auth-placeholder">
          <label htmlFor="email">メールアドレス</label>
          <input id="email" type="email" placeholder="you@example.com" disabled />
          <button type="button" className="primary-button" disabled>
            Magic Link を送る
          </button>
        </div>

        <div className="auth-links">
          <Link className="secondary-button" href="/">
            トップへ戻る
          </Link>
          <Link className="secondary-button" href="/dashboard">
            ダッシュボード案を見る
          </Link>
        </div>
      </section>
    </main>
  );
}
