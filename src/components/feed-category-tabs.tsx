"use client";

import Link from "next/link";

const CATEGORIES = [
  { value: "all", label: "すべて" },
  { value: "latest", label: "最新" },
  { value: "popular", label: "人気" },
  { value: "short", label: "ショート" },
  { value: "long", label: "じっくり" },
  { value: "anonymous", label: "匿名ボイス" }
] as const;

type FeedCategoryTabsProps = {
  active: string;
  query?: string;
};

export function FeedCategoryTabs({ active, query }: FeedCategoryTabsProps) {
  return (
    <div className="feed-tabs" role="tablist" aria-label="Voice categories">
      {CATEGORIES.map((cat) => {
        const params = new URLSearchParams();
        if (cat.value !== "all") params.set("cat", cat.value);
        if (query) params.set("q", query);
        const href = params.toString() ? `/?${params.toString()}` : "/";
        return (
          <Link
            key={cat.value}
            href={href}
            role="tab"
            aria-selected={active === cat.value}
            className={active === cat.value ? "feed-tab feed-tab--active" : "feed-tab"}
          >
            {cat.label}
          </Link>
        );
      })}
    </div>
  );
}
