"use client";

import { useEffect, useState } from "react";

type OnboardingBannerProps = {
  targetId: string;
};

const STORAGE_KEY = "voiq:onboarding-dismissed";

export function OnboardingBanner({ targetId }: OnboardingBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(STORAGE_KEY) === "1") {
      setDismissed(true);
    }
  }, []);

  if (dismissed) return null;

  const handleStart = () => {
    if (typeof window === "undefined") return;
    // hash更新でcomposer側のpreset動線をトリガ
    window.history.replaceState(null, "", `#${targetId}?cat=intro`);
    const target = document.getElementById(targetId);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "1");
    }
    setDismissed(true);
  };

  return (
    <section className="onboarding-banner" aria-label="Voiq はじめてガイド">
      <div className="onboarding-banner__icon" aria-hidden>🎙</div>
      <div className="onboarding-banner__body">
        <strong>まずは10秒で自己紹介を投稿しよう</strong>
        <p>
          名前と好きな声の特徴をひとことだけ録音すれば、Voiq デビュー完了。
          あとから何度でも投稿できます。
        </p>
        <div className="onboarding-banner__actions">
          <button type="button" className="primary-button" onClick={handleStart}>
            録音をはじめる
          </button>
          <button type="button" className="secondary-button" onClick={handleDismiss}>
            あとで
          </button>
        </div>
      </div>
    </section>
  );
}
