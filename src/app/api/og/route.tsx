import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const creator = searchParams.get("creator") ?? "Voiq user";
  const question = searchParams.get("q") ?? "";
  const level = searchParams.get("level") ?? "Lv.1";
  const levelColor = searchParams.get("color") ?? "#888";
  const duration = searchParams.get("duration") ?? "10";
  const mode = searchParams.get("mode") ?? "地声";
  const reactions = searchParams.get("reactions") ?? "0";

  // 波形バーを擬似的に生成
  const barHeights = Array.from({ length: 32 }, (_, i) => {
    const seed = (creator.charCodeAt(i % creator.length) + i * 17) % 100;
    return 30 + seed * 0.7;
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #fffdf7 0%, #fff7d6 50%, #ffe8c8 100%)",
          padding: "48px 56px",
          fontFamily: "sans-serif"
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #ff7a59, #f0c040)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "28px",
              fontWeight: 800
            }}
          >
            V
          </div>
          <span style={{ fontSize: "24px", fontWeight: 700, color: "#333" }}>Voiq</span>
          <span style={{ fontSize: "18px", color: "#888", marginLeft: "4px" }}>10秒で答える音声質問箱</span>
        </div>

        {/* Question */}
        {question ? (
          <div
            style={{
              fontSize: "26px",
              color: "#555",
              marginBottom: "20px",
              lineHeight: 1.5,
              maxHeight: "80px",
              overflow: "hidden"
            }}
          >
            Q. {question.slice(0, 80)}{question.length > 80 ? "..." : ""}
          </div>
        ) : null}

        {/* Creator + Level */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px" }}>
          <span style={{ fontSize: "36px", fontWeight: 800, color: "#1a1a1a" }}>{creator}</span>
          <span
            style={{
              padding: "6px 18px",
              borderRadius: "999px",
              backgroundColor: levelColor,
              color: "white",
              fontSize: "18px",
              fontWeight: 700
            }}
          >
            {level}
          </span>
        </div>

        {/* Waveform */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "8px",
            height: "140px",
            padding: "20px 24px",
            borderRadius: "24px",
            background: "rgba(21, 25, 36, 0.92)",
            marginBottom: "28px"
          }}
        >
          {barHeights.map((h, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${h}%`,
                borderRadius: "999px",
                background: `linear-gradient(180deg, #ffd9a1, #ff7a59)`
              }}
            />
          ))}
        </div>

        {/* Footer meta */}
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <span
            style={{
              padding: "8px 18px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.85)",
              border: "1px solid #e0d6c8",
              fontSize: "18px",
              fontWeight: 600,
              color: "#333"
            }}
          >
            {mode}
          </span>
          <span
            style={{
              padding: "8px 18px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.85)",
              border: "1px solid #e0d6c8",
              fontSize: "18px",
              fontWeight: 600,
              color: "#333"
            }}
          >
            {duration}秒
          </span>
          <span
            style={{
              padding: "8px 18px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.85)",
              border: "1px solid #e0d6c8",
              fontSize: "18px",
              fontWeight: 600,
              color: "#333"
            }}
          >
            {reactions} リアクション
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630
    }
  );
}
