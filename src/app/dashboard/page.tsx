import Link from "next/link";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { VoiceReplyComposer } from "@/components/voice-reply-composer";
import { getBadgesForUser } from "@/lib/badges";
import { getFollowStats } from "@/lib/follows";
import { getLevelProgress, getAllLevels } from "@/lib/points";
import { buildCreatorIdentity } from "@/lib/profile-insights";
import { getQuestionsForRecipient } from "@/lib/questions";
import { getOrCreateProfileForCurrentUser } from "@/lib/profiles-server";
import { getVoiceModeLabel } from "@/lib/voice-modes";
import { getVoicePostsForAuthor } from "@/lib/voice-posts";

type DashboardPageProps = {
  searchParams?: Promise<{ tab?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const sp = (await searchParams) ?? {};
  const tab = sp.tab ?? "content";

  const { session, profile } = await getOrCreateProfileForCurrentUser();
  const [questions, voicePosts, followStats, userBadges] = await Promise.all([
    getQuestionsForRecipient(session.user.id),
    getVoicePostsForAuthor(session.user.id),
    getFollowStats(session.user.id),
    getBadgesForUser(session.user.id)
  ]);
  const creatorIdentity = buildCreatorIdentity(profile, voicePosts);
  const levelProgress = getLevelProgress(profile.points ?? 0);
  const unansweredQuestions = questions.filter((q) => !q.answered_at);
  const askUrl =
    profile.username != null ? `${process.env.NEXT_PUBLIC_SITE_URL}/ask/${profile.username}` : null;

  return (
    <main className="dashboard-shell">
      {/* プロフィールサマリ */}
      <section className="dash-profile-bar">
        <div className="dash-profile-bar__left">
          <div className="dash-profile-avatar">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" />
            ) : (
              <span>{(profile.display_name ?? "V").charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <h1 className="dash-profile-name">{profile.display_name ?? profile.username ?? "Voiq user"}</h1>
            <p className="dash-profile-sub">@{profile.username ?? "username"}</p>
          </div>
        </div>
        <div className="dash-profile-bar__right">
          <div className="level-bar-section">
            <div className="level-bar-header">
              <span className="level-badge" style={{ backgroundColor: levelProgress.current.color }}>
                Lv.{levelProgress.current.level} {levelProgress.current.title}
              </span>
              <span className="level-points">{profile.points ?? 0} pt</span>
            </div>
            <div className="level-bar-track">
              <div
                className="level-bar-fill"
                style={{
                  width: `${Math.round(levelProgress.progress * 100)}%`,
                  backgroundColor: levelProgress.current.color
                }}
              />
            </div>
            {levelProgress.next ? (
              <p className="level-bar-hint">
                次「{levelProgress.next.title}」まで {levelProgress.next.points - (profile.points ?? 0)} pt
              </p>
            ) : (
              <p className="level-bar-hint">最高レベル到達</p>
            )}
          </div>
        </div>
      </section>

      {/* タブ */}
      <DashboardTabs active={tab} />

      {/* コンテンツタブ */}
      {tab === "content" ? (
        <>
          {/* 受信質問 */}
          <section className="question-section">
            <article className="profile-card">
              <h2>受信した質問 ({questions.length}件)</h2>
              {unansweredQuestions.length > 0 ? (
                <p className="notice notice--success">{unansweredQuestions.length}件の未回答があります</p>
              ) : (
                <p>すべて回答済みです。</p>
              )}
              {askUrl ? (
                <div className="profile-link-block">
                  <strong>質問募集リンク</strong>
                  <p>{askUrl}</p>
                </div>
              ) : null}
              <div className="question-list">
                {unansweredQuestions.map((q) => (
                  <article key={q.id} className="question-item">
                    <p>{q.content}</p>
                    <div className="question-meta">
                      <span>{q.is_anonymous ? "匿名" : q.sender_name ?? "名無し"}</span>
                      <span>{new Date(q.created_at).toLocaleString("ja-JP")}</span>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          </section>

          {/* 自分のボイスコンテンツ */}
          <section className="question-section">
            <article className="profile-card">
              <h2>あなたのボイス ({voicePosts.length}件)</h2>
              {voicePosts.length === 0 ? (
                <p>まだボイスがありません。「録音」タブから最初のボイスを投稿しましょう。</p>
              ) : (
                <div className="question-list">
                  {voicePosts.map((post) => (
                    <article key={post.id} className="question-item">
                      {post.question_content ? <p>Q. {post.question_content}</p> : null}
                      <div className="question-meta">
                        <span>{getVoiceModeLabel(post.voice_mode)}</span>
                        <span>{post.duration_seconds}秒</span>
                        <span>{post.expires_at ? "24hで消える" : "保存済み"}</span>
                        <span>{new Date(post.created_at).toLocaleString("ja-JP")}</span>
                      </div>
                      {post.audio_url ? <audio controls src={post.audio_url} className="audio-preview" /> : null}
                      {post.reactions ? (
                        <div className="reaction-inline">
                          <span>拍手 {post.reactions.clap}</span>
                          <span>笑い声 {post.reactions.laugh}</span>
                          <span>もう一回 {post.reactions.replay}</span>
                        </div>
                      ) : null}
                      <div className="auth-links">
                        {post.share_url ? (
                          <Link className="secondary-button" href={post.share_url}>シェア</Link>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </article>
          </section>
        </>
      ) : null}

      {/* 録音タブ */}
      {tab === "record" ? (
        <section className="question-section">
          {unansweredQuestions.length > 0 ? (
            <VoiceReplyComposer
              questions={unansweredQuestions.map((q) => ({
                id: q.id,
                content: q.content,
                is_anonymous: q.is_anonymous,
                sender_name: q.sender_name
              }))}
              maxDurationSeconds={profile.is_premium ? 60 : 10}
              isPremium={profile.is_premium}
            />
          ) : (
            <article className="profile-card">
              <h2>回答待ちの質問がありません</h2>
              <p>質問募集リンクをシェアして、質問を集めましょう。</p>
              {askUrl ? (
                <div className="profile-link-block">
                  <strong>質問募集リンク</strong>
                  <p>{askUrl}</p>
                </div>
              ) : null}
            </article>
          )}
        </section>
      ) : null}

      {/* アナリティクスタブ */}
      {tab === "analytics" ? (
        <section className="question-section">
          <article className="profile-card">
            <h2>Voice アナリティクス</h2>
            <div className="analytics-grid">
              <div className="analytics-card">
                <span className="analytics-value">{voicePosts.length}</span>
                <span className="analytics-label">投稿数</span>
              </div>
              <div className="analytics-card">
                <span className="analytics-value">{creatorIdentity.totalReactions}</span>
                <span className="analytics-label">総リアクション</span>
              </div>
              <div className="analytics-card">
                <span className="analytics-value">{followStats.followers}</span>
                <span className="analytics-label">フォロワー</span>
              </div>
              <div className="analytics-card">
                <span className="analytics-value">{followStats.following}</span>
                <span className="analytics-label">フォロー中</span>
              </div>
              <div className="analytics-card">
                <span className="analytics-value">{questions.length}</span>
                <span className="analytics-label">受信した質問</span>
              </div>
              <div className="analytics-card">
                <span className="analytics-value">{userBadges.length}</span>
                <span className="analytics-label">獲得バッジ</span>
              </div>
            </div>
          </article>

          {/* バッジ一覧 */}
          <article className="profile-card">
            <h2>獲得バッジ</h2>
            {userBadges.length === 0 ? (
              <p>まだバッジを獲得していません。ボイスを投稿してバッジを集めましょう。</p>
            ) : (
              <div className="badge-grid">
                {userBadges.map((b) => (
                  <span key={b.id} className="badge-chip" title={b.description}>
                    {b.icon} {b.name}
                  </span>
                ))}
              </div>
            )}
          </article>

          {/* レベル一覧 */}
          <article className="profile-card">
            <h2>レベル一覧</h2>
            <p>ボイスの投稿やリアクションでポイントが貯まり、レベルが上がります。</p>
            <div className="level-table">
              {getAllLevels().map((lv) => (
                <div
                  key={lv.level}
                  className={`level-row ${(profile.points ?? 0) >= lv.points ? "level-row--reached" : ""}`}
                >
                  <span className="level-badge" style={{ backgroundColor: lv.color }}>
                    Lv.{lv.level}
                  </span>
                  <div className="level-row__info">
                    <strong>{lv.title}</strong>
                    <span>{lv.description}</span>
                  </div>
                  <span className="level-row__pts">{lv.points} pt</span>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {/* 字幕タブ */}
      {tab === "subtitles" ? (
        <section className="question-section">
          <article className="profile-card">
            <h2>Voice 字幕</h2>
            <p>投稿した音声の自動文字起こしを確認・編集できます。</p>
            {voicePosts.length === 0 ? (
              <p>まだボイスがありません。</p>
            ) : (
              <div className="question-list">
                {voicePosts.map((post) => (
                  <article key={post.id} className="question-item">
                    {post.question_content ? <p className="subtitle-question">Q. {post.question_content}</p> : null}
                    <div className="question-meta">
                      <span>{getVoiceModeLabel(post.voice_mode)}</span>
                      <span>{post.duration_seconds}秒</span>
                    </div>
                    <p className="subtitle-text">
                      {post.transcript ?? "字幕はまだ生成されていません（今後対応予定）"}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </article>
        </section>
      ) : null}

      {/* 収入タブ */}
      {tab === "earn" ? (
        <section className="question-section">
          <article className="profile-card">
            <h2>収入</h2>
            <p>
              Voiq ではリアクションやフォロワー数に応じた収益化プログラムを準備中です。
              現在はポイントとバッジで実績を可視化しています。
            </p>
            <div className="analytics-grid">
              <div className="analytics-card">
                <span className="analytics-value">{profile.points ?? 0}</span>
                <span className="analytics-label">累計ポイント</span>
              </div>
              <div className="analytics-card">
                <span className="analytics-value">{creatorIdentity.totalReactions}</span>
                <span className="analytics-label">総リアクション</span>
              </div>
              <div className="analytics-card">
                <span className="analytics-value">{profile.is_premium ? "Premium" : "Free"}</span>
                <span className="analytics-label">プラン</span>
              </div>
            </div>
            <div className="earn-notice">
              <h3>収益化プログラム（Coming Soon）</h3>
              <ul>
                <li>リアクション数に応じた報酬</li>
                <li>Premium リスナーからの投げ銭</li>
                <li>ランキング入賞ボーナス</li>
              </ul>
            </div>
          </article>
        </section>
      ) : null}
    </main>
  );
}
