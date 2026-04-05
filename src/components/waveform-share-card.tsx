"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type WaveformShareCardProps = {
  audioUrl: string;
  shareUrl: string;
  creatorName: string;
  questionText: string | null;
  voiceModeLabel: string;
  durationSeconds: number;
};

function createFallbackBars(seed: number) {
  return Array.from({ length: 40 }, (_, index) => {
    const base = Math.abs(Math.sin((index + 1) * seed)) * 0.6;
    return 0.2 + base;
  });
}

export function WaveformShareCard({
  audioUrl,
  shareUrl,
  creatorName,
  questionText,
  voiceModeLabel,
  durationSeconds
}: WaveformShareCardProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bars, setBars] = useState<number[]>(() => createFallbackBars(0.4));
  const [copied, setCopied] = useState(false);
  const fallbackBars = useMemo(() => createFallbackBars(durationSeconds / 7 + 0.4), [durationSeconds]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    let mounted = true;
    let context: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let sourceNode: MediaElementAudioSourceNode | null = null;
    let dataArray: Uint8Array<ArrayBuffer> | null = null;

    const updateBars = () => {
      if (!analyser || !dataArray || !mounted) {
        return;
      }

      const buffer = dataArray;
      analyser.getByteFrequencyData(buffer);
      const nextBars = Array.from({ length: 40 }, (_, index) => {
        const bucketSize = Math.max(1, Math.floor(buffer.length / 40));
        const start = index * bucketSize;
        const end = Math.min(buffer.length, start + bucketSize);
        let total = 0;

        for (let current = start; current < end; current += 1) {
          total += buffer[current] ?? 0;
        }

        const average = total / Math.max(1, end - start);
        return Math.max(0.14, average / 255);
      });

      setBars(nextBars);
      frameRef.current = window.requestAnimationFrame(updateBars);
    };

    const bootAudio = async () => {
      try {
        const AudioContextClass = window.AudioContext;

        if (!AudioContextClass) {
          return;
        }

        context = new AudioContextClass();
        analyser = context.createAnalyser();
        analyser.fftSize = 256;
        sourceNode = context.createMediaElementSource(audio);
        sourceNode.connect(analyser);
        analyser.connect(context.destination);
        dataArray = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      } catch {
        setBars(fallbackBars);
      }
    };

    void bootAudio();

    const handlePlay = async () => {
      setIsPlaying(true);
      if (context?.state === "suspended") {
        await context.resume();
      }
      updateBars();
    };

    const handlePause = () => {
      setIsPlaying(false);
      setBars(fallbackBars);
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handlePause);

    return () => {
      mounted = false;
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handlePause);
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
      sourceNode?.disconnect();
      analyser?.disconnect();
      void context?.close();
    };
  }, [audioUrl, fallbackBars]);

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <article className="share-card">
      <div className="share-card__panel">
        <span className="section-label">Audiogram Share</span>
        <h2>{creatorName}</h2>
        <p>{questionText ? `Q. ${questionText}` : "ひとこと音声をシェア中"}</p>
        <div className="share-card__meta">
          <span>{voiceModeLabel}</span>
          <span>{durationSeconds}秒</span>
          <span>{isPlaying ? "再生中" : "待機中"}</span>
        </div>
        <div className="waveform-bars" aria-hidden="true">
          {bars.map((height, index) => (
            <span
              key={`${index}-${height}`}
              className="waveform-bars__bar"
              style={{ height: `${Math.round(height * 100)}%` }}
            />
          ))}
        </div>
        <audio ref={audioRef} controls src={audioUrl} className="audio-preview" />
        <div className="auth-links">
          <button type="button" className="primary-button" onClick={copyShareUrl}>
            {copied ? "リンクをコピーしました" : "シェアリンクをコピー"}
          </button>
          <Link
            className="secondary-button"
            href={`https://x.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`${creatorName} の音声回答を聴いてみて #Voiq`)}`}
            target="_blank"
          >
            X にシェア
          </Link>
        </div>
      </div>
    </article>
  );
}
