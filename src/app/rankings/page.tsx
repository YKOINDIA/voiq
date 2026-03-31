import Link from "next/link";
import { getVoiceRankings } from "@/lib/rankings";

export default async function RankingsPage() {
  const rankings = await getVoiceRankings();

  return (
    <main className="dashboard-shell">
      <section className="dashboard-hero">
        <span className="section-label">Voice Rankings</span>
        <h1>声にリアクションが集まる人を見つける。</h1>
        <p>
          拍手、笑い声、もう一回の合計で、今反応されている投稿者を表示します。将来的にはカテゴリ別の声ランキングへ広げられます。
        </p>
      </section>

      <section className="question-section">
        <article className="profile-card">
          <span className="section-label">Top Creators</span>
          <h2>総合リアクションランキング</h2>
          {rankings.length === 0 ? (
            <p>まだランキング対象の投稿がありません。まずは音声回答を投稿してみましょう。</p>
          ) : (
            <div className="ranking-board">
              {rankings.map((entry, index) => (
                <article key={entry.authorId} className="ranking-row">
                  <strong>#{index + 1}</strong>
                  <div>
                    <h3>{entry.displayName ?? entry.username ?? "Voiq user"}</h3>
                    <p>@{entry.username ?? "username"}</p>
                  </div>
                  <div className="reaction-inline">
                    <span>総合 {entry.totalReactions}</span>
                    <span>拍手 {entry.clap}</span>
                    <span>笑い声 {entry.laugh}</span>
                    <span>もう一回 {entry.replay}</span>
                    <span>投稿 {entry.voicePosts}</span>
                  </div>
                  {entry.username ? (
                    <Link className="secondary-button" href={`/ask/${entry.username}`}>
                      公開ページへ
                    </Link>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
