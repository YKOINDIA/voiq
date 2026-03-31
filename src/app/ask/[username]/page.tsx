import { notFound } from "next/navigation";
import { submitQuestion } from "@/app/ask/[username]/actions";
import { getProfileByUsername } from "@/lib/questions";

type AskPageProps = {
  params: Promise<{
    username: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function AskPage({ params, searchParams }: AskPageProps) {
  const [{ username }, resolvedSearchParams] = await Promise.all([
    params,
    (searchParams as Promise<{ error?: string; success?: string }> | undefined) ??
      Promise.resolve<{ error?: string; success?: string }>({})
  ]);

  let profile;

  try {
    profile = await getProfileByUsername(username);
  } catch {
    notFound();
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <span className="eyebrow">Ask Anonymous</span>
        <h1>{profile.display_name ?? `@${profile.username}`} に質問を送る。</h1>
        <p>
          質問投稿はログイン不要です。短く投げてもよし、匿名のまま送ってもよし。回答は Voiq 上で音声として返されます。
        </p>

        <form className="auth-placeholder" action={submitQuestion.bind(null, username)}>
          <label htmlFor="content">質問内容</label>
          <textarea id="content" name="content" rows={6} maxLength={280} required />

          <label htmlFor="senderName">差出人名</label>
          <input id="senderName" name="senderName" placeholder="匿名のままでもOK" />

          <label className="checkbox-row" htmlFor="isAnonymous">
            <input id="isAnonymous" name="isAnonymous" type="checkbox" defaultChecked />
            匿名で送る
          </label>

          <button type="submit" className="primary-button">
            質問を送信する
          </button>
        </form>

        {resolvedSearchParams.success ? (
          <p className="notice notice--success">{resolvedSearchParams.success}</p>
        ) : null}
        {resolvedSearchParams.error ? (
          <p className="notice notice--error">{resolvedSearchParams.error}</p>
        ) : null}
      </section>
    </main>
  );
}
