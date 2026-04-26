import { createElement, memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useSpring } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../AuthContext';
import { BrandLockup } from '../components/BrandLogo';
import Button from '../components/Button';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../constants/demoAccount';

const APP_LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
];

const TRUST_SIGNALS = [
  {
    eyebrow: 'Continuity',
    title: 'Every symptom becomes part of a living record.',
    detail:
      'Instead of isolated logs, the system accumulates context so clinicians can understand velocity, recurrence, and drift at a glance.',
    iconPath: 'M4 13h4l2-8 4 14 2-6h4',
  },
  {
    eyebrow: 'Signal',
    title: 'Patterns surface without visual clutter.',
    detail:
      'The interface is quiet on purpose, which makes deviations, persistent symptoms, and recovery arcs feel immediate and unmistakable.',
    iconPath: 'M4 18l6-6 4 4 6-8M4 6h16',
  },
  {
    eyebrow: 'Privacy',
    title: 'Sensitive health data stays protected by default.',
    detail:
      'Encryption, consent boundaries, and restrained data surfaces are treated as part of the product experience, not a legal footnote.',
    iconPath: 'M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4zm0 6v4m0 4h.01',
  },
];

const WORKFLOW_STEPS = [
  {
    number: '01',
    title: 'Capture subtle change',
    description:
      'Log symptoms, intensity, and daily notes in a flow that feels precise enough for care and effortless enough for habit.',
    iconPath: 'M8 7h8M8 12h8m-8 5h5M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z',
  },
  {
    number: '02',
    title: 'Model the trajectory',
    description:
      'Temporal analysis transforms individual check-ins into a coherent narrative, revealing progression, stability, or recovery.',
    iconPath: 'M4 18l6-6 4 4 6-8M4 6h16',
  },
  {
    number: '03',
    title: 'Act with clinical clarity',
    description:
      'Review the record, understand the pattern, and bring sharper context into every decision or appointment that follows.',
    iconPath: 'M9 17v-3m3 3v-6m3 6V9M7 21h10a2 2 0 002-2V7.414a2 2 0 00-.586-1.414l-3.414-3.414A2 2 0 0013.586 2H7a2 2 0 00-2 2v15a2 2 0 002 2z',
  },
];

const FEATURE_CARDS = [
  {
    eyebrow: 'Timeline',
    title: 'A longitudinal view that behaves like product, not paperwork.',
    description:
      'Symptoms, reports, and inferred shifts live in one continuous visual system so the story of change remains readable over time.',
    metric: 'Unified health narrative',
    iconPath: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    className: 'md:col-span-7',
  },
  {
    eyebrow: 'Analysis',
    title: 'AI outputs designed to be read by humans.',
    description:
      'Risk summaries, pattern detection, and contextual prompts feel deliberate, legible, and calm rather than machine-generated noise.',
    metric: 'Readable intelligence',
    iconPath: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
    className: 'md:col-span-5',
  },
  {
    eyebrow: 'Tracking',
    title: 'Clean inputs produce trustworthy signals.',
    description:
      'Structured symptom capture keeps the downstream analysis stable by reducing ambiguity before it ever enters the system.',
    metric: 'Higher data fidelity',
    iconPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    className: 'md:col-span-4',
  },
  {
    eyebrow: 'Access',
    title: 'Localized by design, not translated as an afterthought.',
    description:
      'Multilingual support is integrated into the product architecture so access scales without diluting tone, clarity, or trust.',
    metric: 'Five-language system',
    iconPath: 'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129',
    className: 'md:col-span-8',
  },
];

const SECURITY_PILLARS = [
  {
    title: 'Consent-led sharing',
    description: 'The patient remains in control of where sensitive context moves and who sees it next.',
  },
  {
    title: 'Protected transport and storage',
    description: 'The infrastructure treats security as part of the interaction model, not a separate compliance layer.',
  },
  {
    title: 'Outputs built for real review',
    description: 'Exports, alerts, and summaries remain concise enough for human judgment inside clinical workflows.',
  },
];

const FOOTER_COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', to: '/#features' },
      { label: 'Workflow', to: '/#workflow' },
      { label: 'Security', to: '/#security' },
    ],
  },
  {
    title: 'Access',
    links: [
      { label: 'Create Account', to: '/signup' },
      { label: 'Sign In', to: '/login' },
      { label: 'About CareTrace', to: '/#about' },
    ],
  },
];

const DASHBOARD_METRICS = [
  {
    label: 'Resting HR',
    value: '62',
    unit: 'bpm',
    iconPath: 'M4 13h3l2-7 4 13 2-6h3',
  },
  {
    label: 'Sleep Recovery',
    value: '08.4',
    unit: 'hrs',
    iconPath: 'M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z',
  },
];

const GRAPH_BASE_POINTS = [
  { label: 'Jan', x: 32, y: 122, value: 58 },
  { label: 'Feb', x: 92, y: 110, value: 64 },
  { label: 'Mar', x: 154, y: 82, value: 73 },
  { label: 'Apr', x: 222, y: 58, value: 84 },
  { label: 'May', x: 286, y: 74, value: 79 },
  { label: 'Jun', x: 348, y: 38, value: 92 },
];

const GRAPH_GUIDES = ['100', '80', '60', '40'];
const GRAPH_WIDTH = 400;
const GRAPH_HEIGHT = 176;
const GRAPH_FLOOR = 160;

// ── Motion system: 3 tiers, all spring-based (no cubic-bezier durations) ──────
const heroSpring  = { type: 'spring', stiffness: 120, damping: 22 };
const cardSpring  = { type: 'spring', stiffness: 300, damping: 30 };
const microSpring = { type: 'spring', stiffness: 380, damping: 32, mass: 0.45 };

const cx = (...classes) => classes.filter(Boolean).join(' ');
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const frameClass = 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8';
const surfaceToneClass =
  'bg-[var(--color-surface)] [box-shadow:inset_0_0.5px_0_var(--color-surface-light),0_0_0_0.5px_var(--color-surface-border),0_24px_72px_rgba(0,0,0,0.52)]';
const elevatedToneClass =
  'bg-[var(--color-elevated)] backdrop-blur-2xl [box-shadow:inset_0_1px_0_var(--color-elevated-light),0_0_0_1px_var(--color-elevated-border),0_36px_120px_rgba(0,0,0,0.68),0_0_52px_var(--color-accent-shadow)]';
const eyebrowClass =
  'text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-tertiary)]';
const sectionTitleClass =
  'text-4xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)] sm:text-5xl';
const sectionCopyClass =
  'max-w-[40rem] text-base leading-8 tracking-normal text-[var(--color-text-secondary)] sm:text-lg';
const cardTitleClass =
  'text-2xl font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]';
const bodyCopyClass =
  'text-base leading-8 tracking-normal text-[var(--color-text-secondary)]';
function createOrganicSeries() {
  return GRAPH_BASE_POINTS.map((point, index) => {
    if (index === 0 || index === GRAPH_BASE_POINTS.length - 1) {
      return point;
    }

    const xShift = (Math.random() * 18) - 9;
    const yShift = (Math.random() * 16) - 8;
    const valueShift = Math.round((Math.random() * 6) - 3);

    return {
      ...point,
      x: clamp(point.x + xShift, 20, 380),
      y: clamp(point.y + yShift, 28, 132),
      value: point.value + valueShift,
    };
  });
}

function buildLinePath(points) {
  if (points.length === 0) {
    return '';
  }

  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const midpointX = previous.x + ((point.x - previous.x) / 2);

    return `${path} C ${midpointX} ${previous.y}, ${midpointX} ${point.y}, ${point.x} ${point.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
}

function buildAreaPath(points) {
  if (points.length === 0) {
    return '';
  }

  const linePath = buildLinePath(points);
  const last = points[points.length - 1];
  const first = points[0];

  return `${linePath} L ${last.x} ${GRAPH_FLOOR} L ${first.x} ${GRAPH_FLOOR} Z`;
}

function getNearestPointIndex(points, ratio) {
  const targetX = ratio * GRAPH_WIDTH;

  return points.reduce((closestIndex, point, index) => {
    const closestPoint = points[closestIndex];
    return Math.abs(point.x - targetX) < Math.abs(closestPoint.x - targetX) ? index : closestIndex;
  }, 0);
}

function Icon({ path, className = 'h-5 w-5' }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

function Panel({ as = 'div', tone = 'surface', children, className = '', ...props }) {
  const toneClass = tone === 'elevated' ? elevatedToneClass : tone === 'bare' ? '' : surfaceToneClass;
  return createElement(as, { className: cx('relative rounded-[32px]', toneClass, className), ...props }, children);
}

function SectionHeader({ eyebrow, title, description, align = 'center' }) {
  const alignmentClass = align === 'left' ? 'items-start text-left' : 'items-center text-center';

  return (
    <div className={cx('flex flex-col gap-4', alignmentClass)}>
      <span className={eyebrowClass}>{eyebrow}</span>
      <h2 className={sectionTitleClass}>{title}</h2>
      <p className={sectionCopyClass}>{description}</p>
    </div>
  );
}

function FeatureCard({ eyebrow, title, description, metric, iconPath, className, delay }) {
  return (
    <Panel
      as={motion.article}
      tone="surface"
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-96px' }}
      transition={{ ...cardSpring, delay }}
      className={cx('flex h-full flex-col justify-between p-6 sm:p-8', className)}
    >
      <div className="flex items-start justify-between gap-8">
        <div className="space-y-4">
          <p className={eyebrowClass}>{eyebrow}</p>
          <h3 className={cardTitleClass}>{title}</h3>
        </div>
        <div className={cx('flex h-14 w-14 items-center justify-center rounded-[16px]', elevatedToneClass)}>
          <Icon path={iconPath} className="h-5 w-5 text-[var(--landing-accent)]" />
        </div>
      </div>

      <div className="mt-8 space-y-8">
        <p className={bodyCopyClass}>{description}</p>
        <div className="flex items-center gap-4 text-sm tracking-normal text-[var(--color-text-secondary)]">
          <span className="h-px flex-1 bg-[var(--color-hairline)]" />
          <span>{metric}</span>
        </div>
      </div>
    </Panel>
  );
}

function WorkflowCard({ number, title, description, iconPath, delay }) {
  return (
    <Panel
      as={motion.article}
      tone="surface"
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-96px' }}
      transition={{ ...cardSpring, delay }}
      className="flex h-full flex-col p-6 sm:p-8"
    >
      <div className="flex items-center justify-between">
        <span className={eyebrowClass}>{number}</span>
        <div className={cx('flex h-14 w-14 items-center justify-center rounded-[16px]', elevatedToneClass)}>
          <Icon path={iconPath} className="h-5 w-5 text-[var(--landing-accent)]" />
        </div>
      </div>

      <h3 className="mt-8 text-2xl font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
        {title}
      </h3>
      <p className="mt-8 text-base leading-8 tracking-normal text-[var(--color-text-secondary)]">
        {description}
      </p>
    </Panel>
  );
}

const DashboardMockup = memo(function DashboardMockup() {
  const gradientId = useId().replace(/:/g, '');
  const areaGradientId = `landing-area-${gradientId}`;
  const strokeGradientId = `landing-stroke-${gradientId}`;
  const series = useMemo(() => createOrganicSeries(), []);
  const [activePointIndex, setActivePointIndex] = useState(series.length - 1);
  const [isGraphActive, setIsGraphActive] = useState(false);
  const crosshairX = useSpring(0, microSpring);
  const crosshairOpacity = useSpring(0, { type: 'spring', stiffness: 260, damping: 28, mass: 0.45 });

  const linePath = buildLinePath(series);
  const areaPath = buildAreaPath(series);
  const activePoint = series[activePointIndex];
  const tooltipPoint = isGraphActive ? activePoint : series[series.length - 1];
  const tooltipPrefersLeft = tooltipPoint.x > GRAPH_WIDTH - 104;
  const lastPoint = series[series.length - 1];
  const tooltipLeft = `${(lastPoint.x / GRAPH_WIDTH) * 100}%`;
  const tooltipTop = `${(lastPoint.y / GRAPH_HEIGHT) * 100}%`;

  const handleGraphMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const localX = clamp(event.clientX - bounds.left, 0, bounds.width);
    const ratio = bounds.width === 0 ? 0 : localX / bounds.width;

    crosshairX.set(localX);
    crosshairOpacity.set(1);
    setIsGraphActive(true);
    setActivePointIndex(getNearestPointIndex(series, ratio));
  };

  const handleGraphLeave = () => {
    crosshairOpacity.set(0);
    setIsGraphActive(false);
    setActivePointIndex(series.length - 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={heroSpring}
      // GPU layer: promotes mockup to its own compositor layer
      style={{ transform: 'translateZ(0)', willChange: 'transform' }}
      className="relative mx-auto w-full max-w-[36rem]"
    >
      {/* Glow: blur reduced on mobile via CSS class to prevent Safari frame drops */}
      <div
        aria-hidden="true"
        className="mockup-glow pointer-events-none absolute inset-x-[12%] top-12 h-48 rounded-full"
        style={{ background: 'var(--color-accent-ambient)' }}
      />

      <Panel tone="elevated" className="overflow-hidden p-6 sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 34%), linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.2) 100%)',
          }}
        />

        <div className="relative flex items-start justify-between gap-8">
          <div className="flex items-center gap-4">
            <div className={cx('flex h-12 w-12 items-center justify-center rounded-full', surfaceToneClass)}>
              <span className="text-sm font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
                SJ
              </span>
            </div>
            <div className="space-y-2">
              <p className={eyebrowClass}>Profile</p>
              <p className="text-sm font-medium tracking-normal text-[var(--color-text-primary)]">
                Sarah Jenkins
              </p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, amount: 0.45 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.4 }}
            className={cx('px-4 py-4 text-right', elevatedToneClass, 'rounded-[24px]')}
          >
            <p className={eyebrowClass}>Health Score</p>
            <div className="mt-4 flex items-baseline justify-end gap-2">
              <span className="text-4xl font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
                94
              </span>
              <span className="text-sm tracking-normal text-[var(--color-text-tertiary)]">/100</span>
            </div>
          </motion.div>
        </div>

        <div className={cx('relative mt-8 overflow-hidden rounded-[24px] p-4 sm:p-6', surfaceToneClass)}>
          <div
            className="relative aspect-[400/176] w-full"
            style={{ paddingRight: '40px' }}
            onMouseMove={handleGraphMove}
            onMouseLeave={handleGraphLeave}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%), radial-gradient(circle at 18% 0%, var(--color-accent-soft), transparent 30%)',
              }}
            />

            <motion.div
              style={{ x: crosshairX, opacity: crosshairOpacity }}
              className="pointer-events-none absolute inset-y-6 left-0 z-20 w-px bg-[var(--landing-accent)]"
            />

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.45 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.2 }}
              className="absolute left-6 right-14 top-6 bottom-12 flex flex-col justify-between"
            >
              {GRAPH_GUIDES.map((guide) => (
                <div key={guide} className="relative border-t border-dashed border-[var(--color-grid-soft)]">
                  <span className="absolute -top-4 right-2 bg-[var(--color-surface)] px-2 text-[11px] font-medium tracking-[0.15em] text-[var(--color-text-tertiary)]">
                    {guide}
                  </span>
                </div>
              ))}
            </motion.div>

            <svg
              className="absolute inset-0 h-full w-full overflow-visible"
              viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
              preserveAspectRatio="xMidYMid meet"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(226,255,50,0.28)" />
                  <stop offset="100%" stopColor="rgba(226,255,50,0)" />
                </linearGradient>
                <linearGradient id={strokeGradientId} x1="0" y1="0" x2={GRAPH_WIDTH} y2="0" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#E2FF32" />
                  <stop offset="1" stopColor="#F7FFD0" />
                </linearGradient>
              </defs>

              <motion.path
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, amount: 0.45 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.32 }}
                d={areaPath}
                fill={`url(#${areaGradientId})`}
              />

              <motion.path
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={{ once: true, amount: 0.45 }}
                transition={{ type: 'spring', stiffness: 120, damping: 24, delay: 0.24 }}
                d={linePath}
                fill="none"
                stroke={`url(#${strokeGradientId})`}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-[0_0_24px_rgba(226,255,50,0.34)]"
              />

              {series.map((point, index) => {
                const isActive = index === activePointIndex;

                return (
                  <motion.g
                    key={`${point.label}-${point.x}-${point.y}`}
                    initial={{ opacity: 0, scale: 0.75 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, amount: 0.45 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.7 + (index * 0.08) }}
                  >
                    {isActive && (
                      <motion.circle
                        cx={point.x}
                        cy={point.y}
                        r="9"
                        fill="rgba(226,255,50,0.16)"
                        animate={{ scale: isGraphActive ? 1.08 : 1 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                      />
                    )}
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={isActive ? '5.5' : '4.5'}
                      fill="#000000"
                      stroke={isActive ? '#F7FFD0' : '#E2FF32'}
                      strokeWidth={isActive ? '2.5' : '2'}
                    />
                  </motion.g>
                );
              })}
            </svg>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 1.1 }}
              className="pointer-events-none absolute z-30 h-0 w-0"
              style={{ left: tooltipLeft, top: tooltipTop }}
            >
              <motion.div
                animate={{ y: isGraphActive ? -4 : [0, -6, 0] }}
                transition={
                  isGraphActive
                    ? { type: 'spring', stiffness: 280, damping: 20 }
                    : { duration: 4.6, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }
                }
                className={cx(
                  'absolute flex items-center gap-4 rounded-full px-4 py-4',
                  elevatedToneClass,
                  tooltipPrefersLeft ? '-translate-x-full -translate-y-full' : 'left-4 -translate-y-1/2',
                )}
                style={{ boxShadow: 'var(--app-shadow-medium)' }}
              >
                <span className="h-3 w-3 rounded-full bg-[var(--landing-accent)] shadow-[0_0_28px_rgba(226,255,50,0.72)]" />
                <div className="flex items-center gap-4">
                  <div>
                    <p className={eyebrowClass}>Pattern detected</p>
                    <p className="mt-2 text-sm font-medium tracking-normal text-[var(--color-text-primary)]">
                      {tooltipPoint.label}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={eyebrowClass}>Score</p>
                    <p className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
                      {tooltipPoint.value}
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4">
          {DASHBOARD_METRICS.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.45 }}
              transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 1 + (index * 0.08) }}
              className={cx('rounded-[24px] p-4 sm:p-6', surfaceToneClass)}
            >
              <div className="flex items-center gap-4 text-[var(--color-text-tertiary)]">
                <div className={cx('flex h-10 w-10 items-center justify-center rounded-[16px]', elevatedToneClass)}>
                  <Icon path={metric.iconPath} className="h-4 w-4 text-[var(--landing-accent)]" />
                </div>
                <span className={eyebrowClass}>{metric.label}</span>
              </div>

              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-3xl font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
                  {metric.value}
                </span>
                <span className="text-sm tracking-normal text-[var(--color-text-tertiary)]">
                  {metric.unit}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

      </Panel>
    </motion.div>
  );
});

function Landing() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, isLoadingAuth, login } = useAuth();
  const { t, i18n } = useTranslation();
  const [demoLoading, setDemoLoading] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [heroPassed, setHeroPassed] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const heroRef = useRef(null);

  const activeLanguageCode = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];

  useEffect(() => {
    if (!isLoadingAuth && token) {
      navigate('/dashboard', { replace: true });
    }
  }, [token, isLoadingAuth, navigate]);

  useEffect(() => {
    const handleWindowScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    handleWindowScroll();
    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleWindowScroll);
  }, []);

  // Track when the hero section leaves the viewport so the nav CTA can fade in
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeroPassed(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-72px 0px 0px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!location.hash) {
      return undefined;
    }

    const element = document.getElementById(location.hash.slice(1));
    if (!element) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [location.hash]);

  useEffect(() => {
    setLangMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!langMenuOpen) return undefined;
    const onKeyDown = (e) => { if (e.key === 'Escape') setLangMenuOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [langMenuOpen]);

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('i18nextLng', code);
    setLangMenuOpen(false);
  };

  const handleTryDemo = async () => {
    setDemoLoading(true);

    try {
      await login(DEMO_EMAIL, DEMO_PASSWORD);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Demo login failed:', error);
      navigate('/login', {
        replace: true,
        state: {
          message: 'Demo account is currently unavailable. Please login or sign up.',
          demoFailed: true,
        },
      });
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div
      className="landing-shell landing-cinematic relative overflow-x-hidden bg-[var(--app-bg)] text-[var(--color-text-primary)] selection:bg-[var(--color-accent-soft)] selection:text-[var(--color-text-primary)]"
    >
      <div
        aria-hidden="true"
        style={{ opacity: 'var(--noise-opacity)' }}
        className="landing-noise pointer-events-none fixed inset-0 z-0"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[48rem] hero-glow"
      />

      {/* GPU layer on header for smooth scroll compositing */}
      <motion.header
        className="fixed inset-x-0 top-0 z-50"
        style={{ transform: 'translateZ(0)', willChange: 'transform' }}
      >
        <div className={cx(frameClass, 'pt-4 sm:pt-6')}>
          <Panel
            as={motion.div}
            tone="elevated"
            animate={{
              backgroundColor: scrolled ? 'rgba(20,20,20,0.95)' : 'rgba(20,20,20,0.82)',
            }}
            transition={microSpring}
            className="relative flex min-h-[72px] items-center justify-between overflow-visible rounded-[32px] px-4"
          >
            {/* Logo — always visible */}
            <Link
              to="/"
              className="relative z-10 rounded-[20px] transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <BrandLockup variant="dark" />
            </Link>

            {/* Right cluster: mobile utility group (icon + globe) anchored right; desktop adds text link + CTA */}
            <div className="relative z-10 flex items-center gap-3">

              {/* Mobile utility group: user icon + language globe */}
              <div className="flex items-center gap-4">

                {/* Stealth login icon — mobile only, 44×44 tap target, secondary color */}
                <Link
                  to="/login"
                  aria-label={t('landing.cta_login')}
                  className="lg:hidden inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-text-secondary)] transition-colors duration-200 active:text-[var(--color-text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  <Icon
                    path="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    className="h-5 w-5"
                  />
                </Link>

                {/* Language switcher */}
                <div className="relative">
                <motion.button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={langMenuOpen}
                  aria-label={t('navbar.language')}
                  whileTap={{ scale: 0.98 }}
                  transition={microSpring}
                  onClick={() => setLangMenuOpen((open) => !open)}
                  className={cx(
                    'inline-flex min-h-12 items-center gap-2 sm:gap-3 rounded-full px-3 sm:px-4 text-sm font-medium tracking-normal text-[var(--color-text-secondary)] transition-colors duration-200 hover:text-[var(--color-text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-black',
                    surfaceToneClass,
                  )}
                >
                  <Icon
                    path="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    className="h-4 w-4 shrink-0 text-[var(--landing-accent)]"
                  />
                  <span className="hidden sm:inline">{activeLanguageCode.toUpperCase()}</span>
                  <Icon path="M19 9l-7 7-7-7" className="hidden sm:block h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
                </motion.button>

                <AnimatePresence>
                  {langMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        aria-hidden="true"
                        onClick={() => setLangMenuOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.94, y: -12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: -8 }}
                        transition={microSpring}
                        role="menu"
                        className="absolute left-1/2 top-[calc(100%+16px)] z-50 w-48 -translate-x-1/2 overflow-hidden rounded-[24px] bg-[#141414] p-2 [box-shadow:inset_0_1px_0_rgba(255,255,255,0.12),0_0_0_1px_rgba(255,255,255,0.08),0_24px_72px_rgba(0,0,0,0.72)]"
                      >
                        {APP_LANGUAGES.map((language) => {
                          const isActive = activeLanguageCode === language.code;

                          return (
                            <motion.button
                              key={language.code}
                              type="button"
                              role="menuitemradio"
                              aria-checked={isActive}
                              whileTap={{ scale: 0.98 }}
                              transition={microSpring}
                              onClick={() => changeLanguage(language.code)}
                              className={cx(
                                'flex min-h-12 w-full items-center justify-between rounded-[16px] px-4 text-left text-sm tracking-normal transition-colors duration-200',
                                isActive
                                  ? 'bg-[#0A0A0A] text-[var(--color-text-primary)]'
                                  : 'text-[var(--color-text-secondary)] hover:bg-[#0A0A0A] hover:text-[var(--color-text-primary)]',
                              )}
                            >
                              <span className="font-medium tracking-normal">
                                {language.native}
                                <span className="ml-2 text-[var(--color-text-tertiary)]">
                                  ({language.label})
                                </span>
                              </span>
                              {isActive && (
                                <Icon path="M5 13l4 4L19 7" className="h-4 w-4 text-[var(--landing-accent)]" />
                              )}
                            </motion.button>
                          );
                        })}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              </div>{/* end mobile utility group */}

              {/* Login text link — desktop only */}
              <Link
                to="/login"
                className="hidden lg:inline-flex min-h-12 items-center rounded-full px-4 text-sm font-medium tracking-normal text-[var(--color-text-secondary)] transition-[color,transform] duration-200 hover:-translate-y-0.5 hover:text-[var(--color-text-primary)]"
              >
                {t('landing.cta_login')}
              </Link>

              {/* CTA: only visible after hero scrolls out — eliminates nav/hero button redundancy */}
              <motion.div
                animate={{ opacity: heroPassed ? 1 : 0, pointerEvents: heroPassed ? 'auto' : 'none' }}
                transition={microSpring}
                className="hidden lg:block"
              >
                <Button intent="cta" onClick={() => navigate('/signup')} className="px-6">
                  {t('landing.cta_signup')}
                </Button>
              </motion.div>
            </div>

            <motion.div
              animate={{ opacity: scrolled ? 1 : 0 }}
              transition={microSpring}
              className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-[var(--color-hairline)]"
            />
          </Panel>
        </div>
      </motion.header>

      <main className="relative z-10">
        <section id="hero" ref={heroRef} className="scroll-mt-32 pt-40 pb-24 sm:pt-48 sm:pb-32" style={{ contain: 'paint' }}>
          <div className="mx-auto w-full max-w-7xl px-6 sm:px-6 lg:px-8">
            <div className="grid items-center gap-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(32rem,0.95fr)] lg:gap-20">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={heroSpring}
                className="w-full max-w-[42rem] justify-self-start text-left"
              >
                {/* Trusted By badge — flush to px-6 container axis, self-start prevents flex stretch */}
                <div className="inline-flex self-start items-center gap-3 rounded-full bg-[var(--landing-accent)] px-4 py-1.5 text-[var(--color-text-on-accent)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.16),0_18px_48px_rgba(226,255,50,0.2)]">
                  <span className="h-2 w-2 rounded-full bg-[#000000]" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-text-on-accent)]">
                    {t('landing.trusted_by')}
                  </span>
                </div>

                <h1 className="mt-6 text-4xl font-semibold leading-[1.1] tracking-[-0.05em] antialiased text-[var(--color-text-primary)] sm:text-6xl sm:leading-[1.05] lg:text-[5.5rem] lg:leading-[1.02]">
                  Stop guessing. Start tracking.
                </h1>

                <p className="mt-4 sm:mt-8 max-w-[40rem] text-lg leading-8 tracking-normal text-[var(--color-text-secondary)] sm:text-xl">
                  Clinical clarity for the chronic trajectory.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
                  <Button
                    intent="cta"
                    onClick={() => navigate('/signup')}
                    className="w-full min-h-[56px] sm:w-auto sm:min-w-[12rem] sm:min-h-12"
                  >
                    {t('landing.cta_signup')}
                  </Button>
                  <Button
                    intent="secondary"
                    onClick={handleTryDemo}
                    disabled={demoLoading || isLoadingAuth}
                    className="w-full min-h-[56px] sm:w-auto sm:min-w-[12rem] sm:min-h-12"
                  >
                    {demoLoading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-text-tertiary)] border-t-[var(--color-text-primary)]" />
                    ) : null}
                    {t('landing.cta_try_demo')}
                  </Button>
                </div>

                {/* Mini-cards: single column until xl — needs room to breathe to convey trust */}
                <div className="mt-8 grid gap-4 grid-cols-1 xl:grid-cols-3">
                  {[
                    {
                      title: 'Logged in 12 seconds',
                      detail: 'Engineered for habit, not paperwork.',
                    },
                    {
                      title: 'Patterns you would have missed',
                      detail: 'The system connects check-ins across weeks, not just today’s reading.',
                    },
                    {
                      title: 'Export a clinical timeline',
                      detail: 'Bring a structured record to your next appointment. No more “I can’t remember.”',
                    },
                  ].map((item) => (
                    <Panel
                      key={item.title}
                      tone="surface"
                      className="rounded-[24px] p-6"
                    >
                      <p className={eyebrowClass}>{item.title}</p>
                      <p className="mt-6 text-base leading-8 tracking-normal text-[var(--color-text-secondary)]">
                        {item.detail}
                      </p>
                    </Panel>
                  ))}
                </div>
              </motion.div>

              <div className="relative">
                <DashboardMockup />
              </div>
            </div>
          </div>
        </section>

        <section className="scroll-mt-32 py-16 sm:py-24">
          <div className={frameClass}>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {TRUST_SIGNALS.map((signal, index) => (
                <Panel
                  key={signal.title}
                  as={motion.article}
                  tone="surface"
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-96px' }}
                  transition={{ ...cardSpring, delay: index * 0.08 }}
                  className="p-6 sm:p-8"
                >
                  <div className={cx('flex h-14 w-14 items-center justify-center rounded-[16px]', elevatedToneClass)}>
                    <Icon path={signal.iconPath} className="h-5 w-5 text-[var(--landing-accent)]" />
                  </div>
                  <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-text-tertiary)]">
                    {signal.eyebrow}
                  </p>
                  <h2 className="mt-4 text-2xl font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
                    {signal.title}
                  </h2>
                  <p className="mt-8 text-base leading-8 tracking-normal text-[var(--color-text-secondary)]">
                    {signal.detail}
                  </p>
                </Panel>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="scroll-mt-32 py-16 sm:py-24">
          <div className={frameClass}>
            <SectionHeader
              eyebrow="Workflow"
              title="Capture the signal. Ignore the noise."
              description="Every surface is tuned to make continuity feel obvious, reduce interpretation friction, and keep the product emotionally calm even as the data grows more complex."
            />

            <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {WORKFLOW_STEPS.map((step, index) => (
                <WorkflowCard
                  key={step.number}
                  delay={index * 0.08}
                  number={step.number}
                  title={step.title}
                  description={step.description}
                  iconPath={step.iconPath}
                />
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-32 py-16 sm:py-24">
          <div className={frameClass}>
            <SectionHeader
              eyebrow="Platform"
              title={t('landing.features_title')}
              description="A stronger product system creates stronger care experiences: cleaner inputs, calmer hierarchy, and outputs that feel trustworthy at first glance."
            />

            <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-12">
              {FEATURE_CARDS.map((feature, index) => (
                <FeatureCard
                  key={feature.title}
                  delay={index * 0.08}
                  eyebrow={feature.eyebrow}
                  title={feature.title}
                  description={feature.description}
                  metric={feature.metric}
                  iconPath={feature.iconPath}
                  className={feature.className}
                />
              ))}
            </div>
          </div>
        </section>

        <section id="security" className="scroll-mt-32 py-16 pb-24 sm:py-24 sm:pb-32">
          <div className={frameClass}>
            <Panel tone="elevated" className="overflow-hidden p-8 sm:p-12">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute right-[-8rem] top-[-6rem] h-64 w-64 rounded-full blur-[132px]"
                style={{ background: 'var(--color-accent-ambient)' }}
              />

              <div className="relative grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,0.9fr)] lg:items-end">
                <div>
                  <span className={eyebrowClass}>Security</span>
                  <h2 className="mt-4 max-w-[14ch] text-4xl font-semibold leading-[0.96] tracking-[-0.04em] text-[var(--color-text-primary)] sm:text-5xl">
                    Private health intelligence with visible restraint.
                  </h2>
                  <p className="mt-8 max-w-[40rem] text-base leading-8 tracking-normal text-[var(--color-text-secondary)] sm:text-lg">
                    The system feels premium because it removes friction without removing rigor. Access is deliberate, sharing is contextual, and every layer protects the signal instead of overwhelming it.
                  </p>

                  <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                    <Button intent="cta" onClick={() => navigate('/signup')} className="w-full sm:w-auto sm:min-w-[12rem]">
                      Create Free Account
                    </Button>
                    <Button
                      intent="secondary"
                      onClick={handleTryDemo}
                      disabled={demoLoading || isLoadingAuth}
                      className="w-full sm:w-auto sm:min-w-[12rem]"
                    >
                      {demoLoading ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-text-tertiary)] border-t-[var(--color-text-primary)]" />
                      ) : null}
                      {t('landing.cta_try_demo')}
                    </Button>
                  </div>

                  <div className="mt-8 inline-flex flex-wrap items-center gap-4 rounded-full px-4 py-4 text-sm tracking-normal text-[var(--color-text-secondary)]">
                    <Icon
                      path="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4zm0 6v4m0 4h.01"
                      className="h-4 w-4 text-[var(--landing-accent)]"
                    />
                    <span>{t('landing.privacy_badge')}</span>
                  </div>
                </div>

                <div className="grid gap-4">
                  {SECURITY_PILLARS.map((pillar, index) => (
                    <Panel
                      key={pillar.title}
                      as={motion.div}
                      tone="surface"
                      initial={{ opacity: 0, y: 32 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-96px' }}
                      transition={{ ...cardSpring, delay: index * 0.08 }}
                      className="rounded-[24px] p-6"
                    >
                      <p className={eyebrowClass}>{`0${index + 1}`}</p>
                      <h3 className="mt-6 text-2xl font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
                        {pillar.title}
                      </h3>
                      <p className="mt-6 text-base leading-8 tracking-normal text-[var(--color-text-secondary)]">
                        {pillar.description}
                      </p>
                    </Panel>
                  ))}
                </div>
              </div>
            </Panel>
          </div>
        </section>

      </main>

      {/* ── Sledgehammer CTA — One True Ending ─────────────────────────────────
           Pure black base, high-diffused volt glow. No border-t hairline —
           the section bleeds directly from the security panel above.
           ──────────────────────────────────────────────────────────────────── */}
      <section
        className="relative z-10 overflow-hidden bg-[#000000] py-32 sm:py-40"
        aria-labelledby="cta-heading"
      >
        {/* Volt glow — high-diffused, centered */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-[-8rem] h-[36rem]"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(226,255,50,0.18), transparent 70%)',
            filter: 'blur(48px)',
          }}
        />
        {/* Bottom fade to footer */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
          style={{ background: 'linear-gradient(to bottom, transparent, #000000)' }}
        />

        <div className={frameClass}>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={heroSpring}
            className="relative mx-auto max-w-[48rem] text-center"
          >
            <h2
              id="cta-heading"
              className="text-4xl font-semibold leading-[1.06] tracking-[-0.05em] text-[var(--color-text-primary)] sm:text-5xl lg:text-6xl"
            >
              Health happens between appointments.
            </h2>
            <p className="mt-6 text-lg leading-8 tracking-normal text-[var(--color-text-secondary)] sm:text-xl">
              CareTrace exists for everything in between.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                intent="cta"
                size="lg"
                onClick={() => navigate('/signup')}
                className="w-full sm:w-auto sm:min-w-[14rem]"
              >
                Create Free Account
              </Button>
              <Button
                intent="secondary"
                size="lg"
                onClick={handleTryDemo}
                disabled={demoLoading || isLoadingAuth}
                className="w-full sm:w-auto sm:min-w-[14rem]"
              >
                {demoLoading && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-text-tertiary)] border-t-[var(--color-text-primary)]" />
                )}
                Try the Interactive Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <footer id="about" className="relative z-10 border-t border-[var(--color-hairline)] py-16 sm:py-24">
        <div className={frameClass}>
          <div className="grid gap-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
            <div className="max-w-[40rem]">
              <Link
                to="/"
                className="inline-flex rounded-[20px] transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <BrandLockup variant="dark" />
              </Link>
              <p className="mt-8 text-base leading-8 tracking-normal text-[var(--color-text-secondary)]">
                CareTrace exists for the 99% of health that happens between appointments. Precision tracking for the chronic trajectory.
              </p>
            </div>

            <div className="grid gap-12 sm:grid-cols-2">
              {FOOTER_COLUMNS.map((column) => (
                <div key={column.title}>
                  <h2 className={eyebrowClass}>{column.title}</h2>
                  <ul className="mt-6 space-y-4">
                    {column.links.map((link) => (
                      <li key={link.label}>
                        <Link
                          to={link.to}
                          className="text-sm tracking-normal text-[var(--color-text-secondary)] transition-colors duration-150 hover:text-[var(--color-text-primary)]"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 flex flex-col gap-4 border-t border-[var(--color-hairline)] pt-8 text-sm tracking-normal text-[var(--color-text-tertiary)] sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; {new Date().getFullYear()} CareTrace AI. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-6">
              <Link
                to="/#security"
                className="transition-colors duration-150 hover:text-[var(--color-text-primary)]"
              >
                Security
              </Link>
              <Link
                to="/login"
                className="transition-colors duration-150 hover:text-[var(--color-text-primary)]"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="transition-colors duration-150 hover:text-[var(--color-text-primary)]"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
