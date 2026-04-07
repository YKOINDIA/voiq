"use client";

import Link from "next/link";

const TABS = [
  { value: "content", label: "コンテンツ" },
  { value: "record", label: "録音" },
  { value: "analytics", label: "アナリティクス" },
  { value: "subtitles", label: "字幕" },
  { value: "earn", label: "収入" }
] as const;

type DashboardTabsProps = {
  active: string;
};

export function DashboardTabs({ active }: DashboardTabsProps) {
  return (
    <div className="feed-tabs" role="tablist" aria-label="Dashboard sections">
      {TABS.map((tab) => (
        <Link
          key={tab.value}
          href={`/dashboard?tab=${tab.value}`}
          role="tab"
          aria-selected={active === tab.value}
          className={active === tab.value ? "feed-tab feed-tab--active" : "feed-tab"}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
