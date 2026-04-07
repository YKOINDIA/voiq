"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { transformVoiceBlob } from "@/lib/audio/voice-transform";
import { VOICE_CATEGORIES, type VoiceCategory } from "@/lib/voice-categories";
import { getVoiceModeOptions, type VoiceMode } from "@/lib/voice-modes";

type QuestionItem = {
  id: string;
  content: string;
  is_anonymous: boolean;
  sender_name: string | null;
};

type VoiceReplyComposerProps = {
  questions?: QuestionItem[];
  mode?: "reply" | "standalone";
  defaultCategory?: VoiceCategory;
  maxDurationSeconds: number;
  isPremium: boolean;
  anchorId?: string;
};

export function VoiceReplyComposer({
  questions = [],
  mode = "reply",
  defaultCategory,
  maxDurationSeconds,
  isPremium,
  anchorId
}: VoiceReplyComposerProps) {
  const isStandalone = mode === "standalone";
  const voiceOptions = useMemo(() => getVoiceModeOptions(isPremium), [isPremium]);
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>(questions[0]?.id ?? "");
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("original");
  const [category, setCategory] = useState<VoiceCategory>(defaultCategory ?? "intro");
  const [sourceBlob, setSourceBlob] = useState<Blob | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const processingRunRef = useRef(0);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  // URLハッシュからカテゴリプリセット (#standalone-composer?cat=intro 風の動線サポート)
  useEffect(() => {
    if (!isStandalone || typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash) return;
    const match = /cat=([a-z]+)/.exec(hash);
    if (match) {
      const next = match[1];
      if (VOICE_CATEGORIES.some((c) => c.value === next)) {
        setCategory(next as VoiceCategory);
      }
    }
  }, [isStandalone]);

  const updatePreviewUrl = (blob: Blob | null) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    if (!blob) {
      setPreviewUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(blob);
    previewUrlRef.current = nextUrl;
    setPreviewUrl(nextUrl);
  };

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const resetTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (!sourceBlob) {
      setProcessedBlob(null);
      updatePreviewUrl(null);
      return;
    }

    const applySelectedVoice = async () => {
      const runId = processingRunRef.current + 1;
      processingRunRef.current = runId;
      setIsProcessing(true);
      setStatus("ボイスを変換しています...");

      try {
        const nextBlob = await transformVoiceBlob(sourceBlob, voiceMode);

        if (processingRunRef.current !== runId) {
          return;
        }

        setProcessedBlob(nextBlob);
        updatePreviewUrl(nextBlob);
        setStatus("");
      } catch {
        if (processingRunRef.current !== runId) {
          return;
        }

        setProcessedBlob(null);
        updatePreviewUrl(null);
        setStatus("音声の変換に失敗しました。別のボイスでもう一度試してください。");
      } finally {
        if (processingRunRef.current === runId) {
          setIsProcessing(false);
        }
      }
    };

    void applySelectedVoice();
  }, [sourceBlob, voiceMode]);

  const startRecording = async () => {
    try {
      setStatus("");
      setSourceBlob(null);
      setProcessedBlob(null);
      updatePreviewUrl(null);
      chunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setSourceBlob(blob);
        setIsRecording(false);
        resetTimer();
        stopTracks();
      };

      recorder.start();
      setSeconds(0);
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        setSeconds((current) => {
          if (current + 1 >= maxDurationSeconds) {
            recorder.stop();
            return maxDurationSeconds;
          }

          return current + 1;
        });
      }, 1000);
    } catch {
      setStatus("マイクにアクセスできませんでした。ブラウザの許可設定を確認してください。");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const submitRecording = async () => {
    if (!processedBlob) {
      setStatus("録音した音声がありません。");
      return;
    }

    if (!isStandalone && !selectedQuestionId) {
      setStatus("質問を選択してください。");
      return;
    }

    if (isProcessing) {
      setStatus("変換が終わってから投稿してください。");
      return;
    }

    setIsSubmitting(true);
    setStatus("");

    const extension = processedBlob.type === "audio/wav" ? "wav" : "webm";
    const formData = new FormData();
    formData.append("audio", processedBlob, `reply.${extension}`);
    if (!isStandalone) {
      formData.append("questionId", selectedQuestionId);
    }
    formData.append("category", category);
    formData.append("voiceMode", voiceMode);
    formData.append("durationSeconds", String(Math.max(seconds, 1)));

    const response = await fetch("/api/voice-posts", {
      method: "POST",
      body: formData
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setStatus(payload.error ?? "音声の投稿に失敗しました。");
      setIsSubmitting(false);
      return;
    }

    setStatus("音声を投稿しました。");
    setSourceBlob(null);
    setProcessedBlob(null);
    updatePreviewUrl(null);
    setSeconds(0);
    setIsSubmitting(false);
    window.location.reload();
  };

  const heading = isStandalone
    ? defaultCategory === "intro"
      ? "10秒で自己紹介ボイスを録音"
      : "ひとことボイスを録音"
    : isPremium
      ? "60秒までじっくり音声回答"
      : "10秒で音声回答";

  const subheading = isStandalone
    ? "質問なしで自由に投稿できます。カテゴリを選んで気軽に声を残しましょう。"
    : isPremium
      ? "Premium は 60 秒録音と特殊ボイスが使えます。回答は保存され続けます。"
      : "Free は 10 秒の一言ボイスです。回答は 24 時間で自動消去されます。";

  return (
    <article className="profile-card" id={anchorId}>
      <span className="section-label">{isStandalone ? "Voice Post" : "Voice Reply"}</span>
      <h2>{heading}</h2>
      <p>{subheading}</p>

      <div className="composer-grid">
        {!isStandalone && questions.length > 0 ? (
          <label>
            <span>回答する質問</span>
            <select
              value={selectedQuestionId}
              onChange={(event) => setSelectedQuestionId(event.target.value)}
            >
              {questions.map((question) => (
                <option key={question.id} value={question.id}>
                  {question.content}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label>
          <span>カテゴリ</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as VoiceCategory)}
          >
            {VOICE_CATEGORIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>ボイスモード</span>
          <select
            value={voiceMode}
            onChange={(event) => setVoiceMode(event.target.value as VoiceMode)}
          >
            {voiceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="notice">{voiceOptions.find((option) => option.value === voiceMode)?.description}</p>

      <div className="recording-panel">
        <strong>
          {isRecording ? `録音中 ${seconds}s / ${maxDurationSeconds}s` : "録音準備OK"}
        </strong>
        <div className="auth-links">
          {!isRecording ? (
            <button type="button" className="primary-button" onClick={startRecording}>
              録音開始
            </button>
          ) : (
            <button type="button" className="primary-button" onClick={stopRecording}>
              録音停止
            </button>
          )}
          <button
            type="button"
            className="secondary-button"
            onClick={submitRecording}
            disabled={!processedBlob || isSubmitting || isProcessing}
          >
            {isSubmitting ? "投稿中..." : isProcessing ? "変換中..." : "音声を投稿"}
          </button>
        </div>
      </div>

      {previewUrl ? <audio controls src={previewUrl} className="audio-preview" /> : null}
      {status ? <p className="notice">{status}</p> : null}
    </article>
  );
}
