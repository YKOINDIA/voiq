import Link from "next/link";
import { signOut } from "@/app/sign-in/actions";
import { VoiceReplyComposer } from "@/components/voice-reply-composer";
import { getAdminEmails } from "@/lib/env";
import { getFollowStats } from "@/lib/follows";
import { buildCreatorIdentity } from "@/lib/profile-insights";
import { getQuestionsForRecipient } from "@/lib/questions";
import { getOrCreateProfileForCurrentUser } from "@/lib/profiles-server";
import { getVoiceModeLabel } from "@/lib/voice-modes";
import { getVoicePostsForAuthor } from "@/lib/voice-posts";

const dashboardCards = [
  {
    title: "質問を集める",
    body: "公開リンクをシェアして、匿名の質問を気軽に集められます。"
  },
  {
    title: "声で返す",
    body: "Free は 10 秒、Premium は 60 秒まで。匿名ボイスに変えて答えることもできます。"
  },
  {
    title: "反応が返る",
    body: "拍手、笑い声、もう一回のリアクションで聞き専の反応がたまっていきます。"
  }
];

export default async function DashboardPage() {
  const { session, profile } = await getOrCreateProfileForCurrentUser();
  const email = session.user.email ?? "unknown";
  const isAdmin = getAdminEmails().includes(email.toLowerCase());
  const [questions, voicePosts, followStats] = await Promise.all([
    getQuestionsForRecipient(session.user.id),
    getVoicePostsForAuthor(session.user.id),
    getFollowStats(session.user.id)
  ]);
  const creatorIdentity = buildCreatorIdentity(profile, voicePosts);
  const askUrl =
    profile.username != null ? `${process.env.NEXT_PUBLIC_SITE_URL}/ask/${profile.username}` : null;
  const unansweredQuestions = questions.filter((question) => !question.answered_at);
  const answeredQuestions = questions.filter((question) => Boolean(question.answered_at));

  return (
    <main className="dashboard-shell">
      <section className="dashboard-hero">
        <span className="section-label">Creator Dashboard</span>
        <h1>質問を集めて、声で返す。Voiq の運営画面です。</h1>
        <p>
          <strong>{email}</strong> でログイン中です。プロフィールと公開ページを整えて、
          質問への音声回答、ランキング、シェア導線までここから回せます。
        </p>
      </section>

      <section className="profile-summary">
        <article className="profile-card">
          <span className="section-label">Your Profile</span>
          <h2>{profile.display_name ?? profile.username ?? "Voiq user"}</h2>
          <p>@{profile.username ?? "username"}</p>
          <p>
            {profile.bio ??
              "まだ自己紹介が入っていません。声の特徴や好きなジャンルを書いておくと質問が集まりやすくなります。"}
          </p>
          <div className="profile-meta">
            <span>{profile.is_premium ? "Premium" : "Free"}</span>
            <span>{creatorIdentity.badge}</span>
            <span>{creatorIdentity.title}</span>
            <span>リアクション {creatorIdentity.totalReactions}</span>
            <span>フォロワー {followStats.followers}</span>
            <span>フォロー中 {followStats.following}</span>
          </div>
          {askUrl ? (
            <div className="profile-link-block">
              <strong>質問募集リンク</strong>
              <p>{askUrl}</p>
            </div>
          ) : null}
          <div className="auth-links">
            <Link className="secondary-button" href="/settings/profile">
              プロフィールを編集
            </Link>
            {profile.username ? (
              <Link className="secondary-button" href={`/ask/${profile.username}`}>
                公開ページを見る
              </Link>
            ) : null}
            <Link className="secondary-button" href="/rankings">
              ランキングを見る
            </Link>
            {isAdmin ? (
              <Link className="secondary-button" href="/admin">
                管理画面
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
            <p>まだ質問はありません。公開ページや質問募集リンクをシェアしてみましょう。</p>
          ) : (
            <div className="question-list">
              <article className="question-item">
                <strong>未回答 {unansweredQuestions.length}</strong>
                {unansweredQuestions.length === 0 ? (
                  <p>未回答の質問はありません。</p>
                ) : (
                  <div className="question-list nested-question-list">
                    {unansweredQuestions.map((question) => (
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

              <article className="question-item">
                <strong>回答済み {answeredQuestions.length}</strong>
                {answeredQuestions.length === 0 ? (
                  <p>まだ回答済みの質問はありません。</p>
                ) : (
                  <div className="question-list nested-question-list">
                    {answeredQuestions.map((question) => (
                      <article key={question.id} className="question-item">
                        <p>{question.content}</p>
                        <div className="question-meta">
                          <span>{question.is_anonymous ? "匿名" : question.sender_name ?? "名無し"}</span>
                          <span>
                            {new Date(question.answered_at ?? question.created_at).toLocaleString("ja-JP")}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </article>
            </div>
          )}
        </article>
      </section>

      {unansweredQuestions.length > 0 ? (
        <section className="question-section">
          <VoiceReplyComposer
            questions={unansweredQuestions.map((question) => ({
              id: question.id,
              content: question.content,
              is_anonymous: question.is_anonymous,
              sender_name: question.sender_name
            }))}
            maxDurationSeconds={profile.is_premium ? 60 : 10}
            isPremium={profile.is_premium}
          />
        </section>
      ) : null}

      <section className="question-section">
        <article className="profile-card">
          <span className="section-label">Recent Answers</span>
          <h2>投稿した音声</h2>
          {voicePosts.length === 0 ? (
            <p>まだ音声回答はありません。まずはひとつ録音して投稿してみましょう。</p>
          ) : (
            <div className="question-list">
              {voicePosts.map((post) => (
                <article key={post.id} className="question-item">
                  {post.question_content ? <p>Q. {post.question_content}</p> : null}
                  <div className="question-meta">
                    <span>{getVoiceModeLabel(post.voice_mode)}</span>
                    <span>{post.duration_seconds}秒</span>
                    <span>{post.expires_at ? "24時間で消える" : "無期限保存"}</span>
                    <span>{new Date(post.created_at).toLocaleString("ja-JP")}</span>
                  </div>
                  {post.audio_url ? <audio controls src={post.audio_url} className="audio-preview" /> : null}
                  <div className="auth-links">
                    {post.share_url ? (
                      <Link className="secondary-button" href={post.share_url}>
                        波形シェアを見る
                      </Link>
                    ) : null}
                  </div>
                  {post.reactions ? (
                    <div className="reaction-inline">
                      <span>拍手 {post.reactions.clap}</span>
                      <span>笑い声 {post.reactions.laugh}</span>
                      <span>もう一回 {post.reactions.replay}</span>
                    </div>
                  ) : null}
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
