import { ACTION_TYPES } from '../config/appConfig';

const ACTIONS = [
  { type: ACTION_TYPES.FEED_MEAL, label: 'Meal', short: 'Meal' },
  { type: ACTION_TYPES.GIVE_SNACK, label: 'Snack', short: 'Snack' },
  { type: ACTION_TYPES.CLEAN_WASH, label: 'Wash', short: 'Wash' },
  { type: ACTION_TYPES.TOILET, label: 'Toilet', short: 'Toilet' },
  { type: ACTION_TYPES.GIVE_MEDICINE, label: 'Medicine', short: 'Meds' },
  { type: ACTION_TYPES.REST, label: 'Rest', short: 'Rest' },
  { type: ACTION_TYPES.COMFORT, label: 'Comfort', short: 'Comfort' },
  { type: ACTION_TYPES.DISCIPLINE, label: 'Discipline', short: 'Train' },
  { type: ACTION_TYPES.TOGGLE_LIGHTS, label: 'Lights', short: 'Lights' }
];

function isActionDisabled(actionType, pet, canEdit) {
  if (!pet) return true;
  if (!canEdit && actionType !== ACTION_TYPES.CHECK_STATUS) return true;
  if (pet.status?.careCenterRest) return actionType !== ACTION_TYPES.CHECK_STATUS;
  if (pet.currentStage === 'egg') {
    return ![
      ACTION_TYPES.COMFORT,
      ACTION_TYPES.CHECK_STATUS,
      ACTION_TYPES.TOGGLE_LIGHTS
    ].includes(actionType);
  }
  if (actionType === ACTION_TYPES.GIVE_MEDICINE && !pet.status?.isSick && pet.stats.health > 64) {
    return true;
  }
  return false;
}

export default function ActionDock({ pet, canEdit, saving, onAction, onStatus }) {
  const triggerAction = (payload) => {
    Promise.resolve(onAction(payload)).catch(() => {});
  };

  return (
    <div className="action-dock">
      {ACTIONS.map((action) => (
        <button
          key={action.type}
          type="button"
          className="action-pill"
          disabled={saving || isActionDisabled(action.type, pet, canEdit)}
          onClick={() => triggerAction({ type: action.type })}
        >
          <span className="action-pill__title">{action.short}</span>
          <span className="action-pill__detail">{action.label}</span>
        </button>
      ))}
      <button type="button" className="action-pill action-pill--status" onClick={onStatus}>
        <span className="action-pill__title">Stats</span>
        <span className="action-pill__detail">Status</span>
      </button>
    </div>
  );
}
