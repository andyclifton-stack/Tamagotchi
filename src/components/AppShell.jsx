import { useEffect, useRef } from 'react';
import Button from './ui/Button';

export default function AppShell({
  title,
  subtitle,
  notice,
  onBack,
  onHome,
  onTitleHold,
  actions,
  children
}) {
  const holdTimerRef = useRef(0);

  const clearHold = () => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = 0;
    }
  };

  const startHold = () => {
    if (!onTitleHold) return;
    clearHold();
    holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = 0;
      onTitleHold();
    }, 2000);
  };

  const handleTouchStart = (event) => {
    if (event.cancelable) {
      event.preventDefault();
    }
    startHold();
  };

  useEffect(() => () => clearHold(), []);

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__nav">
          {onBack ? (
            <Button type="button" variant="ghost" size="sm" onClick={onBack}>
              Back
            </Button>
          ) : <span />}
          {onHome ? (
            <Button type="button" variant="ghost" size="sm" onClick={onHome}>
              Home
            </Button>
          ) : null}
        </div>
        <div
          className="app-shell__title-wrap"
          onMouseDown={startHold}
          onMouseUp={clearHold}
          onMouseLeave={clearHold}
          onTouchStart={handleTouchStart}
          onTouchEnd={clearHold}
          onTouchCancel={clearHold}
          onContextMenu={(event) => event.preventDefault()}
        >
          <p className="eyebrow">{subtitle}</p>
          <h1>{title}</h1>
        </div>
        {actions ? <div className="app-shell__actions">{actions}</div> : null}
      </header>
      {notice ? <div className="notice-banner">{notice}</div> : null}
      <main className="app-shell__body">{children}</main>
    </div>
  );
}
