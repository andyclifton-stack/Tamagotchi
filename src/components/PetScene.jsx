import { useEffect, useMemo, useRef, useState } from 'react';
import { PET_TYPE_MAP } from '../data/petTypes';
import { THEME_MAP } from '../data/themes';
import {
  getCoverageCell,
  getCoverageProgress,
  getFeedDeliveryProgress,
  getPlayTargetCell,
  getSleepPullProgress,
  isFeedTargetHit,
  isPlayTargetHit
} from '../lib/cleanInteraction';

const TOOL_ICONS = {
  clean: '\uD83E\uDDFD',
  feed: '\uD83C\uDF4E',
  play: '\uD83E\uDEB6',
  sleep: '\uD83C\uDF19',
  wake: '\u2600\uFE0F',
  medicine: '\uD83D\uDC8A',
  sparkle: '\u2728'
};

function expressionForMood(mood, reactionFace = '') {
  if (reactionFace) return reactionFace;
  if (mood === 'sleeping') return 'sleep';
  if (mood === 'sparkly') return 'happy';
  if (mood === 'hungry' || mood === 'grumpy' || mood === 'care-center') return 'sad';
  if (mood === 'sick') return 'ill';
  return 'neutral';
}

function stageScale(stage) {
  return {
    egg: 0.62,
    baby: 0.78,
    child: 0.92,
    teen: 1,
    adult: 1.08
  }[stage] || 1;
}

function getSceneTimePeriod(timestamp) {
  const hour = new Date(timestamp).getHours();
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

function drawRetroPet(canvas, pet, species) {
  if (!canvas || !pet || !species) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = false;

  const scale = stageScale(pet.currentStage);
  const px = Math.round(5 * scale);
  const originX = Math.round(width / 2 - 4 * px);
  const originY = Math.round(height / 2 - 4 * px);

  const paint = (x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(originX + x * px, originY + y * px, w * px, h * px);
  };

  const colors = species.colors;
  if (pet.currentStage === 'egg') {
    paint(2, 1, 4, 6, colors.secondary);
    paint(1, 2, 6, 4, colors.primary);
    paint(2, 5, 1, 1, colors.accent);
    paint(5, 4, 1, 1, colors.accent);
    return;
  }

  if (species.render.body === 'round') {
    paint(1, 2, 6, 4, colors.primary);
    paint(2, 1, 4, 6, colors.primary);
  }
  if (species.render.body === 'seed') {
    paint(2, 1, 4, 6, colors.primary);
    paint(1, 3, 6, 2, colors.primary);
  }
  if (species.render.body === 'bolt') {
    paint(2, 1, 3, 6, colors.primary);
    paint(4, 2, 2, 2, colors.primary);
    paint(1, 4, 3, 2, colors.primary);
  }
  if (species.render.body === 'oval') {
    paint(2, 1, 4, 6, colors.primary);
    paint(1, 2, 6, 4, colors.primary);
  }
  paint(2, 1, 1, 1, colors.secondary);
  paint(5, 1, 1, 1, colors.secondary);
  paint(2, 3, 1, 1, colors.outline);
  paint(5, 3, 1, 1, colors.outline);

  const expression = expressionForMood(pet.currentMood);
  if (expression === 'sad' || expression === 'ill') {
    paint(3, 5, 2, 1, colors.outline);
  } else {
    paint(3, 5, 2, 1, colors.accent);
  }
}

function getEarPath(ears) {
  if (ears === 'leaf') {
    return 'M70 94c8-34 20-54 42-66 4 32-4 54-22 72M150 94c-8-34-20-54-42-66-4 32 4 54 22 72';
  }
  if (ears === 'spike') {
    return 'M72 98l18-54 26 50M148 98l-18-54-26 50';
  }
  if (ears === 'stub') {
    return 'M78 96c6-20 18-32 34-34M142 96c-6-20-18-32-34-34';
  }
  return 'M74 98c10-28 26-44 42-52M146 98c-10-28-26-44-42-52';
}

function SvgPet({ pet, species, reactionFace = '' }) {
  const expression = expressionForMood(pet.currentMood, reactionFace);
  const scale = stageScale(pet.currentStage);
  const cheekOpacity = species.render.cheeks ? 0.75 : 0;
  const branchGlow = pet.evolutionBranch === 'bright' ? 1 : 0.35;
  const isEgg = pet.currentStage === 'egg';
  const gradientKey = `${species.id}-${pet.id || 'pet'}`;
  const bodyWidth =
    species.render.body === 'bolt' ? 60 : species.render.body === 'seed' ? 58 : 64;
  const bellyWidth = species.render.body === 'bolt' ? 48 : 54;
  const outlineColor = species.colors.outline;

  return (
    <svg viewBox="0 0 220 220" className="pet-svg" style={{ '--pet-scale': scale }}>
      <defs>
        <radialGradient id={`pet-main-${gradientKey}`} cx="32%" cy="28%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.82" />
          <stop offset="65%" stopColor={species.colors.primary} />
          <stop offset="100%" stopColor={species.colors.secondary} stopOpacity="0.92" />
        </radialGradient>
        <linearGradient id={`pet-rim-${gradientKey}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor={species.colors.secondary} stopOpacity="0.74" />
        </linearGradient>
        <radialGradient id={`pet-belly-${gradientKey}`} cx="50%" cy="24%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.86" />
          <stop offset="100%" stopColor={species.colors.secondary} stopOpacity="0.36" />
        </radialGradient>
        <radialGradient id={`pet-aura-${gradientKey}`} cx="50%" cy="50%">
          <stop offset="0%" stopColor={species.colors.accent} stopOpacity="0.34" />
          <stop offset="100%" stopColor={species.colors.accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      {isEgg ? (
        <g className="pet-character pet-character--egg">
          <ellipse
            className="pet-character__aura"
            cx="110"
            cy="126"
            rx="78"
            ry="84"
            fill={`url(#pet-aura-${gradientKey})`}
          />
          <ellipse cx="110" cy="126" rx="64" ry="80" fill={`url(#pet-main-${gradientKey})`} />
          <ellipse
            cx="110"
            cy="138"
            rx="56"
            ry="64"
            fill={`url(#pet-belly-${gradientKey})`}
            opacity="0.64"
          />
          <ellipse cx="92" cy="88" rx="22" ry="12" fill="#ffffff" opacity="0.48" />
          <path
            d="M84 92l14 14-18 20 16 10-12 16"
            stroke={species.colors.secondary}
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M140 86l-14 18 18 16-14 18"
            stroke={species.colors.accent}
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <ellipse cx="110" cy="192" rx="44" ry="10" fill={outlineColor} opacity="0.12" />
        </g>
      ) : (
        <g
          transform={`translate(110 112) scale(${scale}) translate(-110 -112)`}
          className={`pet-character pet-character--${expression}`}
        >
          <ellipse
            className="pet-character__aura"
            cx="110"
            cy="126"
            rx="82"
            ry="72"
            fill={`url(#pet-aura-${gradientKey})`}
          />
          <g className="pet-character__ears">
            <path
              d={getEarPath(species.render.ears)}
              stroke={`url(#pet-rim-${gradientKey})`}
              strokeWidth="14"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d={getEarPath(species.render.ears)}
              stroke={species.colors.secondary}
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
          <ellipse
            className="pet-character__foot pet-character__foot--left"
            cx="84"
            cy="170"
            rx="18"
            ry="12"
            fill={species.colors.secondary}
            opacity="0.8"
          />
          <ellipse
            className="pet-character__foot pet-character__foot--right"
            cx="136"
            cy="170"
            rx="18"
            ry="12"
            fill={species.colors.secondary}
            opacity="0.8"
          />
          <ellipse
            className="pet-character__shell"
            cx="110"
            cy="124"
            rx={bodyWidth}
            ry="60"
            fill={`url(#pet-main-${gradientKey})`}
          />
          <ellipse
            className="pet-character__rim"
            cx="110"
            cy="120"
            rx={bodyWidth - 6}
            ry="50"
            fill={`url(#pet-rim-${gradientKey})`}
            opacity="0.26"
          />
          <ellipse
            className="pet-character__belly"
            cx="110"
            cy="140"
            rx={bellyWidth}
            ry="36"
            fill={`url(#pet-belly-${gradientKey})`}
          />
          <ellipse
            className="pet-character__shine"
            cx="88"
            cy="94"
            rx="24"
            ry="14"
            fill="#ffffff"
            opacity="0.46"
          />
          <ellipse
            className="pet-character__shine pet-character__shine--small"
            cx="144"
            cy="118"
            rx="10"
            ry="7"
            fill="#ffffff"
            opacity="0.18"
          />
          {expression === 'sleep' ? (
            <g className="pet-character__face">
              <path
                className="pet-character__eye-sleep"
                d="M78 112c8-8 18-8 26 0"
                stroke={outlineColor}
                strokeWidth="7"
                strokeLinecap="round"
                fill="none"
              />
              <path
                className="pet-character__eye-sleep"
                d="M116 112c8-8 18-8 26 0"
                stroke={outlineColor}
                strokeWidth="7"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          ) : (
            <g className="pet-character__face">
              <g className="pet-character__eye-group">
                <ellipse
                  className="pet-character__eye"
                  cx="88"
                  cy="112"
                  rx="11"
                  ry={expression === 'ill' ? 6 : expression === 'playful' ? 5 : 12}
                  fill={outlineColor}
                />
                <ellipse
                  className="pet-character__eye"
                  cx="132"
                  cy="112"
                  rx="11"
                  ry={expression === 'ill' ? 6 : expression === 'playful' ? 12 : 12}
                  fill={outlineColor}
                />
                <ellipse
                  className="pet-character__eye-shine"
                  cx="84"
                  cy="106"
                  rx="3"
                  ry="4"
                  fill="#ffffff"
                  opacity="0.9"
                />
                <ellipse
                  className="pet-character__eye-shine"
                  cx="128"
                  cy="106"
                  rx="3"
                  ry="4"
                  fill="#ffffff"
                  opacity="0.9"
                />
              </g>
            </g>
          )}
          <ellipse
            cx="82"
            cy="134"
            rx="12"
            ry="8"
            fill={species.colors.accent}
            opacity={expression === 'blush' ? 1 : cheekOpacity}
          />
          <ellipse
            cx="138"
            cy="134"
            rx="12"
            ry="8"
            fill={species.colors.accent}
            opacity={expression === 'blush' ? 1 : cheekOpacity}
          />
          <path
            className="pet-character__mouth"
            d={
              expression === 'shocked'
                ? 'M102 142c4-5 12-5 16 0 3 4 3 12 0 16-4 5-12 5-16 0-3-4-3-12 0-16'
                : expression === 'sad' || expression === 'ill'
                ? 'M92 150c10-8 26-8 36 0'
                : expression === 'happy'
                  ? 'M88 144c10 16 34 16 44 0'
                  : expression === 'playful'
                    ? 'M92 144c12 12 26 12 36 0'
                    : 'M94 146c8 6 24 6 32 0'
            }
            stroke={outlineColor}
            strokeWidth="8"
            strokeLinecap="round"
            fill={expression === 'shocked' ? '#ffffff' : 'none'}
          />
          <circle className="pet-character__nose" cx="110" cy="136" r="4" fill={outlineColor} opacity="0.4" />
          {pet.evolutionBranch ? (
            <g className="pet-character__orbit" opacity={branchGlow}>
              <circle cx="164" cy="82" r="9" fill={species.colors.accent} />
              <circle cx="174" cy="70" r="4" fill="#ffffff" opacity="0.7" />
              <circle cx="154" cy="68" r="3" fill="#ffffff" opacity="0.56" />
            </g>
          ) : null}
          <ellipse cx="110" cy="194" rx="46" ry="10" fill={outlineColor} opacity="0.1" />
        </g>
      )}
    </svg>
  );
}

export default function PetScene({
  pet,
  themeId,
  reaction = 'tap',
  compact = false,
  interactive = false,
  showMedicineTool = false,
  clockNow = Date.now(),
  reactionBubble = null,
  reducedMotion = false,
  onPetTap,
  onInteractionComplete
}) {
  const canvasRef = useRef(null);
  const roomRef = useRef(null);
  const pointerActiveRef = useRef(false);
  const activeModeRef = useRef('');
  const visitedCellsRef = useRef(new Set());
  const feedDropCountRef = useRef(0);
  const feedWasInsideRef = useRef(false);
  const sleepProgressRef = useRef(0);
  const completeFiredRef = useRef(false);
  const burstTimersRef = useRef([]);

  const [toolPosition, setToolPosition] = useState({ x: 0.5, y: 0.72, visible: false });
  const [activeMode, setActiveMode] = useState('');
  const [interactionProgress, setInteractionProgress] = useState(0);
  const [bursts, setBursts] = useState([]);

  const species = PET_TYPE_MAP[pet.speciesId];
  const theme = THEME_MAP[themeId] || THEME_MAP.soft3d;
  const stats = pet.stats || { ...pet.statsPreview, messCount: 0 };
  const status = pet.status || pet.statusPreview || {};
  const sleepingNow = Boolean(status?.isSleeping || status?.lightsOff);
  const manualDayMode = status?.asleepUntil === -1 && !status?.lightsOff;
  const roomPeriod = sleepingNow ? 'night' : manualDayMode ? 'day' : getSceneTimePeriod(clockNow);
  const cleanMode = activeMode === 'clean';
  const feedMode = activeMode === 'feed';
  const playMode = activeMode === 'play';
  const sleepMode = activeMode === 'sleep';
  const medicineMode = activeMode === 'medicine';
  const pokeFace = reaction === 'laugh' || reaction === 'smile' || reaction === 'proud' || reaction === 'sparkle'
    ? 'happy'
    : reaction === 'blush'
      ? 'blush'
      : reaction === 'sleepy'
        ? 'sleep'
        : reaction === 'shocked'
          ? 'shocked'
          : reaction === 'silly'
            ? 'playful'
            : '';
  const scrubGoal = 0.72;
  const feedGoal = 1;
  const dustAlpha = Math.max(0, 1 - interactionProgress);
  const dustSpots = [
    { left: '22%', top: '26%' },
    { left: '70%', top: '24%' },
    { left: '58%', top: '42%' },
    { left: '34%', top: '58%' },
    { left: '78%', top: '64%' }
  ];

  useEffect(() => {
    if (theme.family === 'retro') {
      drawRetroPet(canvasRef.current, pet, species);
    }
  }, [theme.family, pet, species]);

  useEffect(() => {
    return () => {
      burstTimersRef.current.forEach((id) => window.clearTimeout(id));
      burstTimersRef.current = [];
    };
  }, []);

  const moodClass = useMemo(() => {
    if (status?.careCenterRest) return 'is-resting';
    if (sleepingNow) return 'is-sleeping';
    if (status?.isSick) return 'is-sick';
    if (stats.messCount > 0) return 'is-messy';
    return 'is-content';
  }, [sleepingNow, stats.messCount, status]);

  const finishInteraction = (mode, relX = 0.5, relY = 0.6) => {
    const burst = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      x: relX,
      y: relY,
      icon: TOOL_ICONS[mode] || TOOL_ICONS.sparkle
    };
    setBursts((current) => [...current, burst]);
    const timer = window.setTimeout(() => {
      setBursts((current) => current.filter((item) => item.id !== burst.id));
    }, 520);
    burstTimersRef.current.push(timer);

    pointerActiveRef.current = false;
    activeModeRef.current = '';
    completeFiredRef.current = false;
    setActiveMode('');
    setInteractionProgress(0);
    setToolPosition((current) => ({ ...current, visible: false }));

    if (typeof onInteractionComplete === 'function') {
      onInteractionComplete(mode);
    }
  };

  const resetModeState = (mode) => {
    activeModeRef.current = mode;
    setActiveMode(mode);
    setInteractionProgress(0);
    visitedCellsRef.current = new Set();
    feedDropCountRef.current = 0;
    feedWasInsideRef.current = false;
    sleepProgressRef.current = 0;
    completeFiredRef.current = false;
  };

  const handleInteractionPoint = (mode, clientX, clientY) => {
    if (!mode || !roomRef.current) return;
    const rect = roomRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const x = Math.min(rect.width, Math.max(0, clientX - rect.left));
    const y = Math.min(rect.height, Math.max(0, clientY - rect.top));
    const relX = x / rect.width;
    const relY = y / rect.height;
    setToolPosition({ x: relX, y: relY, visible: true });

    if (mode === 'clean') {
      const key = getCoverageCell(relX, relY);
      if (visitedCellsRef.current.has(key)) return;
      visitedCellsRef.current.add(key);
      const progress = getCoverageProgress(visitedCellsRef.current.size);
      setInteractionProgress(progress);
      if (progress >= scrubGoal && !completeFiredRef.current) {
        completeFiredRef.current = true;
        finishInteraction('clean', relX, relY);
      }
      return;
    }

    if (mode === 'feed' || mode === 'medicine') {
      const insideTarget = isFeedTargetHit(relX, relY);
      if (insideTarget && !feedWasInsideRef.current) {
        feedDropCountRef.current += 1;
        const required = mode === 'medicine' ? 1 : 3;
        const progress = getFeedDeliveryProgress(feedDropCountRef.current, required);
        setInteractionProgress(progress);
        if (progress >= feedGoal && !completeFiredRef.current) {
          completeFiredRef.current = true;
          finishInteraction(mode, relX, relY);
        }
      }
      feedWasInsideRef.current = insideTarget;
      return;
    }

    if (mode === 'play') {
      if (!isPlayTargetHit(relX, relY)) return;
      const key = getPlayTargetCell(relX, relY);
      if (visitedCellsRef.current.has(key)) return;
      visitedCellsRef.current.add(key);
      const progress = getCoverageProgress(visitedCellsRef.current.size, 6, 6);
      setInteractionProgress(progress);
      if (progress >= 0.58 && !completeFiredRef.current) {
        completeFiredRef.current = true;
        finishInteraction('play', relX, relY);
      }
      return;
    }

    if (mode === 'sleep') {
      const next = Math.max(sleepProgressRef.current, getSleepPullProgress(relY));
      sleepProgressRef.current = next;
      setInteractionProgress(next);
      if (next >= 0.98 && !completeFiredRef.current) {
        completeFiredRef.current = true;
        finishInteraction('sleep', relX, relY);
      }
    }
  };

  const handlePointerDown = (event) => {
    if (!interactive) return;
    const source = event.target.closest?.('[data-tool]');
    if (!source) {
      const petBody = event.target.closest?.('[data-pet-body]');
      if (petBody && typeof onPetTap === 'function') {
        onPetTap();
      }
      return;
    }
    const mode = source.getAttribute('data-tool') || '';
    if (!mode) return;

    if (mode === 'sleep' || mode === 'wake') {
      finishInteraction(mode, 0.5, 0.18);
      return;
    }

    if (activeModeRef.current !== mode) {
      resetModeState(mode);
    }
    pointerActiveRef.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    handleInteractionPoint(mode, event.clientX, event.clientY);
  };

  const handlePointerMove = (event) => {
    const mode = activeModeRef.current;
    if (!mode || !pointerActiveRef.current) return;
    handleInteractionPoint(mode, event.clientX, event.clientY);
  };

  const handlePointerUp = () => {
    pointerActiveRef.current = false;
    feedWasInsideRef.current = false;
    setToolPosition((current) => ({ ...current, visible: false }));
  };

  return (
    <div className={`pet-scene ${theme.roomClass} ${moodClass}${compact ? ' is-compact' : ''}`}>
      <div
        ref={roomRef}
        className={`pet-scene__room pet-scene__room--${roomPeriod}${activeMode ? ' is-clean-mode' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div className="pet-scene__aurora" />
        <div className="pet-scene__sun" />
        <div className="pet-scene__stars" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="pet-scene__window" />
        <div className="pet-scene__window-glow" />
        <div className="pet-scene__floor" />
        <div className="pet-scene__shadow" />
        <div className={`pet-scene__magic${sleepingNow ? ' is-sleeping' : ''}`} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className={`pet-avatar pet-avatar--${reaction}`}>
          <div className="pet-avatar__halo" aria-hidden="true" />
          {reactionBubble?.text ? (
            <div className={`pet-scene__reaction-bubble pet-scene__reaction-bubble--${reactionBubble.kind || 'poke'}`}>
              {reactionBubble.text}
            </div>
          ) : null}
          {theme.family === 'retro' ? (
            <canvas ref={canvasRef} className="pet-retro-canvas" width="200" height="180" />
          ) : (
            <div
              className={`pet-avatar__body${typeof onPetTap === 'function' ? ' is-tappable' : ''}${reducedMotion ? ' is-reduced-motion' : ''}`}
              data-pet-body="true"
            >
              <SvgPet pet={pet} species={species} reactionFace={pokeFace} />
            </div>
          )}
        </div>
        {sleepingNow ? (
          <div className="pet-scene__sleepy" aria-hidden="true">
            <span>Z</span>
            <span>Z</span>
            <span>Z</span>
          </div>
        ) : null}
        {sleepingNow ? <div className="scene-badge">Sleep</div> : null}
        {status?.isSick ? <div className="scene-badge scene-badge--ill">Sick</div> : null}
        {stats.messCount > 0 ? <div className="scene-badge scene-badge--mess">Mess x{stats.messCount}</div> : null}
        {status?.careCenterRest ? <div className="scene-overlay-copy">Care Center Rest</div> : null}

        {activeMode ? (
          <>
            <div className="clean-overlay">
              <div className="clean-overlay__head">
                <span>
                  {cleanMode
                    ? 'Scrub to clean'
                    : feedMode
                      ? 'Drag food to mouth'
                      : playMode
                        ? 'Tickle Buddy'
                        : medicineMode
                          ? 'Give medicine'
                          : sleepMode
                            ? 'Pull down to sleep'
                            : 'Wake up'}
                </span>
                <strong>{Math.round(interactionProgress * 100)}%</strong>
              </div>
              <div className="clean-overlay__track">
                <div
                  className="clean-overlay__fill"
                  style={{ width: `${Math.round(Math.min(100, interactionProgress * 100))}%` }}
                />
              </div>
            </div>

            {cleanMode
              ? dustSpots.map((spot, index) => (
                <div
                  key={`dust-${index}`}
                  className="clean-dust"
                  style={{
                    left: spot.left,
                    top: spot.top,
                    opacity: Math.max(0, dustAlpha - index * 0.08)
                  }}
                />
              ))
              : (
                <>
                  {(feedMode || medicineMode) ? <div className="feed-target-ring" aria-hidden="true" /> : null}
                  {playMode ? <div className="play-target-glow" aria-hidden="true" /> : null}
                  {sleepMode ? <div className="sleep-target-band" aria-hidden="true" /> : null}
                </>
              )}

            <div
              className={`clean-tool${toolPosition.visible ? ' is-visible' : ''}`}
              style={{
                left: `${Math.round(toolPosition.x * 100)}%`,
                top: `${Math.round(toolPosition.y * 100)}%`
              }}
              aria-hidden="true"
            >
              {cleanMode
                ? TOOL_ICONS.clean
                : feedMode
                  ? TOOL_ICONS.feed
                  : playMode
                    ? TOOL_ICONS.play
                    : medicineMode
                      ? TOOL_ICONS.medicine
                      : sleepMode
                        ? TOOL_ICONS.sleep
                        : TOOL_ICONS.wake}
            </div>

            {sleepMode ? (
              <div
                className="sleep-curtain"
                style={{ height: `${Math.round(Math.min(100, interactionProgress * 100))}%` }}
                aria-hidden="true"
              />
            ) : null}
          </>
        ) : null}

        {interactive && !compact ? (
          <div className="tool-bar">
            <button type="button" className="tool-source tool-source--feed" data-tool="feed" aria-label="Feed">
              {TOOL_ICONS.feed}
            </button>
            <button type="button" className="tool-source tool-source--play" data-tool="play" aria-label="Play">
              {TOOL_ICONS.play}
            </button>
            <button type="button" className="tool-source tool-source--clean" data-tool="clean" aria-label="Clean">
              {TOOL_ICONS.clean}
            </button>
            <button
              type="button"
              className="tool-source tool-source--sleep"
              data-tool={sleepingNow ? 'wake' : 'sleep'}
              aria-label={sleepingNow ? 'Wake up' : 'Sleep'}
            >
              {sleepingNow ? TOOL_ICONS.wake : TOOL_ICONS.sleep}
            </button>
            {showMedicineTool ? (
              <button type="button" className="tool-source tool-source--medicine" data-tool="medicine" aria-label="Medicine">
                {TOOL_ICONS.medicine}
              </button>
            ) : null}
          </div>
        ) : null}

        {bursts.map((burst) => (
          <span
            key={burst.id}
            className="scene-burst"
            style={{
              left: `${Math.round(burst.x * 100)}%`,
              top: `${Math.round(burst.y * 100)}%`
            }}
            aria-hidden="true"
          >
            {burst.icon}
          </span>
        ))}
      </div>
    </div>
  );
}
