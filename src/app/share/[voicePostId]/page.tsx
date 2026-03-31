import { notFound } from "next/navigation";
import { WaveformShareCard } from "@/components/waveform-share-card";
import { buildCreatorIdentity } from "@/lib/profile-insights";
import { getVoiceModeLabel } from "@/lib/voice-modes";
import { getPublicVoicePostsForAuthor, getVoicePostById } from "@/lib/voice-posts";

type SharePageProps = {
  params: Promise<{
    voicePostId: string;
  }>;
};

export default async function SharePage({ params }: SharePageProps) {
  const { voicePostId } = await params;
  const result = await getVoicePostById(voicePostId);

  if (!result || !result.post.audio_url) {
    notFound();
  }

  const authorPosts = await getPublicVoicePostsForAuthor(result.author.id);
  const identity = buildCreatorIdentity(result.author, authorPosts);

  return (
    <main className="auth-shell">
      <section className="auth-card auth-card--wide">
        <span className="eyebrow">Share Voice</span>
        <h1>{result.author.display_name ?? result.author.username ?? "Voiq user"} の音声シェア</h1>
        <p>
          Voiq の回答を波形つきで再生できるシェアページです。X や Instagram に載せる前の
          プレビューとしても使えます。
        </p>

        <WaveformShareCard
          audioUrl={result.post.audio_url}
          shareUrl={result.post.share_url ?? `${process.env.NEXT_PUBLIC_SITE_URL}/share/${result.post.id}`}
          creatorName={result.author.display_name ?? result.author.username ?? "Voiq user"}
          questionText={result.post.question_content ?? null}
          voiceModeLabel={getVoiceModeLabel(result.post.voice_mode)}
          durationSeconds={result.post.duration_seconds}
        />

        <article className="profile-card">
          <span className="section-label">Creator Snapshot</span>
          <h2>{identity.title}</h2>
          <div className="profile-meta">
            <span>{identity.badge}</span>
            <span>リアクション {identity.totalReactions}</span>
            <span>回答数 {identity.totalPosts}</span>
          </div>
        </article>
      </section>
    </main>
  );
}
