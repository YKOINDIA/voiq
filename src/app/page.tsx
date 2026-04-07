import Link from "next/link";
import { FeedCard } from "@/components/feed-card";
import { FeedCategoryTabs } from "@/components/feed-category-tabs";
import { getFollowingFeed, getPublicFeed, type FeedCategory } from "@/lib/feed";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const revalidate = 60;

type HomePageProps = {
  searchParams?: Promise<{
    q?: string;
    cat?: string;
  }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const sp = (await searchParams) ?? {};
  const query = sp.q ?? "";
  const category = (sp.cat ?? "all") as FeedCategory;

  const supabase = await getSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const feed = await getPublicFeed(category, query);

  // フォロー中のユーザーフィード（ログイン時のみ）
  const followingFeed = session ? await getFollowingFeed(session.user.id, 6) : [];

  // フォロー中のユーザーリスト
  let followingProfiles: { id: string; username: string | null; display_name: string | null; avatar_url: string | null }[] = [];
  if (session) {
    const admin = getSupabaseAdminClient();
    const { data: follows } = await admin
      .from("follows")
      .select("following_id")
      .eq("follower_id", session.user.id)
      .limit(20);
    if (follows && follows.length > 0) {
      const ids = follows.map((f) => f.following_id);
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", ids);
      followingProfiles = profiles ?? [];
    }
  }

  return (
    <main className="home-shell">
      {/* カテゴリタブ */}
      <FeedCategoryTabs active={category} query={query} />

      <div className="home-layout">
        {/* メインフィード */}
        <section className="home-feed">
          {query ? (
            <p className="home-feed__query">
              「{query}」の検索結果 ({feed.length}件)
            </p>
          ) : null}

          {feed.length === 0 ? (
            <div className="home-empty">
              <h2>{query ? "該当するボイスが見つかりません" : "まだボイスがありません"}</h2>
              <p>
                {query
                  ? "別のキーワードで検索してみてください。"
                  : session
                    ? "最初のボイスを投稿して、タイムラインを盛り上げましょう。"
                    : "ログインして、最初のボイスを投稿してみましょう。"
                }
              </p>
              {!session ? (
                <Link href="/sign-in" className="primary-button">
                  無料ではじめる
                </Link>
              ) : (
                <Link href="/dashboard" className="primary-button">
                  ボイスを投稿する
                </Link>
              )}
            </div>
          ) : (
            <div className="feed-grid">
              {feed.map((item) => (
                <FeedCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>

        {/* サイドバー（ログイン時） */}
        <aside className="home-sidebar">
          {session && followingProfiles.length > 0 ? (
            <section className="sidebar-section">
              <h3 className="sidebar-title">フォロー中</h3>
              <div className="sidebar-users">
                {followingProfiles.map((p) => (
                  <Link
                    key={p.id}
                    href={p.username ? `/ask/${p.username}` : "#"}
                    className="sidebar-user"
                  >
                    <span className="sidebar-user__avatar">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" />
                      ) : (
                        (p.display_name ?? "V").charAt(0).toUpperCase()
                      )}
                    </span>
                    <span className="sidebar-user__name">
                      {p.display_name ?? p.username ?? "Voiq user"}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {session && followingFeed.length > 0 ? (
            <section className="sidebar-section">
              <h3 className="sidebar-title">フォロー中の最新</h3>
              {followingFeed.slice(0, 4).map((item) => (
                <Link key={item.id} href={item.shareUrl} className="sidebar-mini-card">
                  <strong>{item.authorName}</strong>
                  <span>{item.questionContent ? item.questionContent.slice(0, 30) : `${item.durationSeconds}秒のボイス`}</span>
                </Link>
              ))}
            </section>
          ) : null}

          <section className="sidebar-section">
            <h3 className="sidebar-title">メニュー</h3>
            <nav className="sidebar-nav">
              <Link href="/rankings">ランキング</Link>
              {session ? <Link href="/dashboard">マイページ</Link> : null}
              {session ? <Link href="/settings/profile">設定</Link> : null}
              {!session ? <Link href="/sign-in">ログイン / 新規登録</Link> : null}
            </nav>
          </section>
        </aside>
      </div>
    </main>
  );
}
