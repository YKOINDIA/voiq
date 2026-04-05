import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const LEVEL_TITLES = [
  { level: 1, title: "ビギナーボイス", points: 0, color: "#888" },
  { level: 2, title: "レギュラーボイス", points: 30, color: "#888" },
  { level: 3, title: "アクティブボイス", points: 80, color: "#2ecc8a" },
  { level: 4, title: "トレンドボイス", points: 150, color: "#2ecc8a" },
  { level: 5, title: "ベテランボイス", points: 250, color: "#3498db" },
  { level: 6, title: "エキスパートボイス", points: 400, color: "#3498db" },
  { level: 7, title: "エリートボイス", points: 600, color: "#9b59b6" },
  { level: 8, title: "トップボイス", points: 900, color: "#9b59b6" },
  { level: 9, title: "マスターボイス", points: 1300, color: "#f0c040" },
  { level: 10, title: "グランドマスター", points: 2000, color: "#f0c040" },
  { level: 11, title: "レジェンドボイス", points: 3000, color: "#ff4444" },
  { level: 12, title: "伝説のボイス", points: 4500, color: "#ff4444" }
] as const;

export type LevelInfo = (typeof LEVEL_TITLES)[number];

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
