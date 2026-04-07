import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { WaveformShareCard } from "@/components/waveform-share-card";
import { getBadgesForUser } from "@/lib/badges";
import { getLevelFromPoints } from "@/lib/points";
import { buildCreatorIdentity } from "@/lib/profile-insights";
import { getVoiceModeLabel } from "@/lib/voice-modes";
import { getPublicVoicePostsForAuthor, getVoicePostById } from "@/lib/voice-posts";

export const revalidate = 3600;

const getCachedVoicePost = unstable_cache(
  async (voicePostId: string) => getVoicePostById(voicePostId),
  ["voice-post-by-id"],
  { revalidate: 3600 }
);

type SharePageProps = {
  params: Promise<{
    voicePostId: string;
  }>;
};

function buildOgImageUrl(params: {
  creator: string;
  question: string;
  level: string;
  levelColor: string;
  duration: number;
  mode: string;
  reactions: number;
}) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const sp = new URLSearchParams({
    creator: params.creator,
    q: params.question,
    level: params.level,
    color: params.levelColor,
    duration: String(params.duration),
    mode: params.mode,
    reactions: String(params.reactions)
  });
  return `${base}/api/og?${sp.toString()}`;
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { voicePostId } = await params;
  const result = await getCachedVoicePost(voicePostId);

  if (!result) {
    return { title: "Voiq | 音声が見つかりません" };
  }

  const authorPosts = await getPublicVoicePostsForAuthor(result.author.id);
  const identity = buildCreatorIdentity(result.author, authorPosts);
  const creatorName = result.author.display_name ?? result.author.username ?? "Voiq user";
  const title = result.post.question_content
    ? `${creatorName} の音声回答 | Voiq`
    : `${creatorName} のボイス | Voiq`;
  const description = result.post.question_content
    ? `Q.「${result.post.question_content.slice(0, 70)}」への${result.post.duration_seconds}秒の音声回答`
    : `${creatorName} が ${result.post.duration_seconds}秒のボイスを投稿しました`;
  const ogImage = buildOgImageUrl({
    creator: creatorName,
    question: result.post.question_content ?? "",
    level: `Lv.${identity.level} ${identity.title}`,
    levelColor: identity.levelColor,
    duration: result.post.duration_seconds,
    mode: getVoiceModeLabel(result.post.voice_mode),
    reactions: identity.totalReactions
  });

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630 }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage]
    }
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { voicePostId } = await params;
  const result = await getCachedVoicePost(voicePostId);

  if (!result || !result.post.audio_url) {
    notFound();
  }

  const [authorPosts, userBadges] = await Promise.all([
    getPublicVoicePostsForAuthor(result.author.id),
    getBadgesForUser(result.author.id)
  ]);
  const identity = buildCreatorIdentity(result.author, authorPosts);
  const levelInfo = getLevelFromPoints(result.author.points ?? 0);
  const creatorName = result.author.display_name ?? result.author.username ?? "Voiq user";
  const shareUrl = result.post.share_url ?? `${process.env.NEXT_PUBLIC_SITE_URL}/share/${result.post.id}`;

  return (
    <main className="auth-shell">
      <section className="auth-card auth-card--wide">
        <span className="eyebrow">Voice Share</span>
        <h1>{creatorName} の音声回答</h1>
        <p>
          波形つきで再生して、そのまま X にシェアできます。
          画像プレビュー付きでタイムラインに表示されます。
        </p>

        <WaveformShareCard
          audioUrl={result.post.audio_url}
          shareUrl={shareUrl}
          creatorName={creatorName}
          questionText={result.post.question_content ?? null}
          voiceModeLabel={getVoiceModeLabel(result.post.voice_mode)}
          durationSeconds={result.post.duration_seconds}
        />

        <article className="profile-card">
          <div className="share-creator-header">
            <div>
              <h2>{creatorName}</h2>
              {result.author.username ? <p>@{result.author.username}</p> : null}
            </div>
            <span className="level-badge" style={{ backgroundColor: levelInfo.color }}>
              Lv.{levelInfo.level} {levelInfo.title}
            </span>
          </div>
          <p className="level-description">{levelInfo.description}</p>
          <div className="profile-meta">
            <span>{identity.badge}</span>
            <span>{identity.totalReactions} リアクション</span>
            <span>{identity.totalPosts} 回答</span>
          </div>
          {userBadges.length > 0 ? (
            <div className="badge-grid" style={{ marginTop: "8px" }}>
              {userBadges.slice(0, 8).map((b) => (
                <span key={b.id} className="badge-chip" title={b.description}>
                  {b.icon} {b.name}
                </span>
              ))}
            </div>
          ) : null}
        </article>
      </section>
    </main>
  );
}
