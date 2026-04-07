import Link from "next/link";

type AppHeaderProps = {
  isSignedIn: boolean;
  isAdmin: boolean;
  avatarUrl?: string | null;
  displayName?: string | null;
};

export function AppHeader({ isSignedIn, isAdmin, avatarUrl, displayName }: AppHeaderProps) {
  const initials = (displayName ?? "V").charAt(0).toUpperCase();

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

        {/* Search */}
        <form className="header-search" action="/" method="GET">
          <input
            name="q"
            type="search"
            placeholder="ボイスを検索..."
            className="header-search__input"
          />
          <button type="submit" className="header-search__btn" aria-label="検索">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
        </form>

        <nav className="app-header__nav" aria-label="Global">
          {isSignedIn ? (
            <Link href="/dashboard?tab=record" className="header-record-btn" title="Voice を録音">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z"/><path d="M19 11a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.93V20H8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-3v-2.07A7 7 0 0 0 19 11z"/></svg>
            </Link>
          ) : null}

          <Link href="/rankings">ランキング</Link>

          {isSignedIn ? (
            <Link href="/dashboard">マイページ</Link>
          ) : null}

          {isAdmin ? (
            <Link href="/admin">管理</Link>
          ) : null}

          {isSignedIn ? (
            <Link href="/settings/profile" className="header-avatar" title="設定">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="header-avatar__img" />
              ) : (
                <span className="header-avatar__initials">{initials}</span>
              )}
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
