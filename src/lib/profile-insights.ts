import { getLevelFromPoints } from "@/lib/points";
import type { Profile } from "@/lib/profiles";
import type { VoicePost } from "@/lib/voice-posts";

export type CreatorIdentity = {
  badge: string;
  title: string;
  level: number;
  levelColor: string;
  totalReactions: number;
  totalPosts: number;
};

export function getVoicePostReactionTotal(post: VoicePost) {
  return (post.reactions?.clap ?? 0) + (post.reactions?.laugh ?? 0) + (post.reactions?.replay ?? 0);
}

export function buildCreatorIdentity(profile: Profile, voicePosts: VoicePost[]): CreatorIdentity {
  const totalPosts = voicePosts.length;
  const totalReactions = voicePosts.reduce((sum, post) => sum + getVoicePostReactionTotal(post), 0);
  const levelInfo = getLevelFromPoints(profile.points ?? 0);

  const badge =
    profile.badge ??
    (profile.is_premium
      ? "Premium Voice"
      : totalReactions >= 60
        ? "Crowd Favorite"
        : totalReactions >= 25
          ? "Hot Voice"
          : totalPosts >= 8
            ? "Daily Talker"
            : "New Voice");

  const title = profile.title ?? levelInfo.title;

  return {
    badge,
    title,
    level: levelInfo.level,
    levelColor: levelInfo.color,
    totalReactions,
    totalPosts
  };
}
