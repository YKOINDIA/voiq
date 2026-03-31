import { redirect } from "next/navigation";
import { buildProfileSeed, type Profile } from "@/lib/profiles";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getOrCreateProfileForCurrentUser() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/sign-in?error=先にログインしてください");
  }

  const { data: initialProfile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();
  let profile = initialProfile;

  if (profileError) {
    redirect(`/sign-in?error=${encodeURIComponent(profileError.message)}`);
  }

  if (!profile) {
    const seed = buildProfileSeed(session.user);
    const insertResult = await supabase.from("profiles").insert(seed);

    if (insertResult.error) {
      redirect(`/sign-in?error=${encodeURIComponent(insertResult.error.message)}`);
    }

    const reloadResult = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (reloadResult.error) {
      redirect(`/sign-in?error=${encodeURIComponent(reloadResult.error.message)}`);
    }

    profile = reloadResult.data;
  }

  return {
    session,
    profile: profile as Profile
  };
}
