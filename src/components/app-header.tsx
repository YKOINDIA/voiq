import Link from "next/link";

type AppHeaderProps = {
  isSignedIn: boolean;
  isAdmin: boolean;
};

export function AppHeader({ isSignedIn, isAdmin }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header__inner">
        <Link href="/" className="app-header__brand">
          <span className="app-header__logo">V</span>
          <div>
            <strong>Voiq</strong>
            <span>voice question box</span>
          </div>
        </Link>

        <nav className="app-header__nav" aria-label="Global">
          <Link href="/">ホーム</Link>
          <Link href="/rankings">ランキング</Link>
          {isSignedIn ? <Link href="/dashboard">ダッシュボード</Link> : null}
          {isAdmin ? <Link href="/admin">管理画面</Link> : null}
          {isSignedIn ? (
            <Link href="/auth/sign-out" className="app-header__button">
              ログアウト
            </Link>
          ) : (
            <Link href="/sign-in" className="app-header__button">
              ログイン
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
