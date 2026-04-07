import { ImageResponse } from "next/og";
import { getProfileByUsername } from "@/lib/questions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ username: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { username } = await context.params;

  let displayName = `@${username}`;
  let bio = "声で答える質問箱 — 10秒のひとことボイスで返事が届きます";

  try {
    const profile = await getProfileByUsername(username);
    displayName = profile.display_name ?? `@${profile.username ?? username}`;
    if (profile.bio) {
      bio = profile.bio.length > 80 ? `${profile.bio.slice(0, 78)}…` : profile.bio;
    }
  } catch {
    // 未登録ユーザーでもデフォルト画像を返す
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background:
            "linear-gradient(135deg, #fff7d6 0%, #ffe9b0 45%, #ffd6a3 100%)",
          fontFamily: "system-ui, sans-serif",
          color: "#1f1b16"
        }}
      >
        {/* Header brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "88px",
              height: "88px",
              borderRadius: "24px",
              background: "linear-gradient(135deg, #ffb347, #ff7f50)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "52px",
              fontWeight: 700,
              boxShadow: "0 12px 24px rgba(255, 140, 80, 0.3)"
            }}
          >
            V
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "44px", fontWeight: 700, lineHeight: 1 }}>Voiq</span>
            <span style={{ fontSize: "24px", color: "#7a6a55", marginTop: "6px" }}>
              voice question box
            </span>
          </div>
        </div>

        {/* Main copy */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <span style={{ fontSize: "32px", color: "#8a7558", letterSpacing: "0.04em" }}>
            🎙 声で質問してみよう
          </span>
          <span style={{ fontSize: "76px", fontWeight: 800, lineHeight: 1.1 }}>
            {displayName}
          </span>
          <span style={{ fontSize: "30px", color: "#3a3128", lineHeight: 1.4, maxWidth: "920px" }}>
            {bio}
          </span>
        </div>

        {/* Footer waveform + URL */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "32px"
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "72px" }}>
            {[28, 52, 36, 64, 44, 70, 30, 58, 40, 66, 34, 50, 28, 60, 38].map((h, i) => (
              <div
                key={i}
                style={{
                  width: "12px",
                  height: `${h}px`,
                  borderRadius: "8px",
                  background: "linear-gradient(180deg, #ff8c42, #ffb347)"
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: "26px", color: "#7a6a55" }}>voiq-gold.vercel.app/ask/{username}</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630
    }
  );
}
