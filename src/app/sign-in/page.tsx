import Link from "next/link";
import { redirect } from "next/navigation";
import { signInWithPassword, signUpWithPassword } from "@/app/sign-in/actions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type SignInPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const resolvedSearchParams: { error?: string; success?: string } =
    (await searchParams) ?? {};
  const [{ error, success }, supabase] = await Promise.all([
    Promise.resolve(resolvedSearchParams),
    getSupabaseServerClient()
  ]);

  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="auth-shell">
      <section className="auth-card auth-card--wide">
        <span className="eyebrow">Email Auth</span>
        <h1>メール + パスワードでログインする。</h1>
        <p>
          毎回 Magic Link を開かなくても使えるように、通常のメール + パスワード方式に切り替えました。
          新規登録もこの画面からできます。
        </p>

        <div className="auth-dual-grid">
          <form className="auth-placeholder" action={signInWithPassword}>
            <h2>ログイン</h2>
            <label htmlFor="sign-in-email">メールアドレス</label>
            <input id="sign-in-email" name="email" type="email" placeholder="you@example.com" required />

            <label htmlFor="sign-in-password">パスワード</label>
            <input id="sign-in-password" name="password" type="password" required />

            <button type="submit" className="primary-button">
              ログイン
            </button>
          </form>

          <form className="auth-placeholder" action={signUpWithPassword}>
            <h2>新規登録</h2>
            <label htmlFor="sign-up-email">メールアドレス</label>
            <input id="sign-up-email" name="email" type="email" placeholder="you@example.com" required />

            <label htmlFor="sign-up-password">パスワード</label>
            <input id="sign-up-password" name="password" type="password" minLength={8} required />

            <label htmlFor="sign-up-confirm-password">確認用パスワード</label>
            <input
              id="sign-up-confirm-password"
              name="confirmPassword"
              type="password"
              minLength={8}
              required
            />

            <button type="submit" className="secondary-button">
              アカウント作成
            </button>
          </form>
        </div>

        {success ? <p className="notice notice--success">{success}</p> : null}
        {error ? <p className="notice notice--error">{error}</p> : null}

        <div className="auth-links">
          <Link className="secondary-button" href="/">
            トップへ戻る
          </Link>
        </div>
      </section>
    </main>
  );
}
