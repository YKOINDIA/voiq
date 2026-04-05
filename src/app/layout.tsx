import type { Metadata, Viewport } from "next";
import { AppHeader } from "@/components/app-header";
import { getAdminEmails } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voiq | 10秒で答える音声質問箱",
  description:
    "質問箱の気軽さをそのままに、10秒ボイスで答えられる匿名音声サービス。24時間で消える一言投稿と匿名ボイスで、声のハードルを下げる。",
  manifest: "/manifest.webmanifest",
  applicationName: "Voiq",
  keywords: ["Voiq", "音声質問箱", "匿名ボイス", "PWA", "Next.js", "Supabase"],
  openGraph: {
    title: "Voiq | 10秒で答える音声質問箱",
    description:
      "10秒で答える。24時間で消える。匿名ボイスで投稿できる、質問箱ユーザー向けの音声版サービス。",
    siteName: "Voiq",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Voiq | 10秒で答える音声質問箱",
    description:
      "質問箱の軽さを音声に。匿名ボイス、波形シェア、SEリアクション、声ランキングを備えた Voiq。"
  }
};

export const viewport: Viewport = {
  themeColor: "#fff7d6"
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();
  const email = session?.user.email?.toLowerCase() ?? "";
  const isAdmin = getAdminEmails().includes(email);

  let avatarUrl: string | null = null;
  let displayName: string | null = null;

  if (session) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url, display_name")
      .eq("id", session.user.id)
      .maybeSingle();
    avatarUrl = profile?.avatar_url ?? null;
    displayName = profile?.display_name ?? null;
  }

  return (
    <html lang="ja">
      <body>
        <AppHeader
          isSignedIn={Boolean(session)}
          isAdmin={isAdmin}
          avatarUrl={avatarUrl}
          displayName={displayName}
        />
        {children}
      </body>
    </html>
  );
}
