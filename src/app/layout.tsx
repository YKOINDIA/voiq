import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voiq | 10秒で答える音声質問箱",
  description:
    "質問箱の気軽さをそのままに、10秒ボイスで答えられる匿名音声サービス。24時間で消える一言投稿と匿名ボイスで、声のハードルを下げる。",
  manifest: "/manifest.webmanifest",
  applicationName: "Voiq",
  keywords: ["Voiq", "音声質問箱", "匿名ボイス", "PWA", "Next.js"],
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

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
