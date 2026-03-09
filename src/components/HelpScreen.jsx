import Card from './ui/Card';
import Button from './ui/Button';

const SECTIONS = [
  {
    title: 'Real-time care',
    body:
      'Your pet keeps progressing while the app is closed. Hunger, happiness, sleep, hygiene, and health are recalculated from saved timestamps whenever you come back.'
  },
  {
    title: 'Sleep and school-friendly balance',
    body:
      'Overnight decay is gentler than daytime decay, and naps plus natural recovery make it easier to catch up after school or busy weekends.'
  },
  {
    title: 'Live Forever mode',
    body:
      'When Live Forever mode is on, neglect causes sadness, sickness, fatigue, and poor evolution outcomes, but not a permanent loss. When it is off, severe neglect can send the pet to the Care Center for parent rescue.'
  },
  {
    title: 'PINs and parent tools',
    body:
      'A pet PIN protects care mode on that pet. Master PIN 999 unlocks parent tools on any pet and can rename, rescue, heal, clean, restore stats, force stages, or delete a pet.'
  },
  {
    title: 'Public sharing',
    body:
      'Public links open a read-only live view with the pet scene, mood, stage, and summary stats. The share page never shows care buttons or admin controls.'
  }
];

export default function HelpScreen({ onBack }) {
  return (
    <div className="stack-lg">
      <Card className="form-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Help</p>
            <h2>How Tamagotchi v1 behaves</h2>
          </div>
          <Button type="button" variant="ghost" onClick={onBack}>
            Back
          </Button>
        </div>
      </Card>

      <div className="help-grid">
        {SECTIONS.map((section) => (
          <Card key={section.title} className="help-card">
            <h3>{section.title}</h3>
            <p>{section.body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
