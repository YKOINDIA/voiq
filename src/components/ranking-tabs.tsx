"use client";

import { useState } from "react";
import Link from "next/link";
import type { RankingBoard } from "@/lib/rankings";

type RankingTabsProps = {
  boards: RankingBoard[];
};

export function RankingTabs({ boards }: RankingTabsProps) {
  const [activeBoardId, setActiveBoardId] = useState(boards[0]?.id ?? "");
  const activeBoard = boards.find((board) => board.id === activeBoardId) ?? boards[0];

  if (!activeBoard) {
    return null;
  }

  return (
    <section className="question-section">
      <article className="profile-card">
        <span className="section-label">Ranking Board</span>
        <div className="ranking-tabs" role="tablist" aria-label="Voice ranking categories">
          {boards.map((board) => (
            <button
              key={board.id}
              type="button"
              role="tab"
              aria-selected={board.id === activeBoard.id}
              className={board.id === activeBoard.id ? "ranking-tab ranking-tab--active" : "ranking-tab"}
              onClick={() => setActiveBoardId(board.id)}
            >
              {board.title}
            </button>
          ))}
        </div>

        <div className="ranking-tab-panel" role="tabpanel">
          <h2>{activeBoard.title}</h2>
          <p>{activeBoard.description}</p>
          {activeBoard.entries.length === 0 ? (
            <p>まだこのカテゴリのランキング対象がありません。</p>
          ) : (
            <div className="ranking-board">
              {activeBoard.entries.map((entry, index) => (
                <article key={`${activeBoard.id}-${entry.authorId}`} className="ranking-row">
                  <strong>#{index + 1}</strong>
                  <div>
                    <h3>{entry.displayName ?? entry.username ?? "Voiq user"}</h3>
                    <p>@{entry.username ?? "username"}</p>
                  </div>
                  <div className="reaction-inline">
                    <span>総合 {entry.totalReactions}</span>
                    <span>拍手 {entry.clap}</span>
                    <span>笑い声 {entry.laugh}</span>
                    <span>もう一回 {entry.replay}</span>
                    <span>回答 {entry.voicePosts}</span>
                  </div>
                  <div className="reaction-inline">
                    <span>地声 {entry.originalPosts}</span>
                    <span>高め {entry.highPosts}</span>
                    <span>低め {entry.lowPosts}</span>
                    <span>ロボット {entry.robotPosts}</span>
                    <span>通話風 {entry.telephonePosts}</span>
                  </div>
                  {entry.username ? (
                    <Link className="secondary-button" href={`/ask/${entry.username}`}>
                      公開ページへ
                    </Link>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
      </article>
    </section>
  );
}
