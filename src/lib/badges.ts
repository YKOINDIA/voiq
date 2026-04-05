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

async function countForCategory(userId: string, category: BadgeCategory): Promise<number> {
  const admin = getSupabaseAdminClient();

  if (category === "voice_post") {
    const { count, error } = await admin
      .from("voice_posts")
      .select("*", { count: "exact", head: true })
      .eq("author_id", userId);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  if (category === "reaction") {
    const { data: postIds, error: postError } = await admin
      .from("voice_posts")
      .select("id")
      .eq("author_id", userId);
    if (postError) throw new Error(postError.message);
    if (!postIds || postIds.length === 0) return 0;
    const { count, error } = await admin
      .from("reactions")
      .select("*", { count: "exact", head: true })
      .in(
        "voice_post_id",
        postIds.map((p) => p.id)
      );
    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  if (category === "follower") {
    const { count, error } = await admin
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  if (category === "question") {
    const { count, error } = await admin
      .from("questions")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", userId);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  if (category === "streak") {
    const { data, error } = await admin
      .from("voice_posts")
      .select("created_at")
      .eq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return 0;

    const days = new Set(
      data.map((row) => new Date(row.created_at).toISOString().slice(0, 10))
    );
    const sorted = [...days].sort().reverse();
    let streak = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]);
      const curr = new Date(sorted[i]);
      const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
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

  const { data: badges, error: badgesError } = await admin
    .from("badges")
    .select("*")
    .eq("category", category)
    .order("threshold");
  if (badgesError) throw new Error(badgesError.message);
  if (!badges || badges.length === 0) return [];

  const { data: earned, error: earnedError } = await admin
    .from("user_badges")
    .select("badge_id")
    .eq("user_id", userId);
  if (earnedError) throw new Error(earnedError.message);
  const earnedIds = new Set((earned ?? []).map((b) => b.badge_id));

  const count = await countForCategory(userId, category);
  const newBadges: { name: string; icon: string }[] = [];

  for (let i = 0; i < (badges as BadgeRow[]).length; i++) {
    const badge = (badges as BadgeRow[])[i];
    if (!earnedIds.has(badge.id) && count >= badge.threshold) {
      const { error: insertError } = await admin
        .from("user_badges")
        .insert({ user_id: userId, badge_id: badge.id });
      if (!insertError) {
        const bonus = getBonusPoints(i + 1);
        await addPoints(userId, bonus);
        newBadges.push({ name: badge.name, icon: badge.icon });
      }
    }
  }

  return newBadges;
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
