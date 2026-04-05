"use client";

import { useState } from "react";
import { signInWithPassword, signUpWithPassword } from "@/app/sign-in/actions";

type SignInFormProps = {
  error: string | null;
  success: string | null;
  initialMode: "signin" | "signup";
};

export function SignInForm({ error, success, initialMode }: SignInFormProps) {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);

  return (
    <>
      <div className="signin-tabs">
        <button
          type="button"
          className={`signin-tab ${mode === "signin" ? "signin-tab--active" : ""}`}
          onClick={() => setMode("signin")}
        >
          ログイン
        </button>
        <button
          type="button"
          className={`signin-tab ${mode === "signup" ? "signin-tab--active" : ""}`}
          onClick={() => setMode("signup")}
        >
          新規登録
        </button>
      </div>

      {success ? <p className="notice notice--success">{success}</p> : null}
      {error ? <p className="notice notice--error">{error}</p> : null}

      {mode === "signin" ? (
        <form className="signin-form" action={signInWithPassword}>
          <label htmlFor="sign-in-email">メールアドレス</label>
          <input
            id="sign-in-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            autoComplete="email"
          />

          <label htmlFor="sign-in-password">パスワード</label>
          <input
            id="sign-in-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />

          <button type="submit" className="primary-button">
            ログイン
          </button>

          <p className="signin-hint">
            アカウントをお持ちでない方は「新規登録」タブから作成できます。
          </p>
        </form>
      ) : (
        <form className="signin-form" action={signUpWithPassword}>
          <label htmlFor="sign-up-email">メールアドレス</label>
          <input
            id="sign-up-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            autoComplete="email"
          />

          <label htmlFor="sign-up-password">パスワード</label>
          <input
            id="sign-up-password"
            name="password"
            type="password"
            minLength={8}
            placeholder="8文字以上"
            required
            autoComplete="new-password"
          />

          <label htmlFor="sign-up-confirm-password">パスワード（確認）</label>
          <input
            id="sign-up-confirm-password"
            name="confirmPassword"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
          />

          <button type="submit" className="primary-button">
            アカウントを作成
          </button>

          <p className="signin-hint">
            既にアカウントをお持ちの方は「ログイン」タブへ。
          </p>
        </form>
      )}
    </>
  );
}
