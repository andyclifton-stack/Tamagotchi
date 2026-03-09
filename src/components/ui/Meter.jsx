export default function Meter({ label, value, tone = 'default', hint }) {
  return (
    <div className="meter">
      <div className="meter__head">
        <span>{label}</span>
        <strong>{Math.round(value)}</strong>
      </div>
      <div className="meter__track">
        <div
          className={`meter__fill meter__fill--${tone}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
      {hint ? <p className="meter__hint">{hint}</p> : null}
    </div>
  );
}
