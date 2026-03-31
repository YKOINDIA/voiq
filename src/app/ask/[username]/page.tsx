import { notFound } from "next/navigation";
import { ReactionBar } from "@/components/reaction-bar";
import { submitQuestion } from "@/app/ask/[username]/actions";
import { getProfileByUsername } from "@/lib/questions";
import { getPublicVoicePostsForAuthor } from "@/lib/voice-posts";

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

  try {
    const profile = await getProfileByUsername(username);
    const voicePosts = await getPublicVoicePostsForAuthor(profile.id);

    return (
      <main className="auth-shell">
        <section className="auth-card auth-card--wide">
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

          <div className="settings-divider" />

          <section className="question-section">
            <article className="profile-card">
              <span className="section-label">Recent Answers</span>
              <h2>最近の音声回答</h2>
              {voicePosts.length === 0 ? (
                <p>まだ音声回答はありません。最初の質問を送ってみましょう。</p>
              ) : (
                <div className="question-list">
                  {voicePosts.map((post) => (
                    <article key={post.id} className="question-item">
                      {post.question_content ? <p>Q. {post.question_content}</p> : null}
                      <div className="question-meta">
                        <span>{post.voice_mode}</span>
                        <span>{post.duration_seconds}秒</span>
                        <span>{new Date(post.created_at).toLocaleString("ja-JP")}</span>
                      </div>
                      {post.audio_url ? <audio controls src={post.audio_url} className="audio-preview" /> : null}
                      <ReactionBar
                        voicePostId={post.id}
                        initialCounts={post.reactions ?? { clap: 0, laugh: 0, replay: 0 }}
                      />
                    </article>
                  ))}
                </div>
              )}
            </article>
          </section>
        </section>
      </main>
    );
  } catch {
    notFound();
  }
}
