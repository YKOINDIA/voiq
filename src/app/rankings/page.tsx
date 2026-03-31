import Link from "next/link";
import { getVoiceRankings } from "@/lib/rankings";

export default async function RankingsPage() {
  const rankings = await getVoiceRankings();

  return (
    <main className="dashboard-shell">
      <section className="dashboard-hero">
        <span className="section-label">Voice Rankings</span>
        <h1>リアクションが集まっているクリエイターを見つける</h1>
        <p>
          拍手、笑い声、もう一回の合計で並ぶランキングです。Voiq の人気ボイスを眺めながら、
          気になる人の公開ページへそのまま飛べます。
        </p>
      </section>

      <section className="question-section">
        <article className="profile-card">
          <span className="section-label">Top Creators</span>
          <h2>いま伸びている声</h2>
          {rankings.length === 0 ? (
            <p>まだランキング対象の回答がありません。最初の音声回答を投稿してみましょう。</p>
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
                    <span>合計 {entry.totalReactions}</span>
                    <span>拍手 {entry.clap}</span>
                    <span>笑い声 {entry.laugh}</span>
                    <span>もう一回 {entry.replay}</span>
                    <span>回答 {entry.voicePosts}</span>
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
