"use client";

import Link from "next/link";
import { ReactionBar } from "@/components/reaction-bar";
import { getVoiceModeLabel } from "@/lib/voice-modes";
import type { FeedItem } from "@/lib/feed";

function timeAgo(dateStr: string) {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "たった今";
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}日前`;
  return new Date(dateStr).toLocaleDateString("ja-JP");
}

type FeedCardProps = {
  item: FeedItem;
};

export function FeedCard({ item }: FeedCardProps) {
  const initials = item.authorName.charAt(0).toUpperCase();

  return (
    <article className="feed-card">
      <div className="feed-card__header">
        <Link
          href={item.authorUsername ? `/ask/${item.authorUsername}` : "#"}
          className="feed-card__avatar"
        >
          {item.authorAvatarUrl ? (
            <img src={item.authorAvatarUrl} alt="" className="feed-card__avatar-img" />
          ) : (
            <span className="feed-card__avatar-initials">{initials}</span>
          )}
        </Link>
        <div className="feed-card__author">
          <Link
            href={item.authorUsername ? `/ask/${item.authorUsername}` : "#"}
            className="feed-card__name"
          >
            {item.authorName}
          </Link>
          <div className="feed-card__meta-line">
            <span className="level-badge level-badge--sm" style={{ backgroundColor: item.authorLevelColor }}>
              Lv.{item.authorLevel}
            </span>
            <span className="feed-card__time">{timeAgo(item.createdAt)}</span>
            {item.expiresAt ? <span className="feed-card__ephemeral">24h</span> : null}
          </div>
        </div>
      </div>

      {item.questionContent ? (
        <p className="feed-card__question">Q. {item.questionContent}</p>
      ) : null}

      <div className="feed-card__player">
        <audio controls src={item.audioUrl} className="feed-card__audio" />
        <div className="feed-card__tags">
          <span className="feed-card__tag">{getVoiceModeLabel(item.voiceMode)}</span>
          <span className="feed-card__tag">{item.durationSeconds}秒</span>
        </div>
      </div>

      <div className="feed-card__footer">
        <ReactionBar
          voicePostId={item.id}
          initialCounts={item.reactions}
        />
        <Link href={item.shareUrl} className="feed-card__share-link">
          シェア
        </Link>
      </div>
    </article>
  );
}
