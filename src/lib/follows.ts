import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type FollowStats = {
  followers: number;
  following: number;
};

export async function getFollowStats(profileId: string): Promise<FollowStats> {
  const admin = getSupabaseAdminClient();

  const [{ count: followers, error: followersError }, { count: following, error: followingError }] =
    await Promise.all([
      admin.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profileId),
      admin.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profileId)
    ]);

  if (followersError) {
    throw new Error(followersError.message);
  }

  if (followingError) {
    throw new Error(followingError.message);
  }

  return {
    followers: followers ?? 0,
    following: following ?? 0
  };
}

export async function isFollowingProfile(followerId: string, followingId: string) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}
