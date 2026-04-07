"use client";

import { useState } from "react";
import { FeedbackChat } from "@/components/feedback-chat";

type FeedbackFabProps = {
  userId: string;
};

export function FeedbackFab({ userId }: FeedbackFabProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="fb-fab"
        onClick={() => setOpen(true)}
        aria-label="フィードバックを送る"
      >
        💬 要望・不具合
      </button>
      {open ? <FeedbackChat userId={userId} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
