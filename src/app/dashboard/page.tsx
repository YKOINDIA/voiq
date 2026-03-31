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

export default function DashboardPage() {
  return (
    <main className="dashboard-shell">
      <section className="dashboard-hero">
        <span className="section-label">Creator Dashboard</span>
        <h1>答えやすく、育てやすい、Voiq の投稿画面。</h1>
        <p>
          ここは認証後のホーム想定です。質問一覧、録音ボタン、匿名ボイス切り替え、
          Premium 導線を一画面に集める構成へ広げられます。
        </p>
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
