import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const LEVEL_TITLES = [
  { level: 1, title: "ビギナーボイス", points: 0, color: "#aaa", description: "Voiq に登録したばかり。まずは最初の一声を投稿してみよう。" },
  { level: 2, title: "レギュラーボイス", points: 30, color: "#888", description: "投稿やリアクションに慣れてきた段階。質問を集めてどんどん答えよう。" },
  { level: 3, title: "アクティブボイス", points: 80, color: "#2ecc8a", description: "コンスタントに回答を続けている活発なユーザー。" },
  { level: 4, title: "トレンドボイス", points: 150, color: "#2ecc8a", description: "リアクションが集まり始め、注目度が上がってきた声の持ち主。" },
  { level: 5, title: "ベテランボイス", points: 250, color: "#3498db", description: "安定した投稿と反応を維持している実力派。" },
  { level: 6, title: "エキスパートボイス", points: 400, color: "#3498db", description: "フォロワーやリアクションが厚く、質問も途切れない人気クリエイター。" },
  { level: 7, title: "エリートボイス", points: 600, color: "#9b59b6", description: "ランキング常連クラス。声の個性がしっかり認知されている。" },
  { level: 8, title: "トップボイス", points: 900, color: "#9b59b6", description: "Voiq 内でも上位に位置する影響力のあるボイス。" },
  { level: 9, title: "マスターボイス", points: 1300, color: "#f0c040", description: "圧倒的な投稿量とリアクションを誇るマスタークラス。" },
  { level: 10, title: "グランドマスター", points: 2000, color: "#f0c040", description: "Voiq コミュニティを代表する存在。声だけで人を集められるレベル。" },
  { level: 11, title: "レジェンドボイス", points: 3000, color: "#ff4444", description: "伝説級の活動量。Voiq の歴史に名を刻む声の持ち主。" },
  { level: 12, title: "伝説のボイス", points: 4500, color: "#ff4444", description: "到達者はごくわずか。Voiq における最高の称号。" }
] as const;

export type LevelInfo = (typeof LEVEL_TITLES)[number];

export function getAllLevels(): readonly LevelInfo[] {
  return LEVEL_TITLES;
}

export function getLevelFromPoints(pts: number): LevelInfo {
  let current: LevelInfo = LEVEL_TITLES[0];
  for (const tier of LEVEL_TITLES) {
    if (pts >= tier.points) {
      current = tier;
    }
  }
  return current;
}

export function getNextLevel(pts: number): LevelInfo | null {
  const current = getLevelFromPoints(pts);
  return LEVEL_TITLES.find((tier) => tier.level === current.level + 1) ?? null;
}

export function getLevelProgress(pts: number) {
  const current = getLevelFromPoints(pts);
  const next = getNextLevel(pts);
  if (!next) {
    return { current, next: null, progress: 1 };
  }
  const range = next.points - current.points;
  const earned = pts - current.points;
  return { current, next, progress: range > 0 ? earned / range : 1 };
}

export async function addPoints(userId: string, pts: number): Promise<void> {
  const admin = getSupabaseAdminClient();
  const { error } = await admin.rpc("increment_points", { uid: userId, pts });
  if (error) {
    throw new Error(error.message);
  }
}
