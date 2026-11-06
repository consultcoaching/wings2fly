const SIZE = 240;
const CENTER = SIZE / 2;
const PROGRESS_R = 112;
const CIRCUMFERENCE = 2 * Math.PI * PROGRESS_R;
const RINGS = [
  { r: 104, opacity: 0.35 },
  { r: 84, opacity: 0.55 },
  { r: 64, opacity: 0.8 },
];

/* Drie concentrische ringen die meeademen, een progress-ring die de fase
 * aftelt, en centraal teller + fase. Animatieduur = faseduur, zodat de
 * beweging zelf het tempo aangeeft. Bij verminderde animatie: ringen
 * statisch, progress-ring stapt per seconde zonder overgang. */
export default function BreathRings({
  running,
  phase,
  secondsLeft,
  duration,
  phaseCount,
  reducedMotion,
  label,
}) {
  const stateClass = running ? phase : 'idle';
  const safeDuration = Math.max(duration || 1, 1);
  const elapsed = running ? safeDuration - secondsLeft : 0;
  const staticOffset = CIRCUMFERENCE * (1 - elapsed / safeDuration);

  const progressStyle = reducedMotion
    ? { strokeDashoffset: staticOffset }
    : running
      ? { animation: `ring-progress ${safeDuration}s linear forwards` }
      : { strokeDashoffset: CIRCUMFERENCE };

  return (
    <div className={`breath ${stateClass}`} aria-hidden="true">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="breath-svg">
        <circle
          className="breath-track"
          cx={CENTER}
          cy={CENTER}
          r={PROGRESS_R}
          fill="none"
          strokeWidth="6"
        />
        <circle
          key={`${phaseCount}-${running ? 'run' : 'idle'}`}
          className="breath-progress"
          cx={CENTER}
          cy={CENTER}
          r={PROGRESS_R}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          style={progressStyle}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
        />
        <g className="breath-rings" style={{ transitionDuration: `${safeDuration}s` }}>
          {RINGS.map((ring) => (
            <circle
              key={ring.r}
              cx={CENTER}
              cy={CENTER}
              r={ring.r}
              fill="none"
              strokeWidth="2"
              style={{ opacity: ring.opacity }}
            />
          ))}
        </g>
      </svg>
      <div className="breath-center">
        <div className="breath-count">{running ? secondsLeft : 'Klaar'}</div>
        {running && <div className="breath-phase">{label}</div>}
      </div>
    </div>
  );
}

export { CIRCUMFERENCE };
