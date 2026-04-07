import { redirect } from "next/navigation";
import { SignInForm } from "@/components/sign-in-form";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type SignInPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
    mode?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const sp = (await searchParams) ?? {};
  const supabase = await getSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="signin-shell">
      <div className="signin-card">
        <div className="signin-brand">
          <h1>Voiq</h1>
          <p>10秒で答える音声の質問箱</p>
        </div>

        <SignInForm
          error={sp.error ?? null}
          success={sp.success ?? null}
          initialMode={sp.mode === "signup" ? "signup" : "signin"}
        />
      </div>
    </main>
  );
}
