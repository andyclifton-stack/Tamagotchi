import Meter from './ui/Meter';
import Card from './ui/Card';
import { formatAge, formatClock, formatMoodLabel, formatStage } from '../lib/format';
import { getPetAdvice, getTimeOfDayLabel } from '../game/simulation';

export default function StatusSheet({ open, pet, onClose, events = [] }) {
  if (!open || !pet) return null;

  return (
    <div className="sheet-shell" role="dialog" aria-modal="true">
      <Card className="sheet-card">
        <div className="sheet-card__head">
          <div>
            <p className="eyebrow">Status</p>
            <h3>{pet.name}</h3>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close status">
            x
          </button>
        </div>

        <div className="status-grid">
          <Card className="status-summary-card">
            <div className="status-summary-grid">
              <div>
                <span className="muted-label">Stage</span>
                <strong>{formatStage(pet.currentStage)}</strong>
              </div>
              <div>
                <span className="muted-label">Mood</span>
                <strong>{formatMoodLabel(pet.currentMood)}</strong>
              </div>
              <div>
                <span className="muted-label">Age</span>
                <strong>{formatAge(pet.createdAt)}</strong>
              </div>
              <div>
                <span className="muted-label">Now</span>
                <strong>{getTimeOfDayLabel(pet)}</strong>
              </div>
              <div>
                <span className="muted-label">Last care</span>
                <strong>{formatClock(pet.lastPlayedAt)}</strong>
              </div>
              <div>
                <span className="muted-label">Mess</span>
                <strong>{pet.stats.messCount}/3</strong>
              </div>
            </div>
            <p className="status-advice">{getPetAdvice(pet)}</p>
          </Card>

          <Meter label="Hunger" value={pet.stats.hunger} tone="warm" />
          <Meter label="Happiness" value={pet.stats.happiness} tone="joy" />
          <Meter label="Energy" value={pet.stats.energy} tone="cool" />
          <Meter label="Hygiene" value={pet.stats.hygiene} tone="mint" />
          <Meter label="Health" value={pet.stats.health} tone="health" />
          <Meter label="Toilet" value={pet.stats.toilet} tone="amber" />
          <Meter label="Affection" value={pet.stats.affection} tone="pink" />
          <Meter label="Discipline" value={pet.stats.discipline} tone="sky" />

          <Card className="events-card">
            <h4>Latest moments</h4>
            <div className="event-list">
              {events.length ? (
                events
                  .slice(-6)
                  .reverse()
                  .map((event, index) => (
                    <div key={`${event.at}-${index}`} className="event-row">
                      <strong>{formatClock(event.at)}</strong>
                      <span>{event.message}</span>
                    </div>
                  ))
              ) : (
                <p className="muted-text">No recent events yet.</p>
              )}
            </div>
          </Card>
        </div>
      </Card>
    </div>
  );
}
