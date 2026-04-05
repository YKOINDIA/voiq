import type { User } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_premium: boolean;
  badge: string | null;
  title: string | null;
  points: number;
  created_at: string;
  updated_at: string;
};

function buildUsername(user: User) {
  const emailPrefix = user.email?.split("@")[0] ?? "voiq";
  const normalized = emailPrefix
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 12);

  return `${normalized || "voiq"}_${user.id.slice(0, 6)}`;
}

export function buildProfileSeed(user: User) {
  return {
    id: user.id,
    username: buildUsername(user),
    display_name: user.user_metadata.display_name ?? user.email?.split("@")[0] ?? "Voiq user"
  };
}

export async function ensureProfileForUser(user: User) {
  const admin = getSupabaseAdminClient();
  const seed = buildProfileSeed(user);

  const { data, error } = await admin
    .from("profiles")
    .upsert(
      seed,
      {
        onConflict: "id"
      }
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Profile;
}

export async function getProfileById(id: string) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("profiles").select("*").eq("id", id).single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Profile;
}
