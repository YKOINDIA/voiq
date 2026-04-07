"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type FeedbackChatProps = {
  userId: string;
  onClose: () => void;
};

type FeedbackThread = {
  id: string;
  user_id: string;
  category: string;
  status: string;
  last_message: string | null;
  unread_user: boolean;
  unread_admin: boolean;
  created_at: string;
  updated_at: string;
};

type FeedbackMessage = {
  id: string;
  thread_id: string;
  is_admin: boolean;
  body: string;
  created_at: string;
};

const CATEGORIES = [
  { value: "要望", label: "💡 要望" },
  { value: "不具合", label: "🐛 不具合" },
  { value: "質問", label: "❓ 質問" },
  { value: "その他", label: "💬 その他" },
] as const;

const CATEGORY_EMOJI: Record<string, string> = {
  要望: "💡",
  不具合: "🐛",
  質問: "❓",
  その他: "💬",
};

const STATUS_CLASS: Record<string, string> = {
  未対応: "fb-thread-status--pending",
  対応中: "fb-thread-status--active",
  解決済み: "fb-thread-status--resolved",
};

type View = "list" | "new" | "detail";

export function FeedbackChat({ userId, onClose }: FeedbackChatProps) {
  const supabase = getSupabaseBrowserClient();

  const [view, setView] = useState<View>("list");
  const [threads, setThreads] = useState<FeedbackThread[]>([]);
  const [loading, setLoading] = useState(true);

  // New thread form
  const [newCategory, setNewCategory] = useState("要望");
  const [newMessage, setNewMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Thread detail
  const [activeThread, setActiveThread] = useState<FeedbackThread | null>(null);
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load threads
  const loadThreads = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("feedback_threads")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    setThreads(data ?? []);
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Open a thread
  async function openThread(thread: FeedbackThread) {
    setActiveThread(thread);
    setView("detail");
    setReplyText("");

    // Load messages
    const { data } = await supabase
      .from("feedback_messages")
      .select("*")
      .eq("thread_id", thread.id)
      .order("created_at", { ascending: true });
    setMessages(data ?? []);

    // Mark as read
    if (thread.unread_user) {
      await supabase
        .from("feedback_threads")
        .update({ unread_user: false })
        .eq("id", thread.id);
      setThreads((prev) =>
        prev.map((t) => (t.id === thread.id ? { ...t, unread_user: false } : t))
      );
    }
  }

  // Create new thread
  async function handleCreateThread(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || submitting) return;
    setSubmitting(true);

    const { data: thread, error: threadErr } = await supabase
      .from("feedback_threads")
      .insert({
        user_id: userId,
        category: newCategory,
        status: "未対応",
        last_message: newMessage.trim(),
        unread_user: false,
        unread_admin: true,
      })
      .select()
      .single();

    if (threadErr || !thread) {
      setSubmitting(false);
      return;
    }

    await supabase.from("feedback_messages").insert({
      thread_id: thread.id,
      is_admin: false,
      body: newMessage.trim(),
    });

    // Award points
    try {
      await fetch("/api/feedback/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, threadId: thread.id }),
      });
    } catch {
      // Points award is non-critical
    }

    setNewMessage("");
    setNewCategory("要望");
    setSubmitting(false);
    await loadThreads();
    setView("list");
  }

  // Send reply
  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim() || sending || !activeThread) return;
    setSending(true);

    const body = replyText.trim();

    await supabase.from("feedback_messages").insert({
      thread_id: activeThread.id,
      is_admin: false,
      body,
    });

    await supabase
      .from("feedback_threads")
      .update({
        last_message: body,
        updated_at: new Date().toISOString(),
        unread_admin: true,
      })
      .eq("id", activeThread.id);

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        thread_id: activeThread.id,
        is_admin: false,
        body,
        created_at: new Date().toISOString(),
      },
    ]);

    setReplyText("");
    setSending(false);

    // Update thread in list
    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeThread.id
          ? { ...t, last_message: body, updated_at: new Date().toISOString() }
          : t
      )
    );
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const isResolved = activeThread?.status === "解決済み";

  return (
    <div className="fb-overlay" onClick={onClose}>
      <div className="fb-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="fb-header">
          {view !== "list" && (
            <button
              className="fb-header__back"
              onClick={() => {
                setView("list");
                setActiveThread(null);
              }}
            >
              ←
            </button>
          )}
          <h2 className="fb-header__title">
            {view === "list" && "フィードバック"}
            {view === "new" && "新しいフィードバック"}
            {view === "detail" && activeThread
              ? `${CATEGORY_EMOJI[activeThread.category] ?? "💬"} ${activeThread.category}`
              : ""}
          </h2>
          <button className="fb-header__close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* List View */}
        {view === "list" && (
          <div className="fb-list">
            <button
              className="fb-new-btn"
              onClick={() => setView("new")}
            >
              + 新しいフィードバックを送る
            </button>

            {loading && <p className="fb-loading">読み込み中...</p>}

            {!loading && threads.length === 0 && (
              <p className="fb-empty">まだフィードバックはありません</p>
            )}

            {threads.map((thread) => (
              <button
                key={thread.id}
                className={`fb-thread-item${thread.unread_user ? " fb-thread-item--unread" : ""}`}
                onClick={() => openThread(thread)}
              >
                <div className="fb-thread-item__top">
                  <span className="fb-thread-item__category">
                    {CATEGORY_EMOJI[thread.category] ?? "💬"}{" "}
                    {thread.category}
                  </span>
                  <span
                    className={`fb-thread-status ${STATUS_CLASS[thread.status] ?? ""}`}
                  >
                    {thread.status}
                  </span>
                </div>
                {thread.last_message && (
                  <div className="fb-thread-item__preview">
                    {thread.last_message.slice(0, 80)}
                    {thread.last_message.length > 80 ? "..." : ""}
                  </div>
                )}
                <div className="fb-thread-item__date">
                  {formatDate(thread.updated_at)}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* New Thread View */}
        {view === "new" && (
          <form className="fb-new-form" onSubmit={handleCreateThread}>
            <label className="fb-new-form__label">
              カテゴリ
              <select
                className="fb-new-form__select"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="fb-new-form__label">
              メッセージ
              <textarea
                className="fb-new-form__textarea"
                rows={6}
                placeholder="ご意見・ご要望をお聞かせください..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                required
              />
            </label>

            <button
              type="submit"
              className="fb-new-form__submit"
              disabled={submitting || !newMessage.trim()}
            >
              {submitting ? "送信中..." : "送信する（+5ポイント）"}
            </button>
          </form>
        )}

        {/* Thread Detail View */}
        {view === "detail" && activeThread && (
          <>
            <div className="fb-chat">
              <div className="fb-chat__meta">
                <span className="fb-thread-item__category">
                  {CATEGORY_EMOJI[activeThread.category] ?? "💬"}{" "}
                  {activeThread.category}
                </span>
                <span
                  className={`fb-thread-status ${STATUS_CLASS[activeThread.status] ?? ""}`}
                >
                  {activeThread.status}
                </span>
              </div>

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`fb-message ${
                    msg.is_admin ? "fb-message--admin" : "fb-message--user"
                  }`}
                >
                  <div className="fb-message__sender">
                    {msg.is_admin ? "運営" : "あなた"}
                  </div>
                  <div className="fb-message__body">{msg.body}</div>
                  <div className="fb-message__time">
                    {formatDate(msg.created_at)}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form className="fb-reply-bar" onSubmit={handleSendReply}>
              {isResolved ? (
                <p className="fb-reply-bar__resolved">
                  このスレッドは解決済みです
                </p>
              ) : (
                <>
                  <input
                    className="fb-reply-bar__input"
                    type="text"
                    placeholder="返信を入力..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    className="fb-reply-bar__send"
                    disabled={sending || !replyText.trim()}
                  >
                    送信
                  </button>
                </>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
