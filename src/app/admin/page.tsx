import Link from "next/link";
import { togglePremium } from "@/app/admin/actions";
import {
  getAdminCreators,
  getPlatformCounts,
  getRecentQuestions,
  getRecentVoicePosts
} from "@/lib/admin-dashboard";
import { requireAdminSession } from "@/lib/admin-auth";
import { getVoiceModeLabel } from "@/lib/voice-modes";

type AdminPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await requireAdminSession();
  const resolvedSearchParams = (await searchParams) ?? {};
  const [counts, creators, recentQuestions, recentVoicePosts] = await Promise.all([
    getPlatformCounts(),
    getAdminCreators(),
    getRecentQuestions(),
    getRecentVoicePosts()
  ]);

  return (
    <main className="dashboard-shell">
      <section className="dashboard-hero">
        <span className="section-label">Admin Console</span>
        <h1>Voiq 管理画面</h1>
        <p>全体の数字、主要クリエイター、最新の質問と回答をここで確認できます。</p>
        <div className="auth-links">
          <Link className="secondary-button" href="/admin/users">
            ユーザー管理
          </Link>
          <Link className="secondary-button" href="/dashboard">
            ダッシュボードへ戻る
          </Link>
        </div>
        {resolvedSearchParams.success ? (
          <p className="notice notice--success">{resolvedSearchParams.success}</p>
        ) : null}
        {resolvedSearchParams.error ? (
          <p className="notice notice--error">{resolvedSearchParams.error}</p>
        ) : null}
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-card">
          <h2>ユーザー</h2>
          <p>{counts.profiles}</p>
        </article>
        <article className="dashboard-card">
          <h2>質問</h2>
          <p>{counts.questions}</p>
        </article>
        <article className="dashboard-card">
          <h2>音声回答</h2>
          <p>{counts.voicePosts}</p>
        </article>
        <article className="dashboard-card">
          <h2>リアクション</h2>
          <p>{counts.reactions}</p>
        </article>
        <article className="dashboard-card">
          <h2>フォロー</h2>
          <p>{counts.follows}</p>
        </article>
      </section>

      <section className="question-section">
        <article className="profile-card">
          <span className="section-label">Top Creators</span>
          <h2>主要クリエイター</h2>
          <div className="ranking-board">
            {creators.map((creator) => (
              <article key={creator.profile.id} className="ranking-row">
                <div>
                  <h3>{creator.profile.display_name ?? creator.profile.username ?? "Voiq user"}</h3>
                  <p>@{creator.profile.username ?? "username"}</p>
                </div>
                <div className="reaction-inline">
                  <span>{creator.profile.is_premium ? "Premium" : "Free"}</span>
                  <span>{creator.badge}</span>
                  <span>回答 {creator.posts}</span>
                  <span>リアクション {creator.reactions}</span>
                  <span>フォロワー {creator.followers}</span>
                </div>
                <p>{creator.title}</p>
                <div className="auth-links">
                  {creator.profile.username ? (
                    <Link className="secondary-button" href={`/ask/${creator.profile.username}`}>
                      公開ページ
                    </Link>
                  ) : null}
                  <form action={togglePremium}>
                    <input type="hidden" name="profileId" value={creator.profile.id} />
                    <input
                      type="hidden"
                      name="nextValue"
                      value={creator.profile.is_premium ? "false" : "true"}
                    />
                    <button className="secondary-button" type="submit">
                      {creator.profile.is_premium ? "Premium解除" : "Premium化"}
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="split-section">
        <article className="panel panel--soft">
          <p className="section-label">Recent Questions</p>
          <h2>最新の質問</h2>
          <div className="question-list">
            {recentQuestions.map((question) => (
              <article key={question.id} className="question-item">
                <p>{question.content}</p>
                <div className="question-meta">
                  <span>
                    {question.recipient?.display_name ?? question.recipient?.username ?? "Unknown"}
                  </span>
                  <span>{question.is_anonymous ? "匿名" : question.sender_name ?? "名無し"}</span>
                  <span>{question.answered_at ? "回答済み" : "未回答"}</span>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="panel panel--soft">
          <p className="section-label">Recent Voice Posts</p>
          <h2>最新の音声回答</h2>
          <div className="question-list">
            {recentVoicePosts.map((post) => (
              <article key={post.id} className="question-item">
                <div className="question-meta">
                  <span>{post.author?.display_name ?? post.author?.username ?? "Unknown"}</span>
                  <span>{getVoiceModeLabel(post.voice_mode)}</span>
                  <span>{post.duration_seconds}秒</span>
                  <span>{post.expires_at ? "24時間で消える" : "無期限保存"}</span>
                </div>
                <p>{new Date(post.created_at).toLocaleString("ja-JP")}</p>
              </article>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
