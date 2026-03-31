import Link from "next/link";
import { redirect } from "next/navigation";
import { ensureProfileForUser } from "@/lib/profiles";
import { getSupabaseServerClient } from "@/lib/supabase/server";

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
  const supabase = await getSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/sign-in?error=先にログインしてください");
  }

  const profile = await ensureProfileForUser(session.user);
  const email = session.user.email ?? "unknown";

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
          <h2>{profile.display_name ?? profile.username ?? "Voiq user"}</h2>
          <p>@{profile.username ?? "username"}</p>
          <p>
            {profile.bio ??
              "まだ自己紹介は未設定です。声の雰囲気や得意ジャンルを書いておくと質問が集まりやすくなります。"}
          </p>
          <div className="profile-meta">
            <span>{profile.is_premium ? "Premium" : "Free"}</span>
            <span>{profile.badge ?? "Badge 未設定"}</span>
            <span>{profile.title ?? "称号 未設定"}</span>
          </div>
          <Link className="secondary-button" href="/settings/profile">
            プロフィールを編集する
          </Link>
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
