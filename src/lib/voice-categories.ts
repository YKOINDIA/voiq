export const VOICE_CATEGORIES = [
  { value: "intro", label: "自己紹介" },
  { value: "chat", label: "雑談" },
  { value: "answer", label: "質問回答" },
  { value: "mimic", label: "モノマネ" },
  { value: "sing", label: "歌・ハミング" },
  { value: "story", label: "エピソード" },
  { value: "asmr", label: "ASMR" },
  { value: "other", label: "その他" }
] as const;

export type VoiceCategory = (typeof VOICE_CATEGORIES)[number]["value"];

const VOICE_CATEGORY_VALUES = new Set<string>(VOICE_CATEGORIES.map((item) => item.value));

export function isVoiceCategory(value: string): value is VoiceCategory {
  return VOICE_CATEGORY_VALUES.has(value);
}

export function getVoiceCategoryLabel(value: string | null | undefined) {
  if (!value) return null;
  return VOICE_CATEGORIES.find((item) => item.value === value)?.label ?? null;
}
