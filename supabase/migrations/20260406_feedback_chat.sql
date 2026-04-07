-- ============================================================
-- フィードバックチャット（要望・不具合報告）
-- ============================================================

-- 1. スレッドテーブル
CREATE TABLE IF NOT EXISTS public.feedback_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('要望', '不具合', '質問', 'その他')),
  status text NOT NULL DEFAULT '未対応' CHECK (status IN ('未対応', '対応中', '解決済み')),
  last_message text,
  unread_admin boolean NOT NULL DEFAULT true,
  unread_user boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. メッセージテーブル
CREATE TABLE IF NOT EXISTS public.feedback_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.feedback_threads(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. インデックス
CREATE INDEX IF NOT EXISTS idx_feedback_threads_user_id ON public.feedback_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_threads_status ON public.feedback_threads(status);
CREATE INDEX IF NOT EXISTS idx_feedback_messages_thread_created ON public.feedback_messages(thread_id, created_at);

-- 4. updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION public.update_feedback_thread_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_feedback_threads_updated_at ON public.feedback_threads;
CREATE TRIGGER trg_feedback_threads_updated_at
  BEFORE UPDATE ON public.feedback_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_feedback_thread_updated_at();

-- 5. RLS
ALTER TABLE public.feedback_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_messages ENABLE ROW LEVEL SECURITY;

-- スレッド: ユーザーは自分のスレッドのみ参照可能
DROP POLICY IF EXISTS "feedback_threads_select_own" ON public.feedback_threads;
CREATE POLICY "feedback_threads_select_own"
  ON public.feedback_threads FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- スレッド: ユーザーは自分のスレッドのみ作成可能
DROP POLICY IF EXISTS "feedback_threads_insert_own" ON public.feedback_threads;
CREATE POLICY "feedback_threads_insert_own"
  ON public.feedback_threads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- スレッド: ユーザーは自分のスレッドのみ更新可能（既読フラグ等）
DROP POLICY IF EXISTS "feedback_threads_update_own" ON public.feedback_threads;
CREATE POLICY "feedback_threads_update_own"
  ON public.feedback_threads FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- メッセージ: ユーザーは自分のスレッドのメッセージのみ参照可能
DROP POLICY IF EXISTS "feedback_messages_select_own" ON public.feedback_messages;
CREATE POLICY "feedback_messages_select_own"
  ON public.feedback_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.feedback_threads t
      WHERE t.id = thread_id AND t.user_id = auth.uid()
    )
  );

-- メッセージ: ユーザーは自分のスレッドにのみ投稿可能
DROP POLICY IF EXISTS "feedback_messages_insert_own" ON public.feedback_messages;
CREATE POLICY "feedback_messages_insert_own"
  ON public.feedback_messages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.feedback_threads t
      WHERE t.id = thread_id AND t.user_id = auth.uid()
    )
  );
