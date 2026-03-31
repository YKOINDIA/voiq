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
- `CRON_SECRET`

## Current Status

- ランディングページ実装済み
- メール + パスワード認証に対応済み
- ダッシュボードをログイン保護ページとして実装済み
- `profiles` の自動作成とプロフィール編集画面を実装済み
- 公開質問ページと質問 inbox 表示を実装済み
- 10秒音声回答の録音、Storage 保存、回答一覧を実装済み
- 24時間で期限切れ音声を削除する cron route を実装済み
- Free / Premium で録音秒数と保存期限が分岐するように実装済み

## Next Steps

1. Stripe で Premium を解放
2. 音声投稿と質問を紐づける回答フローを磨く
3. オーディオグラムとリアクション SE を実装
4. 匿名ボイス変換を実装
5. ランキング導線を追加
