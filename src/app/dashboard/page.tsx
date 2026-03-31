import Link from "next/link";
import { signOut } from "@/app/sign-in/actions";
import { VoiceReplyComposer } from "@/components/voice-reply-composer";
import { getQuestionsForRecipient } from "@/lib/questions";
import { getOrCreateProfileForCurrentUser } from "@/lib/profiles-server";
import { getVoicePostsForAuthor } from "@/lib/voice-posts";

const dashboardCards = [
  {
    title: "今日の質問",
    body: "ログイン不要で届いた質問を一覧化し、すぐ録音できる導線を置く。"
  },
  {
    title: "録音ステータス",
    body: "無料は 10 秒、Premium は 60 秒。匿名ボイスの選択もここで行う。"
  },
  {
    title: "声の実績",
    body: "拍手数、完聴率、ランキング入り回数、バッジをプロフィール資産として表示。"
  }
];

export default async function DashboardPage() {
  const { session, profile: resolvedProfile } = await getOrCreateProfileForCurrentUser();
  const email = session.user.email ?? "unknown";
  const questions = await getQuestionsForRecipient(session.user.id);
  const voicePosts = await getVoicePostsForAuthor(session.user.id);
  const askUrl =
    resolvedProfile.username != null
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/ask/${resolvedProfile.username}`
      : null;

  return (
    <main className="dashboard-shell">
      <section className="dashboard-hero">
        <span className="section-label">Creator Dashboard</span>
        <h1>答えやすく、育てやすい、Voiq の投稿画面。</h1>
        <p>
          ログイン済みユーザーとして <strong>{email}</strong> を確認しました。プロフィールも自動作成済みです。
          ここに質問一覧、録音ボタン、匿名ボイス切り替え、Premium 導線を一画面に集めていきます。
        </p>
      </section>

      <section className="profile-summary">
        <article className="profile-card">
          <span className="section-label">Your Profile</span>
          <h2>{resolvedProfile.display_name ?? resolvedProfile.username ?? "Voiq user"}</h2>
          <p>@{resolvedProfile.username ?? "username"}</p>
          <p>
            {resolvedProfile.bio ??
              "まだ自己紹介は未設定です。声の雰囲気や得意ジャンルを書いておくと質問が集まりやすくなります。"}
          </p>
          <div className="profile-meta">
            <span>{resolvedProfile.is_premium ? "Premium" : "Free"}</span>
            <span>{resolvedProfile.badge ?? "Badge 未設定"}</span>
            <span>{resolvedProfile.title ?? "称号 未設定"}</span>
          </div>
          {askUrl ? (
            <div className="profile-link-block">
              <strong>質問募集リンク</strong>
              <p>{askUrl}</p>
            </div>
          ) : null}
          <div className="auth-links">
            <Link className="secondary-button" href="/settings/profile">
              プロフィールを編集する
            </Link>
            {resolvedProfile.username ? (
              <Link className="secondary-button" href={`/ask/${resolvedProfile.username}`}>
                公開ページを見る
              </Link>
            ) : null}
            <form action={signOut}>
              <button className="secondary-button" type="submit">
                ログアウト
              </button>
            </form>
          </div>
        </article>
      </section>

      <section className="question-section">
        <article className="profile-card">
          <span className="section-label">Inbox</span>
          <h2>届いている質問</h2>
          {questions.length === 0 ? (
            <p>
              まだ質問は届いていません。プロフィールを整えて、質問募集リンクをシェアすると集まりやすくなります。
            </p>
          ) : (
            <div className="question-list">
              {questions.map((question) => (
                <article key={question.id} className="question-item">
                  <p>{question.content}</p>
                  <div className="question-meta">
                    <span>{question.is_anonymous ? "匿名" : question.sender_name ?? "名無し"}</span>
                    <span>{new Date(question.created_at).toLocaleString("ja-JP")}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>

      {questions.length > 0 ? (
        <section className="question-section">
          <VoiceReplyComposer
            questions={questions.map((question) => ({
              id: question.id,
              content: question.content,
              is_anonymous: question.is_anonymous,
              sender_name: question.sender_name
            }))}
            maxDurationSeconds={resolvedProfile.is_premium ? 60 : 10}
          />
        </section>
      ) : null}

      <section className="question-section">
        <article className="profile-card">
          <span className="section-label">Recent Answers</span>
          <h2>投稿した音声</h2>
          {voicePosts.length === 0 ? (
            <p>まだ音声回答はありません。届いた質問に 10 秒ボイスで返してみましょう。</p>
          ) : (
            <div className="question-list">
              {voicePosts.map((post) => (
                <article key={post.id} className="question-item">
                  <div className="question-meta">
                    <span>{post.voice_mode}</span>
                    <span>{post.duration_seconds}秒</span>
                    <span>{new Date(post.created_at).toLocaleString("ja-JP")}</span>
                  </div>
                  {post.audio_url ? <audio controls src={post.audio_url} className="audio-preview" /> : null}
                </article>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="dashboard-grid">
        {dashboardCards.map((card) => (
          <article key={card.title} className="dashboard-card">
            <h2>{card.title}</h2>
            <p>{card.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
