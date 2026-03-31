"use client";

import { useState } from "react";

type ReactionBarProps = {
  voicePostId: string;
  initialCounts: {
    clap: number;
    laugh: number;
    replay: number;
  };
};

const reactionLabels = {
  clap: "拍手",
  laugh: "笑い声",
  replay: "もう一回"
} as const;

export function ReactionBar({ voicePostId, initialCounts }: ReactionBarProps) {
  const [counts, setCounts] = useState(initialCounts);
  const [status, setStatus] = useState("");

  const sendReaction = async (soundType: keyof typeof reactionLabels) => {
    setStatus("");
    setCounts((current) => ({
      ...current,
      [soundType]: current[soundType] + 1
    }));

    const response = await fetch("/api/reactions", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        voicePostId,
        soundType
      })
    });

    if (!response.ok) {
      setStatus("リアクション送信に失敗しました。");
    }
  };

  return (
    <div className="reaction-stack">
      <div className="reaction-buttons">
        {(Object.keys(reactionLabels) as Array<keyof typeof reactionLabels>).map((key) => (
          <button key={key} type="button" className="reaction-chip" onClick={() => sendReaction(key)}>
            {reactionLabels[key]} {counts[key]}
          </button>
        ))}
      </div>
      {status ? <p className="notice notice--error">{status}</p> : null}
    </div>
  );
}
