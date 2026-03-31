"use client";

import { useRef, useState } from "react";

type QuestionItem = {
  id: string;
  content: string;
  is_anonymous: boolean;
  sender_name: string | null;
};

type VoiceReplyComposerProps = {
  questions: QuestionItem[];
  maxDurationSeconds: number;
};

export function VoiceReplyComposer({
  questions,
  maxDurationSeconds
}: VoiceReplyComposerProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>(questions[0]?.id ?? "");
  const [voiceMode, setVoiceMode] = useState("original");
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

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

  const startRecording = async () => {
    try {
      setStatus("");
      setRecordedBlob(null);
      setPreviewUrl(null);
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
        const nextUrl = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setPreviewUrl(nextUrl);
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
      setStatus("マイクにアクセスできませんでした。ブラウザ権限を確認してください。");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const submitRecording = async () => {
    if (!recordedBlob || !selectedQuestionId) {
      setStatus("録音と質問の選択が必要です。");
      return;
    }

    setIsSubmitting(true);
    setStatus("");

    const formData = new FormData();
    formData.append("audio", recordedBlob, "reply.webm");
    formData.append("questionId", selectedQuestionId);
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
    setRecordedBlob(null);
    setPreviewUrl(null);
    setSeconds(0);
    setIsSubmitting(false);
    window.location.reload();
  };

  return (
    <article className="profile-card">
      <span className="section-label">Voice Reply</span>
      <h2>10秒で音声回答する</h2>
      <p>無料ユーザー向けに、まずは 10 秒までの一言回答を録音して投稿できます。</p>

      <div className="composer-grid">
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

        <label>
          <span>ボイスモード</span>
          <select value={voiceMode} onChange={(event) => setVoiceMode(event.target.value)}>
            <option value="original">地声</option>
            <option value="high">高め</option>
            <option value="low">低め</option>
          </select>
        </label>
      </div>

      <div className="recording-panel">
        <strong>{isRecording ? `録音中 ${seconds}s / ${maxDurationSeconds}s` : "録音準備完了"}</strong>
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
            disabled={!recordedBlob || isSubmitting}
          >
            {isSubmitting ? "投稿中..." : "音声を投稿"}
          </button>
        </div>
      </div>

      {previewUrl ? <audio controls src={previewUrl} className="audio-preview" /> : null}
      {status ? <p className="notice">{status}</p> : null}
    </article>
  );
}
