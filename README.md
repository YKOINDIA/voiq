# Voiq

10秒で答える、匿名音声の質問箱サービスです。質問箱の軽さを音声に持ち込み、24時間で消える一言投稿、匿名ボイス、波形シェア、聞き専リアクション、声ランキングを中核体験として設計しています。

## Stack

- Next.js 15
- TypeScript
- Supabase / Supabase Storage
- Stripe
- Gemini API
- Google Analytics 4
- Sentry
- Resend
- Vercel

## Local Setup

1. `npm install`
2. `.env.example` を元に `.env.local` を作成
3. `npm run dev`

## Environment Variables

最低限、以下を設定すると Supabase 連携の実装を進めやすいです。

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `RESEND_API_KEY`
- `SENTRY_DSN`
- `GEMINI_API_KEY`

## Current Status

- ランディングページ実装済み
- ログイン導線ページとダッシュボード骨格を追加済み
- Supabase 用の browser/server client 初期化を追加済み
- README と env テンプレートを整備済み

## Next Steps

1. Supabase Auth の Magic Link ログインを実装
2. `profiles`, `questions`, `voice_posts`, `reactions` テーブルを設計
3. Supabase Storage へ音声アップロードを実装
4. 24時間自動削除と Premium 永続保存の分岐を実装
5. Stripe で Premium 解放
