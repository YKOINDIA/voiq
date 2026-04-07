import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { addPoints } from "@/lib/points";

export type BadgeCategory = "voice_post" | "reaction" | "follower" | "question" | "streak";

type BadgeRow = {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  threshold: number;
};

export type UserBadge = BadgeRow & {
  earned_at: string;
};

const BADGE_BONUS_POINTS: Record<number, number> = {
  1: 10,
  2: 20,
  3: 50,
  4: 100,
  5: 200
};

function getBonusPoints(tierIndex: number): number {
  return BADGE_BONUS_POINTS[tierIndex] ?? 10;
}

async function countForCategory(
  userId: string,
  category: BadgeCategory,
  admin?: ReturnType<typeof getSupabaseAdminClient>
): Promise<number> {
  const sb = admin ?? getSupabaseAdminClient();

  if (category === "voice_post") {
    const { count, error } = await sb
      .from("voice_posts")
      .select("*", { count: "exact", head: true })
      .eq("author_id", userId);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  if (category === "reaction") {
    // Single query: count reactions on the user's posts via inner join filter
    const { count, error } = await sb
      .from("reactions")
      .select("voice_posts!inner(author_id)", { count: "exact", head: true })
      .eq("voice_posts.author_id", userId);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  if (category === "follower") {
    const { count, error } = await sb
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  if (category === "question") {
    const { count, error } = await sb
      .from("questions")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", userId);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  if (category === "streak") {
    // Fetch only distinct dates, already sorted descending
    const { data, error } = await sb
      .from("voice_posts")
      .select("created_at")
      .eq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return 0;

    // Deduplicate to calendar dates and walk backwards from most recent
    const seen = new Set<string>();
    const uniqueDays: string[] = [];
    for (const row of data) {
      const day = row.created_at.slice(0, 10);
      if (!seen.has(day)) {
        seen.add(day);
        uniqueDays.push(day);
      }
    }

    let streak = 1;
    for (let i = 1; i < uniqueDays.length; i++) {
      const prev = Date.parse(uniqueDays[i - 1]);
      const curr = Date.parse(uniqueDays[i]);
      if (prev - curr === 86_400_000) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  return 0;
}

export async function checkAndAwardBadges(
  userId: string,
  category: BadgeCategory
): Promise<{ name: string; icon: string }[]> {
  const admin = getSupabaseAdminClient();

  // Run all three independent queries in parallel (3 queries instead of 3 sequential)
  const [badgesResult, earnedResult, count] = await Promise.all([
    admin
      .from("badges")
      .select("*")
      .eq("category", category)
      .order("threshold"),
    admin
      .from("user_badges")
      .select("badge_id")
      .eq("user_id", userId),
    countForCategory(userId, category, admin)
  ]);

  if (badgesResult.error) throw new Error(badgesResult.error.message);
  if (earnedResult.error) throw new Error(earnedResult.error.message);

  const badges = badgesResult.data as BadgeRow[] | null;
  if (!badges || badges.length === 0) return [];

  const earnedIds = new Set((earnedResult.data ?? []).map((b) => b.badge_id));

  // Collect all newly earned badges
  const toAward: { badge: BadgeRow; tierIndex: number }[] = [];
  for (let i = 0; i < badges.length; i++) {
    const badge = badges[i];
    if (!earnedIds.has(badge.id) && count >= badge.threshold) {
      toAward.push({ badge, tierIndex: i + 1 });
    }
  }

  if (toAward.length === 0) return [];

  // Batch insert all new badges in one query
  const { error: insertError } = await admin
    .from("user_badges")
    .insert(toAward.map(({ badge }) => ({ user_id: userId, badge_id: badge.id })));

  if (insertError) throw new Error(insertError.message);

  // Sum bonus points and award in a single call
  const totalBonus = toAward.reduce((sum, { tierIndex }) => sum + getBonusPoints(tierIndex), 0);
  await addPoints(userId, totalBonus);

  return toAward.map(({ badge }) => ({ name: badge.name, icon: badge.icon }));
}

export async function getBadgesForUser(userId: string): Promise<UserBadge[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_badges")
    .select("badge_id, earned_at, badges(*)")
    .eq("user_id", userId)
    .order("earned_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const badge = Array.isArray(row.badges) ? row.badges[0] : row.badges;
    return {
      id: badge.id,
      name: badge.name,
      icon: badge.icon,
      description: badge.description,
      category: badge.category,
      threshold: badge.threshold,
      earned_at: row.earned_at
    };
  });
}
