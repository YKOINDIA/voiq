import { RankingTabs } from "@/components/ranking-tabs";
import { getVoiceRankings } from "@/lib/rankings";

export const revalidate = 3600;

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

      <RankingTabs boards={boards} />
    </main>
  );
}
