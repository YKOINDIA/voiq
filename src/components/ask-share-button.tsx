"use client";

type AskShareButtonProps = {
  username: string;
  displayName: string;
  askUrl: string;
};

export function AskShareButton({ displayName, askUrl }: AskShareButtonProps) {
  const text = `${displayName}に声で質問してみよう🎙\n回答は10秒のボイスで届きます`;
  const intentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(
    askUrl
  )}&hashtags=${encodeURIComponent("Voiq,声の質問箱")}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(askUrl);
    } catch {
      // クリップボード未対応は無視
    }
  };

  return (
    <div className="auth-links ask-share-actions">
      <a
        className="primary-button"
        href={intentUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Xでシェア
      </a>
      <button type="button" className="secondary-button" onClick={handleCopy}>
        リンクをコピー
      </button>
    </div>
  );
}
