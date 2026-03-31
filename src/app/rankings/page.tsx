import Link from "next/link";
import { getVoiceRankings } from "@/lib/rankings";

export default async function RankingsPage() {
  const boards = await getVoiceRankings();

  return (
    <main className="dashboard-shell">
      <section className="dashboard-hero">
        <span className="section-label">Voice Rankings</span>
        <h1>いろいろな声ランキングをまとめて見られるページ</h1>
        <p>
          Voiq で集まった反応をもとに、総合だけでなくカテゴリ別の声ランキングも並べています。
          良い声、特徴ある声、声モノマネ、動物の鳴き声、セクシーボイスまで一気に追えます。
        </p>
      </section>

      {boards.map((board) => (
        <section key={board.id} className="question-section">
          <article className="profile-card">
            <span className="section-label">Ranking Board</span>
            <h2>{board.title}</h2>
            <p>{board.description}</p>
            {board.entries.length === 0 ? (
              <p>まだこのカテゴリのランキング対象がありません。</p>
            ) : (
              <div className="ranking-board">
                {board.entries.map((entry, index) => (
                  <article key={`${board.id}-${entry.authorId}`} className="ranking-row">
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
                      <span>回答 {entry.voicePosts}</span>
                    </div>
                    <div className="reaction-inline">
                      <span>地声 {entry.originalPosts}</span>
                      <span>高め {entry.highPosts}</span>
                      <span>低め {entry.lowPosts}</span>
                      <span>ロボット {entry.robotPosts}</span>
                      <span>通話風 {entry.telephonePosts}</span>
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
      ))}
    </main>
  );
}
