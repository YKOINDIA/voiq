import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Voiq",
    short_name: "Voiq",
    description: "10秒で答える匿名音声質問箱",
    start_url: "/",
    display: "standalone",
    background_color: "#fffdf7",
    theme_color: "#fff7d6",
    lang: "ja",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable"
      }
    ]
  };
}
