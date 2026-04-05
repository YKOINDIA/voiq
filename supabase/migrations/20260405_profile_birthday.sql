-- プロフィールに生年月日カラムを追加
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birthday date;
