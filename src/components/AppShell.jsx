import Button from './ui/Button';

export default function AppShell({
  title,
  subtitle,
  notice,
  onBack,
  onHome,
  actions,
  children
}) {
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
        <div className="app-shell__title-wrap">
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
