-- ============================================================
-- Voiq ポイント・バッジ・レベルシステム
-- ============================================================

-- 1. profiles に points カラム追加
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0;

-- 2. バッジマスターテーブル
CREATE TABLE IF NOT EXISTS public.badges (
  id text PRIMARY KEY,
  name text NOT NULL,
  icon text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  threshold integer NOT NULL DEFAULT 1
);

-- 3. ユーザー取得バッジテーブル
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id text NOT NULL REFERENCES public.badges(id),
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- 4. ポイント加算 RPC（競合安全）
CREATE OR REPLACE FUNCTION public.increment_points(uid uuid, pts integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles SET points = points + pts WHERE id = uid;
END;
$$;

-- 5. RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "badges_read_all" ON public.badges;
CREATE POLICY "badges_read_all"
  ON public.badges FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "user_badges_read_all" ON public.user_badges;
CREATE POLICY "user_badges_read_all"
  ON public.user_badges FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "user_badges_insert_own" ON public.user_badges;
CREATE POLICY "user_badges_insert_own"
  ON public.user_badges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 6. バッジ初期データ（5カテゴリ × 5段階）
-- ============================================================

INSERT INTO public.badges (id, name, icon, description, category, threshold) VALUES
  -- 音声回答投稿数
  ('voice_post_1',   'ファーストボイス',     '🎙️', '初めての音声回答を投稿',       'voice_post',  1),
  ('voice_post_5',   'アクティブボイス',     '🗣️', '音声回答を5件投稿',            'voice_post',  5),
  ('voice_post_20',  'ボイスマスター',       '🎤', '音声回答を20件投稿',           'voice_post', 20),
  ('voice_post_50',  'ボイスエキスパート',   '⭐', '音声回答を50件投稿',           'voice_post', 50),
  ('voice_post_100', 'ボイスレジェンド',     '👑', '音声回答を100件投稿',          'voice_post', 100),

  -- 受け取ったリアクション総数
  ('reaction_10',   'リアクションデビュー',   '👏', 'リアクションを10件獲得',       'reaction',   10),
  ('reaction_50',   'リアクション上手',       '🔥', 'リアクションを50件獲得',       'reaction',   50),
  ('reaction_200',  'リアクションマスター',   '💎', 'リアクションを200件獲得',      'reaction',  200),
  ('reaction_500',  'リアクションスター',     '🌟', 'リアクションを500件獲得',      'reaction',  500),
  ('reaction_1000', 'リアクションキング',     '🏆', 'リアクションを1000件獲得',     'reaction', 1000),

  -- フォロワー数
  ('follower_1',   'はじめてのフォロワー',    '🤝', 'フォロワーを1人獲得',          'follower',    1),
  ('follower_10',  '人気ボイス',              '📢', 'フォロワーを10人獲得',         'follower',   10),
  ('follower_50',  'インフルエンサー',        '📣', 'フォロワーを50人獲得',         'follower',   50),
  ('follower_100', 'トップインフルエンサー',  '🎖️', 'フォロワーを100人獲得',        'follower',  100),
  ('follower_500', 'カリスマボイス',          '👑', 'フォロワーを500人獲得',        'follower',  500),

  -- 受け取った質問数
  ('question_1',   'はじめての質問',          '❓', '質問を1件受け取った',          'question',    1),
  ('question_10',  '質問が集まる人',          '💬', '質問を10件受け取った',         'question',   10),
  ('question_50',  '質問マグネット',          '🧲', '質問を50件受け取った',         'question',   50),
  ('question_100', '質問殺到',                '📬', '質問を100件受け取った',        'question',  100),
  ('question_500', '質問の嵐',                '🌪️', '質問を500件受け取った',        'question',  500),

  -- 連続回答日数
  ('streak_3',  '3日連続回答',                '🔥', '3日連続で音声回答を投稿',      'streak',  3),
  ('streak_7',  '1週間連続回答',              '📅', '7日連続で音声回答を投稿',      'streak',  7),
  ('streak_14', '2週間連続回答',              '💪', '14日連続で音声回答を投稿',     'streak', 14),
  ('streak_30', '1ヶ月連続回答',              '🏅', '30日連続で音声回答を投稿',     'streak', 30),
  ('streak_60', '60日連続回答',               '🏆', '60日連続で音声回答を投稿',     'streak', 60)
ON CONFLICT (id) DO NOTHING;
