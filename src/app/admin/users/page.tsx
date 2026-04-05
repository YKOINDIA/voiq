import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-auth";
import { getBadgesForUser } from "@/lib/badges";
import { getFollowStats } from "@/lib/follows";
import { getLevelFromPoints } from "@/lib/points";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/profiles";
import {
  adjustPoints,
  adminTogglePremium,
  adminAwardBadge,
  adminRevokeBadge
} from "@/app/admin/users/actions";

type AdminUsersPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
    q?: string;
    filter?: string;
    sort?: string;
  }>;
};

type BadgeMaster = {
  id: string;
  name: string;
  icon: string;
  category: string;
};

type UserRow = {
  profile: Profile;
  level: number;
  levelTitle: string;
  levelColor: string;
  followers: number;
  postCount: number;
  reactionCount: number;
  earnedBadgeIds: string[];
};

async function getAdminUserList(
  query: string,
  filter: string,
  sort: string
): Promise<{ users: UserRow[]; allBadges: BadgeMaster[] }> {
  const admin = getSupabaseAdminClient();

  const [profilesResult, badgesResult, voicePostsResult, reactionsResult] = await Promise.all([
    admin.from("profiles").select("*").order("created_at", { ascending: false }).limit(200),
    admin.from("badges").select("id, name, icon, category").order("category").order("threshold"),
    admin.from("voice_posts").select("id, author_id"),
    admin.from("reactions").select("voice_post_id")
  ]);

  if (profilesResult.error) throw new Error(profilesResult.error.message);
  if (badgesResult.error) throw new Error(badgesResult.error.message);
  if (voicePostsResult.error) throw new Error(voicePostsResult.error.message);
  if (reactionsResult.error) throw new Error(reactionsResult.error.message);

  const allBadges = (badgesResult.data ?? []) as BadgeMaster[];

  // ポスト数集計
  const postCountMap = new Map<string, number>();
  const postToAuthorMap = new Map<string, string>();
  for (const vp of voicePostsResult.data ?? []) {
    postToAuthorMap.set(vp.id, vp.author_id);
    postCountMap.set(vp.author_id, (postCountMap.get(vp.author_id) ?? 0) + 1);
  }

  // リアクション数集計
  const reactionCountMap = new Map<string, number>();
  for (const r of reactionsResult.data ?? []) {
    const authorId = postToAuthorMap.get(r.voice_post_id);
    if (authorId) {
      reactionCountMap.set(authorId, (reactionCountMap.get(authorId) ?? 0) + 1);
    }
  }

  // フォロワー・バッジ取得
  const profiles = (profilesResult.data ?? []) as Profile[];
  const userRows: UserRow[] = await Promise.all(
    profiles.map(async (profile) => {
      const [followStats, userBadges] = await Promise.all([
        getFollowStats(profile.id),
        getBadgesForUser(profile.id)
      ]);
      const levelInfo = getLevelFromPoints(profile.points ?? 0);
      return {
        profile,
        level: levelInfo.level,
        levelTitle: levelInfo.title,
        levelColor: levelInfo.color,
        followers: followStats.followers,
        postCount: postCountMap.get(profile.id) ?? 0,
        reactionCount: reactionCountMap.get(profile.id) ?? 0,
        earnedBadgeIds: userBadges.map((b) => b.id)
      };
    })
  );

  // フィルタ
  let filtered = userRows;
  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (u) =>
        (u.profile.username ?? "").toLowerCase().includes(q) ||
        (u.profile.display_name ?? "").toLowerCase().includes(q)
    );
  }
  if (filter === "premium") {
    filtered = filtered.filter((u) => u.profile.is_premium);
  } else if (filter === "free") {
    filtered = filtered.filter((u) => !u.profile.is_premium);
  }

  // ソート
  if (sort === "level") {
    filtered.sort((a, b) => b.level - a.level || (b.profile.points ?? 0) - (a.profile.points ?? 0));
  } else if (sort === "reactions") {
    filtered.sort((a, b) => b.reactionCount - a.reactionCount);
  } else if (sort === "posts") {
    filtered.sort((a, b) => b.postCount - a.postCount);
  } else if (sort === "followers") {
    filtered.sort((a, b) => b.followers - a.followers);
  }
  // default: created_at desc (already ordered)

  return { users: filtered, allBadges };
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  await requireAdminSession();
  const sp = (await searchParams) ?? {};
  const query = sp.q ?? "";
  const filter = sp.filter ?? "all";
  const sort = sp.sort ?? "registered";

  const { users, allBadges } = await getAdminUserList(query, filter, sort);

  const filterOptions = [
    { value: "all", label: "全員" },
    { value: "premium", label: "Premium" },
    { value: "free", label: "Free" }
  ];
  const sortOptions = [
    { value: "registered", label: "登録順" },
    { value: "level", label: "レ��ル順" },
    { value: "reactions", label: "リアクション順" },
    { value: "posts", label: "投稿順" },
    { value: "followers", label: "フォロワー順" }
  ];

  return (
    <main className="dashboard-shell">
      <section className="dashboard-hero">
        <span className="section-label">Admin Console</span>
        <h1>ユーザー管理</h1>
        <p>ポイント調整、プラン変更、バッジ付与をここから操作できます。</p>
        <div className="auth-links">
          <Link className="secondary-button" href="/admin">
            管理トップへ戻る
          </Link>
        </div>
        {sp.success ? <p className="notice notice--success">{sp.success}</p> : null}
        {sp.error ? <p className="notice notice--error">{sp.error}</p> : null}
      </section>

      {/* 検索・フィルタ・ソート */}
      <section className="question-section">
        <article className="profile-card">
          <span className="section-label">Search &amp; Filter</span>
          <form className="admin-filter-bar" action="/admin/users" method="GET">
            <input
              name="q"
              type="search"
              placeholder="ユーザー名で検索..."
              defaultValue={query}
              className="admin-search-input"
            />
            <select name="filter" defaultValue={filter} className="admin-select">
              {filterOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select name="sort" defaultValue={sort} className="admin-select">
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button type="submit" className="secondary-button">
              検索
            </button>
          </form>
          <p>{users.length} 件のユーザー</p>
        </article>
      </section>

      {/* ユーザー一覧 */}
      <section className="question-section">
        <div className="question-list">
          {users.map((u) => (
            <article key={u.profile.id} className="profile-card admin-user-card">
              <div className="admin-user-header">
                <div>
                  <h3>{u.profile.display_name ?? u.profile.username ?? "Voiq user"}</h3>
                  <p>@{u.profile.username ?? "—"}</p>
                </div>
                <span className="level-badge" style={{ backgroundColor: u.levelColor }}>
                  Lv.{u.level} {u.levelTitle}
                </span>
              </div>

              <div className="reaction-inline">
                <span>{u.profile.is_premium ? "Premium" : "Free"}</span>
                <span>{u.profile.points ?? 0} pt</span>
                <span>投稿 {u.postCount}</span>
                <span>リアクション {u.reactionCount}</span>
                <span>フォロワー {u.followers}</span>
                <span>登録 {new Date(u.profile.created_at).toLocaleDateString("ja-JP")}</span>
              </div>

              {/* 獲得バッジ */}
              {u.earnedBadgeIds.length > 0 ? (
                <div className="badge-grid">
                  {allBadges
                    .filter((b) => u.earnedBadgeIds.includes(b.id))
                    .map((b) => (
                      <span key={b.id} className="badge-chip">
                        {b.icon} {b.name}
                        <form
                          action={adminRevokeBadge}
                          style={{ display: "inline", marginLeft: "4px" }}
                        >
                          <input type="hidden" name="profileId" value={u.profile.id} />
                          <input type="hidden" name="badgeId" value={b.id} />
                          <button type="submit" className="badge-remove-btn" title="取り���し">
                            x
                          </button>
                        </form>
                      </span>
                    ))}
                </div>
              ) : null}

              {/* 管理アクション */}
              <div className="admin-actions">
                {/* ポイント調整 */}
                <form action={adjustPoints} className="admin-inline-form">
                  <input type="hidden" name="profileId" value={u.profile.id} />
                  <input
                    name="amount"
                    type="number"
                    placeholder="pt (例: 50, -20)"
                    className="admin-number-input"
                    min={-9999}
                    max={9999}
                    required
                  />
                  <button type="submit" className="secondary-button">
                    pt調整
                  </button>
                </form>

                {/* Premium切替 */}
                <form action={adminTogglePremium} className="admin-inline-form">
                  <input type="hidden" name="profileId" value={u.profile.id} />
                  <input
                    type="hidden"
                    name="nextValue"
                    value={u.profile.is_premium ? "false" : "true"}
                  />
                  <button type="submit" className="secondary-button">
                    {u.profile.is_premium ? "Premium解除" : "Premium化"}
                  </button>
                </form>

                {/* バッジ手動付与 */}
                <form action={adminAwardBadge} className="admin-inline-form">
                  <input type="hidden" name="profileId" value={u.profile.id} />
                  <select name="badgeId" className="admin-select" required>
                    <option value="">バッジ選択...</option>
                    {allBadges
                      .filter((b) => !u.earnedBadgeIds.includes(b.id))
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.icon} {b.name}
                        </option>
                      ))}
                  </select>
                  <button type="submit" className="secondary-button">
                    付与
                  </button>
                </form>

                {/* 公開ページリンク */}
                {u.profile.username ? (
                  <Link className="secondary-button" href={`/ask/${u.profile.username}`}>
                    公開ペ��ジ
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
