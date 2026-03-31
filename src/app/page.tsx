import { features, launchSteps, plans, rankingSamples } from "@/lib/site-data";

const waveformBars = Array.from({ length: 20 }, (_, index) => ({
  id: index,
  height: 24 + ((index * 17) % 64)
}));

export default function Home() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="eyebrow">VOICE QUESTION BOX</span>
          <h1>10秒で答える、匿名音声の質問箱。</h1>
          <p className="hero-text">
            Voiq は、質問箱の気軽さをそのまま音声にしたウェブサービスです。質問はログイン不要。
            答える側は匿名ボイスを選んで、短く、軽く、今のテンションのまま返せます。
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#concept">
              コンセプトを見る
            </a>
            <a className="secondary-button" href="#plans">
              料金設計を見る
            </a>
          </div>
          <dl className="hero-stats">
            <div>
              <dt>無料投稿</dt>
              <dd>10秒</dd>
            </div>
            <div>
              <dt>自動消去</dt>
              <dd>24時間</dd>
            </div>
            <div>
              <dt>プレミアム</dt>
              <dd>60秒</dd>
            </div>
          </dl>
        </div>

        <div className="phone-mock">
          <div className="phone-header">
            <span className="status-dot" />
            <span>@voiq_ai</span>
            <span>匿名ボイス: low</span>
          </div>
          <div className="question-bubble">
            「最近いちばん恥ずかしかったこと教えて」
          </div>
          <div className="wave-card">
            <div className="wave-bars" aria-hidden="true">
              {waveformBars.map((bar) => (
                <span
                  key={bar.id}
                  className="wave-bar"
                  style={{ height: `${bar.height}px`, animationDelay: `${bar.id * 90}ms` }}
                />
              ))}
            </div>
            <div className="wave-meta">
              <strong>00:10</strong>
              <span>24時間後に自動消去</span>
            </div>
          </div>
          <div className="reaction-row">
            <button type="button">拍手 128</button>
            <button type="button">笑い声 42</button>
            <button type="button">もう一回 17</button>
          </div>
        </div>
      </section>

      <section className="concept-grid" id="concept">
        <article className="concept-card concept-card--highlight">
          <p className="section-label">Why It Works</p>
          <h2>「10秒」×「24時間消去」で、投稿ハードルを極限まで下げる。</h2>
          <p>
            長く話す前提をやめることで、X のように瞬発的な投稿が生まれます。さらに 24
            時間で消えるから、あとから残り続ける不安も小さい。個人開発でも運用しやすく、体験としても中毒性を作りやすい設計です。
          </p>
        </article>

        <article className="concept-card">
          <p className="section-label">Question Flow</p>
          <ol className="simple-list">
            <li>質問者はログイン不要で質問を投げる</li>
            <li>回答者はメールログイン後に録音 or 匿名ボイス変換</li>
            <li>音声回答がタイムラインに載り、SNS シェアもできる</li>
          </ol>
        </article>
      </section>

      <section className="feature-section">
        <div className="section-heading">
          <p className="section-label">Core Features</p>
          <h2>質問箱ユーザーがそのまま乗り換えたくなる機能を先に見せる。</h2>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <article key={feature.title} className="feature-card">
              <span className="feature-badge">{feature.badge}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="split-section">
        <article className="panel panel--soft">
          <p className="section-label">Voice Rankings</p>
          <h2>声そのものが主役になるランキング設計。</h2>
          <div className="ranking-list">
            {rankingSamples.map((item) => (
              <div key={item.category} className={`ranking-pill ranking-pill--${item.accent}`}>
                <strong>{item.category}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel panel--dark">
          <p className="section-label">Creator Incentive</p>
          <h2>バッジ、称号、フォローで継続投稿を後押し。</h2>
          <p>
            再生数だけではなく、リアクション率・完聴率・ランキング入賞回数を可視化。
            声質や芸風ごとの強みが残るので、文字版質問箱よりも個性が資産になりやすい設計です。
          </p>
        </article>
      </section>

      <section className="plans-section" id="plans">
        <div className="section-heading">
          <p className="section-label">Pricing</p>
          <h2>無料の軽さを保ちつつ、プレミアムで深く話せる余地を作る。</h2>
        </div>
        <div className="plan-grid">
          {plans.map((plan) => (
            <article key={plan.tier} className="plan-card">
              <div className="plan-head">
                <h3>{plan.tier}</h3>
                <p>{plan.price}</p>
              </div>
              <ul className="simple-list">
                {plan.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="roadmap-section">
        <article className="roadmap-card">
          <p className="section-label">Build Roadmap</p>
          <h2>このまま実装を進めるときの MVP 順序。</h2>
          <ol className="simple-list">
            {launchSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </article>
      </section>
    </main>
  );
}
