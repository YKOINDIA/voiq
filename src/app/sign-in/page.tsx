import Link from "next/link";
import { redirect } from "next/navigation";
import { signInWithMagicLink } from "@/app/sign-in/actions";
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
      <section className="auth-card">
        <span className="eyebrow">Email Sign In</span>
        <h1>メールでログインして、声のプロフィールを育てる。</h1>
        <p>
          質問投稿はログイン不要のまま、回答者だけメールログインにする想定です。
          まずは Supabase Auth の Magic Link でログインできる状態までつなぎ込みました。
        </p>

        <form className="auth-placeholder" action={signInWithMagicLink}>
          <label htmlFor="email">メールアドレス</label>
          <input id="email" name="email" type="email" placeholder="you@example.com" required />
          <button type="submit" className="primary-button">
            Magic Link を送る
          </button>
        </form>

        {success ? <p className="notice notice--success">{success}</p> : null}
        {error ? <p className="notice notice--error">{error}</p> : null}

        <div className="auth-links">
          <Link className="secondary-button" href="/">
            トップへ戻る
          </Link>
          <Link className="secondary-button" href="/dashboard">
            ダッシュボードへ
          </Link>
        </div>
      </section>
    </main>
  );
}
