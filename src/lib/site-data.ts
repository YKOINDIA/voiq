export type Feature = {
  title: string;
  description: string;
  badge: string;
};

export type Ranking = {
  category: string;
  label: string;
  accent: string;
};

export const features: Feature[] = [
  {
    badge: "10秒投稿",
    title: "一言で残せるボイス回答",
    description:
      "無料ユーザーは10秒まで。思いついた瞬間に録って、そのまま流せる軽さを最優先にした設計です。"
  },
  {
    badge: "24時間で消去",
    title: "今しか聴けないライブ感",
    description:
      "無料投稿は24時間で自動消去。保存の不安とストレージ負荷を抑えながら、再訪したくなる希少性を作ります。"
  },
  {
    badge: "匿名ボイス",
    title: "地声を出さずに答えられる",
    description:
      "高め・低め・フラットなどの匿名ボイスに変換して投稿。身バレの怖さを下げて、発信の心理ハードルを下げます。"
  },
  {
    badge: "シェア動画",
    title: "波形アニメでSNS拡散しやすい",
    description:
      "Instagram や X 向けに、音声に合わせて動くオーディオグラムを自動生成。音声コンテンツでもタイムライン映えを狙えます。"
  },
  {
    badge: "聞き専リアクション",
    title: "拍手や笑い声をワンタップ送信",
    description:
      "声で返すのが苦手な人も、SEリアクションなら参加しやすい。再生数だけでは見えない熱量を残せます。"
  },
  {
    badge: "ランキング",
    title: "声そのものに価値がつく",
    description:
      "良い声、モノマネ、動物の鳴き声までカテゴリ別に評価。声の個性がフォローや称号につながる導線を持たせます。"
  }
];

export const rankingSamples: Ranking[] = [
  { category: "良い声", label: "眠れる低音", accent: "sky" },
  { category: "特徴ある声", label: "一度聴くと忘れない", accent: "mint" },
  { category: "モノマネ", label: "似すぎて笑う", accent: "peach" },
  { category: "動物の鳴き声", label: "本物判定 98%", accent: "lemon" },
  { category: "色気ボイス", label: "深夜に伸びる声", accent: "rose" }
];

export const plans = [
  {
    tier: "無料",
    price: "¥0",
    items: ["最大10秒の録音", "24時間で自動消去", "匿名ボイス: 地声・高・低", "質問投稿はログイン不要"]
  },
  {
    tier: "Premium",
    price: "¥980 / 月",
    items: ["最大60秒の録音", "無期限保存 + アーカイブ", "特殊ボイス追加: ロボットなど", "ランキング優先表示と限定バッジ"]
  }
];

export const launchSteps = [
  "Supabase Auth でメールログインとプロフィールを実装",
  "Supabase Storage に 10秒 AAC 音声を保存し、24時間削除ジョブを組む",
  "Stripe で Premium を有効化し、60秒投稿とアーカイブを開放",
  "Gemini API で音声要約・タイトル案・安全性補助を追加",
  "Sentry / GA4 / Resend を組み込み、運用と通知を安定化"
];
