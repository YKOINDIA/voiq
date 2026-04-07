import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  adminReplyToThread,
  adminUpdateThreadStatus,
  adminMarkThreadRead
} from "@/app/admin/feedback/actions";

type AdminFeedbackPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
    filter?: string;
    thread?: string;
  }>;
};

type ThreadRow = {
  id: string;
  user_id: string;
  category: string;
  status: string;
  last_message: string | null;
  unread_admin: boolean;
  unread_user: boolean;
  created_at: string;
  updated_at: string;
  user_display_name: string;
  user_username: string;
};

type MessageRow = {
  id: string;
  thread_id: string;
  body: string;
  is_admin: boolean;
  created_at: string;
};

const CATEGORY_ICONS: Record<string, string> = {
  "要望": "💡",
  "不具合": "🐛",
  "質問": "❓",
  "その他": "📝"
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  "未対応": { label: "未対応", className: "badge-chip" },
  "対応中": { label: "対応中", className: "badge-chip" },
  "解決済み": { label: "解決済み", className: "badge-chip" }
};

async function getThreads(filter: string): Promise<ThreadRow[]> {
  const admin = getSupabaseAdminClient();

  let query = admin
    .from("feedback_threads")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (filter && filter !== "全て") {
    query = query.eq("status", filter);
  }

  const { data: threads, error } = await query;
  if (error) throw new Error(error.message);

  // Fetch user profiles for display names
  const userIds = [...new Set((threads ?? []).map((t) => t.user_id))];
  const profileMap = new Map<string, { display_name: string | null; username: string | null }>();

  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name, username")
      .in("id", userIds);

    for (const p of profiles ?? []) {
      profileMap.set(p.id, { display_name: p.display_name, username: p.username });
    }
  }

  return (threads ?? []).map((t) => {
    const profile = profileMap.get(t.user_id);
    return {
      ...t,
      user_display_name: profile?.display_name ?? "Voiq user",
      user_username: profile?.username ?? "unknown"
    };
  });
}

async function getThreadMessages(threadId: string): Promise<MessageRow[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("feedback_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as MessageRow[];
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}日前`;
  return d.toLocaleDateString("ja-JP");
}

export default async function AdminFeedbackPage({ searchParams }: AdminFeedbackPageProps) {
  await requireAdminSession();
  const sp = (await searchParams) ?? {};
  const filter = sp.filter ?? "全て";
  const selectedThreadId = sp.thread ?? "";

  const threads = await getThreads(filter);

  // Load selected thread details
  const selectedThread = selectedThreadId
    ? threads.find((t) => t.id === selectedThreadId) ?? null
    : null;
  const messages = selectedThread ? await getThreadMessages(selectedThread.id) : [];

  // Mark thread as read when admin views it
  if (selectedThread?.unread_admin) {
    const admin = getSupabaseAdminClient();
    await admin
      .from("feedback_threads")
      .update({ unread_admin: false })
      .eq("id", selectedThread.id);
  }

  const filterOptions = [
    { value: "全て", label: "全て" },
    { value: "未対応", label: "未対応" },
    { value: "対応中", label: "対応中" },
    { value: "解決済み", label: "解決済み" }
  ];

  return (
    <main className="dashboard-shell">
      <section className="dashboard-hero">
        <span className="section-label">Admin Console</span>
        <h1>フィードバック管理</h1>
        <p>ユーザーからの要望・不具合報告を確認し、返信できます。</p>
        <div className="auth-links">
          <Link className="secondary-button" href="/admin">
            管理トップへ戻る
          </Link>
        </div>
        {sp.success ? <p className="notice notice--success">{sp.success}</p> : null}
        {sp.error ? <p className="notice notice--error">{sp.error}</p> : null}
      </section>

      {/* フィルタ */}
      <section className="question-section">
        <article className="profile-card">
          <span className="section-label">Filter</span>
          <form className="admin-filter-bar" action="/admin/feedback" method="GET">
            <select name="filter" defaultValue={filter} className="admin-select">
              {filterOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button type="submit" className="secondary-button">
              絞り込み
            </button>
          </form>
          <p>{threads.length} 件のスレッド</p>
        </article>
      </section>

      <section className="split-section">
        {/* スレッド一覧（左） */}
        <article className="panel panel--soft">
          <p className="section-label">Threads</p>
          <h2>スレッド一覧</h2>
          <div className="question-list">
            {threads.length === 0 ? (
              <p>該当するスレッドはありません。</p>
            ) : (
              threads.map((t) => {
                const isSelected = t.id === selectedThreadId;
                const statusInfo = STATUS_LABELS[t.status] ?? STATUS_LABELS["未対応"];
                return (
                  <Link
                    key={t.id}
                    href={`/admin/feedback?filter=${encodeURIComponent(filter)}&thread=${t.id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <article
                      className={`question-item${isSelected ? " admin-user-card" : ""}`}
                      style={{
                        borderLeft: t.unread_admin ? "3px solid var(--color-accent, #6366f1)" : undefined,
                        opacity: t.status === "解決済み" ? 0.7 : 1
                      }}
                    >
                      <div className="question-meta">
                        <span>{CATEGORY_ICONS[t.category] ?? "📝"} {t.category}</span>
                        <span className={statusInfo.className}>{statusInfo.label}</span>
                        {t.unread_admin ? <span style={{ color: "var(--color-accent, #6366f1)", fontWeight: "bold" }}>●</span> : null}
                      </div>
                      <p style={{ fontWeight: t.unread_admin ? "bold" : "normal" }}>
                        {t.user_display_name} (@{t.user_username})
                      </p>
                      <p style={{ fontSize: "0.85em", opacity: 0.8 }}>
                        {t.last_message
                          ? t.last_message.length > 60
                            ? t.last_message.slice(0, 60) + "..."
                            : t.last_message
                          : "メッセージなし"}
                      </p>
                      <p style={{ fontSize: "0.75em", opacity: 0.6 }}>{formatTime(t.updated_at)}</p>
                    </article>
                  </Link>
                );
              })
            )}
          </div>
        </article>

        {/* スレッド詳細（右） */}
        <article className="panel panel--soft">
          <p className="section-label">Detail</p>
          <h2>スレッド詳細</h2>
          {!selectedThread ? (
            <p>左のスレッド一覧からスレッドを選択してください。</p>
          ) : (
            <>
              {/* スレッドヘッダー */}
              <div className="admin-user-header" style={{ marginBottom: "1rem" }}>
                <div>
                  <h3>
                    {CATEGORY_ICONS[selectedThread.category]} {selectedThread.category} — {selectedThread.user_display_name}
                  </h3>
                  <p>@{selectedThread.user_username}</p>
                </div>
                <span className={STATUS_LABELS[selectedThread.status]?.className ?? "badge-chip"}>
                  {selectedThread.status}
                </span>
              </div>

              {/* ステータス変更ボタン */}
              <div className="admin-actions" style={{ marginBottom: "1rem" }}>
                {(["未対応", "対応中", "解決済み"] as const).map((s) => (
                  <form key={s} action={adminUpdateThreadStatus} className="admin-inline-form">
                    <input type="hidden" name="threadId" value={selectedThread.id} />
                    <input type="hidden" name="status" value={s} />
                    <button
                      type="submit"
                      className="secondary-button"
                      disabled={selectedThread.status === s}
                    >
                      {s}
                    </button>
                  </form>
                ))}
              </div>

              {/* メッセージ一覧 */}
              <div className="question-list" style={{ maxHeight: "400px", overflowY: "auto" }}>
                {messages.length === 0 ? (
                  <p>メッセージはまだありません。</p>
                ) : (
                  messages.map((m) => (
                    <article
                      key={m.id}
                      className="question-item"
                      style={{
                        marginLeft: m.is_admin ? "2rem" : "0",
                        marginRight: m.is_admin ? "0" : "2rem",
                        borderLeft: m.is_admin
                          ? "3px solid var(--color-accent, #6366f1)"
                          : "3px solid var(--color-muted, #888)"
                      }}
                    >
                      <div className="question-meta">
                        <span style={{ fontWeight: "bold" }}>
                          {m.is_admin ? "管理者" : selectedThread.user_display_name}
                        </span>
                        <span>{formatTime(m.created_at)}</span>
                      </div>
                      <p style={{ whiteSpace: "pre-wrap" }}>{m.body}</p>
                    </article>
                  ))
                )}
              </div>

              {/* 返信フォーム */}
              <form action={adminReplyToThread} style={{ marginTop: "1rem" }}>
                <input type="hidden" name="threadId" value={selectedThread.id} />
                <textarea
                  name="body"
                  placeholder="管理者として返信..."
                  required
                  className="admin-search-input"
                  style={{ width: "100%", minHeight: "80px", resize: "vertical" }}
                />
                <div className="auth-links" style={{ marginTop: "0.5rem" }}>
                  <button type="submit" className="secondary-button">
                    返信を送信
                  </button>
                </div>
              </form>
            </>
          )}
        </article>
      </section>
    </main>
  );
}
