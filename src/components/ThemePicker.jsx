import { THEMES } from '../data/themes';
import Card from './ui/Card';

export default function ThemePicker({ activeTheme, onSelect }) {
  return (
    <div className="theme-picker">
      {THEMES.map((theme) => (
        <button
          key={theme.id}
          type="button"
          className={`theme-option${activeTheme === theme.id ? ' is-active' : ''}`}
          onClick={() => onSelect(theme.id)}
        >
          <Card className="theme-option__card">
            <div className={`theme-preview ${theme.roomClass}`}>
              <div className="theme-preview__pet" />
            </div>
            <div>
              <strong>{theme.name}</strong>
              <p>{theme.tagline}</p>
            </div>
          </Card>
        </button>
      ))}
    </div>
  );
}
