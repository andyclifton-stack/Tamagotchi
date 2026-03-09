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

function expressionForMood(mood) {
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
  } else {
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
}

function SvgPet({ pet, species }) {
  const expression = expressionForMood(pet.currentMood);
  const scale = stageScale(pet.currentStage);
  const cheekOpacity = species.render.cheeks ? 1 : 0;
  const branchGlow = pet.evolutionBranch === 'bright' ? 1 : 0.35;
  const isEgg = pet.currentStage === 'egg';

  return (
    <svg viewBox="0 0 220 220" className="pet-svg" style={{ '--pet-scale': scale }}>
      <defs>
        <radialGradient id={`pet-main-${species.id}`} cx="30%" cy="30%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
          <stop offset="100%" stopColor={species.colors.primary} />
        </radialGradient>
      </defs>
      {isEgg ? (
        <>
          <ellipse cx="110" cy="120" rx="62" ry="76" fill={species.colors.primary} />
          <path d="M84 92l14 14-18 20 16 10-12 16" stroke={species.colors.secondary} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M140 86l-14 18 18 16-14 18" stroke={species.colors.accent} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      ) : (
        <>
          <g transform={`translate(110 110) scale(${scale}) translate(-110 -110)`}>
            <ellipse cx="110" cy="122" rx={species.render.body === 'bolt' ? 56 : 62} ry="58" fill={`url(#pet-main-${species.id})`} />
            <ellipse cx="110" cy="136" rx="56" ry="34" fill={species.colors.secondary} opacity="0.25" />
            <path
              d={
                species.render.ears === 'leaf'
                  ? 'M76 72c8-20 20-34 30-38-2 22-10 34-22 44M144 72c-8-20-20-34-30-38 2 22 10 34 22 44'
                  : species.render.ears === 'spike'
                    ? 'M72 76l18-36 18 34M148 76l-18-36-18 34'
                    : species.render.ears === 'stub'
                      ? 'M78 78c4-16 12-24 22-28M142 78c-4-16-12-24-22-28'
                      : 'M80 76c6-18 16-28 24-32M140 76c-6-18-16-28-24-32'
              }
              stroke={species.colors.secondary}
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <ellipse cx="88" cy="110" rx="8" ry={expression === 'sleep' ? 2 : 9} fill={species.colors.outline} />
            <ellipse cx="132" cy="110" rx="8" ry={expression === 'sleep' ? 2 : 9} fill={species.colors.outline} />
            <ellipse cx="84" cy="132" rx="10" ry="6" fill={species.colors.accent} opacity={cheekOpacity} />
            <ellipse cx="136" cy="132" rx="10" ry="6" fill={species.colors.accent} opacity={cheekOpacity} />
            <path
              d={
                expression === 'sad' || expression === 'ill'
                  ? 'M90 150c10-8 30-8 40 0'
                  : expression === 'happy'
                    ? 'M86 142c10 18 38 18 48 0'
                    : 'M92 144c8 6 28 6 36 0'
              }
              stroke={species.colors.outline}
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
            />
            {pet.evolutionBranch ? (
              <circle cx="164" cy="78" r="14" fill={species.colors.accent} opacity={branchGlow} />
            ) : null}
          </g>
        </>
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
  const cleanMode = activeMode === 'clean';
  const feedMode = activeMode === 'feed';
  const playMode = activeMode === 'play';
  const sleepMode = activeMode === 'sleep';
  const medicineMode = activeMode === 'medicine';
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
    if (status?.isSleeping) return 'is-sleeping';
    if (status?.isSick) return 'is-sick';
    if (stats.messCount > 0) return 'is-messy';
    return 'is-content';
  }, [stats.messCount, status]);

  const finishInteraction = (mode, relX = 0.5, relY = 0.6) => {
    const iconMap = {
      clean: '✨',
      feed: '🍎',
      play: '🎉',
      sleep: '🌙',
      medicine: '💚'
    };
    const burst = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      x: relX,
      y: relY,
      icon: iconMap[mode] || '✨'
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
      const next = Math.max(
        sleepProgressRef.current,
        getSleepPullProgress(relY)
      );
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
    if (!source) return;
    const mode = source.getAttribute('data-tool') || '';
    if (!mode) return;

    resetModeState(mode);
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
        className={`pet-scene__room pet-scene__room--${pet.timeOfDay || 'day'}${activeMode ? ' is-clean-mode' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div className="pet-scene__sun" />
        <div className="pet-scene__window" />
        <div className="pet-scene__floor" />
        <div className="pet-scene__shadow" />
        <div className={`pet-avatar pet-avatar--${reaction}`}>
          {theme.family === 'retro' ? (
            <canvas ref={canvasRef} className="pet-retro-canvas" width="200" height="180" />
          ) : (
            <SvgPet pet={pet} species={species} />
          )}
        </div>
        {status?.isSleeping ? <div className="scene-badge">Sleep</div> : null}
        {status?.isSick ? <div className="scene-badge scene-badge--ill">Sick</div> : null}
        {stats.messCount > 0 ? <div className="scene-badge scene-badge--mess">Mess x{stats.messCount}</div> : null}
        {status?.careCenterRest ? <div className="scene-overlay-copy">Care Center Rest</div> : null}
        {activeMode ? (
          <>
            <div className="clean-overlay">
              <div className="clean-overlay__head">
                <span>{cleanMode ? 'Scrub to clean' : feedMode ? 'Drag food to mouth' : playMode ? 'Tickle Buddy' : medicineMode ? 'Give medicine' : 'Pull down to sleep'}</span>
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
              {cleanMode ? 'S' : feedMode ? '🍎' : playMode ? '🪶' : medicineMode ? '💊' : '🌙'}
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
            <button type="button" className="tool-source tool-source--feed" data-tool="feed">
              🍎
            </button>
            <button type="button" className="tool-source tool-source--play" data-tool="play">
              🪶
            </button>
            <button type="button" className="tool-source tool-source--clean" data-tool="clean">
              S
            </button>
            <button type="button" className="tool-source tool-source--sleep" data-tool="sleep">
              🌙
            </button>
            {showMedicineTool ? (
              <button type="button" className="tool-source tool-source--medicine" data-tool="medicine">
                💊
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
