import Card from './ui/Card';
import Button from './ui/Button';
import ThemePicker from './ThemePicker';

export default function SettingsScreen({ settings, onBack, onChange, onClearLocalCache }) {
  return (
    <div className="stack-lg">
      <Card className="form-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Settings</p>
            <h2>App-wide defaults</h2>
          </div>
          <Button type="button" variant="ghost" onClick={onBack}>
            Back
          </Button>
        </div>

        <label className="toggle-row">
          <div>
            <span className="field-label">Sound effects</span>
            <p className="muted-text">Generated web-audio taps, care sounds, hatching, and evolution.</p>
          </div>
          <input
            type="checkbox"
            checked={settings.soundEnabled}
            onChange={(event) => onChange({ ...settings, soundEnabled: event.target.checked })}
          />
        </label>

        <label className="toggle-row">
          <div>
            <span className="field-label">Reduced motion</span>
            <p className="muted-text">Use fewer bounces and scene animations.</p>
          </div>
          <input
            type="checkbox"
            checked={settings.reducedMotion}
            onChange={(event) => onChange({ ...settings, reducedMotion: event.target.checked })}
          />
        </label>
      </Card>

      <Card className="form-card">
        <div className="section-head section-head--compact">
          <div>
            <span className="field-label">Default theme for new pets</span>
            <p className="muted-text">Each pet can still change theme later.</p>
          </div>
        </div>
        <ThemePicker
          activeTheme={settings.defaultTheme}
          onSelect={(themeId) => onChange({ ...settings, defaultTheme: themeId })}
        />
      </Card>

      <Card className="form-card">
        <h3>Local cache</h3>
        <p className="muted-text">
          This clears app settings, remembered unlock sessions, and the last-opened pet on this device. Firebase saves stay intact.
        </p>
        <Button type="button" variant="secondary" onClick={onClearLocalCache}>
          Clear Local Cache
        </Button>
      </Card>
    </div>
  );
}
