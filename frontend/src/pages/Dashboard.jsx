import { Suspense, useCallback, useContext, useDeferredValue, useEffect, useId, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { AppContext } from '../AppContext';
import { useAuth } from '../AuthContext';
import PageFrame from '../components/PageFrame';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import ErrorBoundary from '../components/ErrorBoundary';
import { chartColors, cartesianGridProps, tooltipContentStyle } from '../utils/chartTheme';

const SKEL_HEIGHTS = [45, 72, 38, 85, 55, 62, 40, 78, 50, 67, 43, 71];

function DashboardSkeleton() {
  return (
    <div className="page-frame max-w-5xl">
      <div className="page-header">
        <div className="h-8 w-64 bg-[var(--app-surface-soft)] rounded motion-safe:animate-pulse mb-2" />
        <div className="h-4 w-40 bg-[var(--app-surface-soft)] rounded motion-safe:animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} elevation={1} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--app-surface-soft)] motion-safe:animate-pulse shrink-0" />
              <div className="h-3 w-20 bg-[var(--app-surface-soft)] rounded motion-safe:animate-pulse" />
            </div>
            <div className="h-8 w-16 bg-[var(--app-surface-soft)] rounded motion-safe:animate-pulse" />
            <div className="h-3 w-24 bg-[var(--app-surface-soft)] rounded motion-safe:animate-pulse" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card elevation={1} className="h-72 flex flex-col gap-3 p-6">
          <div className="h-4 w-32 bg-[var(--app-surface-soft)] rounded motion-safe:animate-pulse" />
          <div className="flex-1 bg-[var(--app-surface-soft)] rounded-[var(--radius-lg)] motion-safe:animate-pulse" />
        </Card>
        <Card elevation={1} className="lg:col-span-2 h-72 flex flex-col gap-3 p-6">
          <div className="h-4 w-40 bg-[var(--app-surface-soft)] rounded motion-safe:animate-pulse" />
          <div className="flex-1 flex items-end gap-1.5 pt-4">
            {SKEL_HEIGHTS.map((h, i) => (
              <div key={i} className="bg-[var(--app-surface-soft)] rounded-t motion-safe:animate-pulse flex-1" style={{ height: `${h}%` }} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label, t }) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const color = val >= 7 ? 'var(--app-accent)' : val >= 4 ? 'var(--app-warning)' : 'var(--app-danger)';
  return (
    <div className="rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[#080f1c] p-4 shadow-2xl backdrop-blur-xl">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--app-text-disabled)]">{label}</p>
      <p className="text-xl font-bold tracking-tight" style={{ color }}>
        {t('history.table.severity')}: {val}
        <span className="ml-1 text-sm font-normal text-[var(--app-text-muted)] opacity-60">/ 10</span>
      </p>
    </div>
  );
}

const STAT_ROUTES = {
  'symptoms-logged': '/history',
  'avg-severity': '/timeline',
  'longest-duration': '/timeline',
  'active-alerts': '/alerts',
};

function StatCard({ id, label, value, sub, icon, isLoading, isPositive, trend }) {
  const valueColor = isPositive ? 'text-[var(--app-accent)]' : 'text-[var(--app-text)]';

  return (
    <Link
      to={STAT_ROUTES[id] ?? '/dashboard'}
      className="block group focus:outline-none"
    >
      <div className="relative h-full rounded-[24px] bg-[#080f1c] border-[0.5px] border-[rgba(255,255,255,0.08)] p-6 transition-all duration-300 [box-shadow:inset_0_0.5px_0_rgba(255,255,255,0.06),0_0_0_0.5px_rgba(255,255,255,0.04),0_24px_72px_rgba(0,0,0,0.52)] group-hover:translate-y-[-4px] group-hover:border-[rgba(255,255,255,0.16)] group-hover:[box-shadow:inset_0_0.5px_0_rgba(255,255,255,0.1),0_0_0_0.5px_rgba(255,255,255,0.08),0_32px_84px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--app-text-disabled)] truncate">
            {label}
          </p>
          <div className="text-[var(--app-text-muted)] group-hover:text-[var(--app-accent)] transition-colors duration-300">
            {icon}
          </div>
        </div>
        
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-9 w-20 bg-[var(--app-surface-soft)] rounded-[8px] animate-pulse" />
            <div className="h-3 w-32 bg-[var(--app-surface-soft)] rounded-[4px] animate-pulse opacity-50" />
          </div>
        ) : (
          <div>
            <div className="flex items-baseline gap-2">
              <p className={`text-4xl font-semibold tracking-[-0.03em] tabular-nums leading-none mb-3 ${valueColor}`}>
                {value}
              </p>
              {trend !== undefined && (
                <div className={`flex items-center text-xs font-bold ${trend >= 0 ? 'text-[var(--app-accent)]' : 'text-[var(--app-danger)]'}`}>
                  <svg className={`w-3 h-3 mr-0.5 ${trend < 0 ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 12 12">
                    <path d="M6 2l-4 4h8l-4-4z" />
                  </svg>
                  {Math.abs(trend)}%
                </div>
              )}
            </div>
            <p className="text-xs text-[var(--app-text-muted)] font-medium">
              {sub}
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}

function QuickLogCTA() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 pointer-events-none sm:bottom-8 sm:p-0 sm:flex sm:justify-center">
      <motion.button
        whileHover={{ y: -4, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate('/symptoms')}
        className="pointer-events-auto w-full sm:w-auto flex items-center justify-center gap-3 bg-[var(--app-accent)] text-black px-8 py-5 rounded-full font-bold shadow-[0_28px_80px_rgba(226,255,50,0.38)] transition-all duration-300 active:shadow-none sm:min-w-[240px]"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
        <span className="text-lg tracking-tight">{t('dashboard.log_symptom')}</span>
      </motion.button>
    </div>
  );
}

function EmptyDashboardState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="mb-12 relative">
        <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 20H30L35 10L45 30L50 20H120" stroke="rgba(226,255,50,0.1)" strokeWidth="2" />
          <circle cx="30" cy="20" r="3" fill="rgba(226,255,50,0.3)" />
          <circle cx="50" cy="20" r="3" fill="rgba(226,255,50,0.5)" />
          <motion.circle 
            cx="100" cy="20" r="4" 
            fill="var(--app-accent)"
            animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </svg>
      </div>
      <h2 className="text-3xl font-semibold tracking-tight text-[var(--app-text)] mb-3">
        Your first log starts the record.
      </h2>
      <p className="text-lg text-[var(--app-text-muted)] max-w-sm">
        Tap the button below to begin.
      </p>
    </div>
  );
}

const matchesSearch = (query, ...values) => {
  if (!query) return true;
  return values.some((v) => {
    if (Array.isArray(v)) return v.some((item) => String(item ?? '').toLowerCase().includes(query));
    return String(v ?? '').toLowerCase().includes(query);
  });
};

function DashboardInner() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const rawId = useId();
  const gradientId = useMemo(() => `trend-${rawId.replace(/[^a-zA-Z0-9-]/g, '')}`, [rawId]);
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    userProfile, symptoms = [], analysisResult, hasAlert, isLoading, alerts, demoMedications = [], refreshData,
  } = useContext(AppContext);
  const { user } = useAuth();

  const TODAY = new Date().toISOString().slice(0, 10);
  const DISMISS_KEY = 'ct_reminder_dismissed_date';
  const [reminderDismissed, setReminderDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === TODAY; } catch { return false; }
  });
  const dismissReminder = () => {
    try { localStorage.setItem(DISMISS_KEY, TODAY); } catch { /* no-op in restricted storage mode */ }
    setReminderDismissed(true);
  };

  useEffect(() => { document.title = 'Dashboard — CareTrace AI'; }, []);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    const period = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
    const name = userProfile?.name || user?.email?.split('@')[0] || t('dashboard.welcome_default', 'there');
    return t(`dashboard.greeting_${period}`, { name, defaultValue: `Good ${period}, ${name}` });
  }, [userProfile, user, t]);

  const streakDays = useMemo(() => {
    if (!symptoms.length) return 0;
    const dates = [...new Set(symptoms.map(s => new Date(s.date).toISOString().slice(0,10)))].sort().reverse();
    let streak = 0;
    let check = new Date();
    for (const d of dates) {
      const diff = Math.floor((check - new Date(d)) / 86400000);
      if (diff > 1) break;
      streak++;
      check = new Date(d);
    }
    return streak;
  }, [symptoms]);

  const dateString = new Date().toLocaleDateString(i18n.language, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const fullSubtitle = `${dateString}${streakDays > 0 ? ` · ${t('dashboard.streak', { count: streakDays })}` : ''}`;

  const formatShortDate = useCallback(
    (date) => new Date(date).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' }),
    [i18n.language],
  );

  const chartData = useMemo(() =>
    [...symptoms]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((s) => ({ name: formatShortDate(s.date), severity: parseInt(s.severity, 10), symptom: s.symptom, duration: Number(s.duration) })),
  [symptoms, formatShortDate]);

  const frequencyData = useMemo(() => {
    const map = {};
    symptoms.forEach((s) => { const k = s.symptom.toLowerCase().trim(); map[k] = (map[k] || 0) + 1; });
    return Object.entries(map)
      .map(([k, count]) => ({
        name: t(`symptoms.options.${k}`, { defaultValue: k.charAt(0).toUpperCase() + k.slice(1) }),
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [symptoms, t]);

  const avgSev = useMemo(() =>
    symptoms.length
      ? (symptoms.reduce((s, item) => s + Number(item.severity), 0) / symptoms.length).toFixed(1)
      : '—',
  [symptoms]);

  const yAxisWidth = useMemo(() =>
    Math.min(160, Math.max(80, frequencyData.length
      ? Math.max(...frequencyData.map((d) => d.name.length)) * 7 + 16
      : 80)),
  [frequencyData]);

  const searchLabel = searchParams.get('q')?.trim() ?? '';
  const searchQuery = useDeferredValue(searchLabel.toLowerCase());
  const hasSearchQuery = searchLabel.length > 0;

  const filteredChartData = useMemo(() =>
    chartData.filter((e) => matchesSearch(searchQuery, e.symptom, e.name, String(e.severity), String(e.duration))),
  [chartData, searchQuery]);

  const filteredFrequencyData = useMemo(() =>
    frequencyData.filter((e) => matchesSearch(searchQuery, e.name, String(e.count))),
  [frequencyData, searchQuery]);

  const risk = analysisResult?.risk ?? null;
  const riskVariant = risk?.toLowerCase() ?? 'default';

  const todayLogged = useMemo(() =>
    symptoms.some((s) => new Date(s.date).toDateString() === new Date().toDateString()),
  [symptoms]);
  const showAlert = !!hasAlert?.();
  const showReminder = !showAlert && !todayLogged && !reminderDismissed;

  const healthScore = useMemo(() => {
    if (!symptoms.length) return 0;
    const avg = Number(avgSev);
    const score = Math.max(0, Math.min(100, 100 - (avg * 10)));
    return Math.round(score);
  }, [symptoms.length, avgSev]);

  const weekAgoSymptoms = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return symptoms.filter(s => new Date(s.date) < cutoff);
  }, [symptoms]);

  const statCards = useMemo(() => [
    {
      id: 'health-score',
      label: t('dashboard.stats.health_score', 'Health Score'),
      value: healthScore,
      sub: healthScore >= 80 ? t('dashboard.stats.excellent', 'Optimal Range') : t('dashboard.stats.fair', 'Needs Tracking'),
      keywords: [t('dashboard.stats.health_score', 'Health Score'), t('dashboard.stats.excellent'), t('dashboard.stats.fair')],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      isPositive: healthScore >= 80,
      trend: healthScore > 50 ? 12 : -4
    },
    {
      id: 'symptoms-logged',
      label: t('dashboard.stats.logged'),
      value: symptoms.length,
      sub: t('dashboard.stats.all_time'),
      keywords: [t('dashboard.stats.logged'), t('dashboard.stats.all_time')],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
      trend: symptoms.length - weekAgoSymptoms.length,
      isPositive: symptoms.length >= weekAgoSymptoms.length
    },
    {
      id: 'current-streak',
      label: t('dashboard.stats.streak', 'Current Streak'),
      value: `${streakDays}d`,
      sub: t('dashboard.stats.consecutive_logs', 'Consecutive days'),
      keywords: [t('dashboard.stats.streak', 'Current Streak'), t('dashboard.streak'), t('dashboard.stats.consecutive_logs')],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
      isPositive: streakDays > 0
    },
    {
      id: 'active-alerts',
      label: t('dashboard.stats.alerts'),
      value: String(alerts?.length ?? 0),
      sub: showAlert ? t('dashboard.stats.needs_attention') : t('dashboard.stats.all_clear'),
      keywords: [t('dashboard.stats.alerts'), t('dashboard.stats.needs_attention'), t('dashboard.stats.all_clear')],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
      isPositive: alerts?.length === 0 && symptoms.length > 0
    },
  ], [t, healthScore, symptoms.length, streakDays, alerts, showAlert, weekAgoSymptoms.length]);

  const visibleStatCards = useMemo(() =>
    statCards.filter((c) => matchesSearch(searchQuery, c.label, c.sub, c.keywords)),
  [statCards, searchQuery]);

  const motionFade = shouldReduceMotion
    ? {}
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { type: 'spring', stiffness: 120, damping: 14 } };

  return (
    <PageFrame 
      title={<span className="page-title">{greeting}</span>} 
      subtitle={fullSubtitle} 
      maxWidthClass="max-w-5xl"
    >
      <div className="fixed bottom-6 right-6 md:hidden z-40">
        <Button intent="cta" size="lg" onClick={() => navigate('/symptoms')} className="rounded-full w-14 h-14 p-0 shadow-[var(--shadow-l3)]">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
        </Button>
      </div>

      <QuickLogCTA />
      
      {symptoms.length === 0 && !isLoading ? (
        <EmptyDashboardState />
      ) : (
        <>
      {showAlert && (
        <motion.div {...motionFade} role="alert" aria-live="assertive" aria-atomic="true" className="flex items-start gap-4 p-4 rounded-[var(--radius-xl)] border border-[var(--app-danger-border)] bg-[var(--app-danger-bg)]">
          <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--app-danger-bg)] border border-[var(--app-danger-border)] flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-[var(--app-danger)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[var(--app-danger-text)] text-sm">{t('dashboard.alert_title')}</p>
            <p className="text-[var(--app-danger-text)] text-xs mt-0.5 opacity-80">{t('dashboard.alert_body')}</p>
          </div>
          <Button intent="ghost" size="sm" onClick={() => navigate('/alerts')}>{t('dashboard.alert_view')}</Button>
        </motion.div>
      )}

      {showReminder && (
        <motion.div {...motionFade} className="flex items-center gap-4 p-4 rounded-[var(--radius-xl)] border border-[var(--app-info-border,var(--app-border))] bg-[var(--app-info-bg,var(--app-surface-soft))]">
          <svg className="w-5 h-5 text-[var(--app-info,var(--app-accent))] shrink-0 motion-safe:animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[var(--app-text)] text-sm">{t('dashboard.reminder_title')}</p>
            <p className="text-[var(--app-text-muted)] text-xs mt-0.5">{t('dashboard.reminder_body')}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button intent="primary" size="sm" onClick={() => navigate('/symptoms')}>{t('dashboard.reminder_log')}</Button>
            <button
              type="button"
              onClick={dismissReminder}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--app-text-disabled)] hover:text-[var(--app-text-muted)] transition-colors rounded-[var(--radius-md)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]"
              aria-label={t('dashboard.reminder_dismiss', 'Dismiss reminder')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </motion.div>
      )}

      {visibleStatCards.length > 0 && (
        <ErrorBoundary title={t('dashboard.error.stats', 'Statistics unavailable')} onRetry={refreshData}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {visibleStatCards.map((card) => (
              <StatCard key={card.id} isLoading={isLoading} {...card} />
            ))}
          </div>
        </ErrorBoundary>
      )}

      {!hasSearchQuery && demoMedications.length > 0 && (
        <motion.div {...motionFade}>
          <Card elevation={1}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wide">{t('dashboard.demo_meds.label')}</p>
                <h2 className="text-base font-semibold text-[var(--app-text)]">{t('dashboard.demo_meds.title')}</h2>
              </div>
              <Badge variant="info">{t('dashboard.demo_meds.sample_badge', 'Sample Data')}</Badge>
            </div>
            <ul className="divide-y divide-[var(--app-border)]">
              {demoMedications.map((med) => (
                <li key={med.name} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div>
                    <p className="font-semibold text-[var(--app-text)] text-sm">{med.name}</p>
                    <p className="text-xs text-[var(--app-text-muted)]">{med.dose} · {med.schedule}</p>
                  </div>
                  {med.notes && <p className="text-xs text-[var(--app-text-disabled)] sm:text-right max-w-xs">{med.notes}</p>}
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 items-stretch gap-6">
        <ErrorBoundary title={t('dashboard.risk.title')} onRetry={refreshData}>
          <motion.div {...motionFade} className="h-full">
            <Card elevation={1} className="h-full flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wide">{t('dashboard.risk.title')}</p>
                  <h2 className="text-base font-semibold text-[var(--app-text)] mt-0.5">{t('dashboard.risk.status')}</h2>
                </div>
                {risk && <Badge variant={riskVariant}>{risk}</Badge>}
              </div>
              {analysisResult?.created_at && (
                <p className="text-xs text-[var(--app-text-disabled)] mb-3">
                  {t('dashboard.risk.last_updated', 'Last updated')} {new Date(analysisResult.created_at).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })}
                </p>
              )}
              {!analysisResult ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-6">
                  <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-[var(--app-surface-soft)] border border-[var(--app-border)] flex items-center justify-center">
                    <svg className="w-6 h-6 text-[var(--app-text-disabled)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--app-text)]">{t('dashboard.risk.no_analysis')}</p>
                    <p className="text-xs text-[var(--app-text-muted)] mt-1">{t('dashboard.risk.no_analysis_sub')}</p>
                  </div>
                  <Button intent="primary" size="sm" onClick={() => navigate('/analysis')}>{t('dashboard.run_analysis')}</Button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-3" aria-live="polite">
                  <p className="text-sm text-[var(--app-text)] leading-relaxed max-w-prose bg-[var(--app-surface-soft)] rounded-[var(--radius-lg)] p-3 border border-[var(--app-border)]">
                    {analysisResult.reason}
                  </p>
                  <Button intent="ghost" size="sm" onClick={() => navigate('/analysis')} className="mt-auto">
                    {t('analysis.report.view_full_report', 'View Full Report')}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </Button>
                </div>
              )}
            </Card>
          </motion.div>
        </ErrorBoundary>

        <ErrorBoundary title={t('dashboard.charts.severity_timeline')} onRetry={refreshData}>
          <motion.div {...{ ...motionFade, transition: { ...(motionFade.transition || {}), delay: 0.1 } }} className="lg:col-span-2 h-full">
            <Card elevation={1} className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wide">{t('dashboard.charts.trend')}</p>
                  <h2 className="text-base font-semibold text-[var(--app-text)]">{t('dashboard.charts.severity_timeline')}</h2>
                </div>
                <span className="text-xs text-[var(--app-text-disabled)]">{(hasSearchQuery ? filteredChartData : chartData).length} {t('dashboard.charts.data_points_label', 'entries')}</span>
              </div>
              {(hasSearchQuery ? filteredChartData : chartData).length > 0 ? (
                <>
                  <div role="img" aria-label={t('dashboard.charts.trend_aria', 'Symptom severity over time')} className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={hasSearchQuery ? filteredChartData : chartData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                        <defs>
                          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.20} />
                            <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid {...cartesianGridProps} />
                        <XAxis dataKey="name" tick={{ fill: chartColors.axis, fontSize: 11 }} tickLine={false} axisLine={{ stroke: chartColors.grid }} />
                        <YAxis domain={[0, 10]} tick={{ fill: chartColors.axis, fontSize: 11 }} tickLine={false} axisLine={{ stroke: chartColors.grid }} width={28} />
                        <Tooltip content={<CustomTooltip t={t} />} />
                        <Area 
                          type="monotone" 
                          dataKey="severity" 
                          stroke={chartColors.primary} 
                          strokeWidth={3} 
                          fill={`url(#${gradientId})`} 
                          dot={{ r: 4, fill: chartColors.dot, stroke: chartColors.primary, strokeWidth: 2 }} 
                          activeDot={{ r: 6, fill: chartColors.primary, stroke: '#fff', strokeWidth: 2 }} 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-[var(--app-text-muted)] mt-3 pt-3 border-t border-[var(--app-border)]">
                    {t('charts.y_severity', 'Severity (0–10)')} · {t('charts.caption_trend')}
                  </p>
                </>
              ) : (
                <div className="flex-1 h-72 flex flex-col items-center justify-center bg-[var(--app-surface-soft)] rounded-[var(--radius-lg)] border border-dashed border-[var(--app-border)] gap-3">
                  <svg className="w-10 h-10 text-[var(--app-text-disabled)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                  <p className="text-sm font-medium text-[var(--app-text-muted)]">{hasSearchQuery ? t('dashboard.charts.no_match') : t('dashboard.charts.no_data')}</p>
                  <p className="text-xs text-[var(--app-text-disabled)]">{hasSearchQuery ? t('dashboard.charts.no_match_sub') : t('dashboard.charts.no_data_sub')}</p>
                </div>
              )}
            </Card>
          </motion.div>
        </ErrorBoundary>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 items-stretch gap-6">
        <ErrorBoundary title={t('dashboard.charts.symptom_frequency')} onRetry={refreshData}>
          <motion.div {...{ ...motionFade, transition: { ...(motionFade.transition || {}), delay: 0.15 } }} className="h-full">
            <Card elevation={1} className="h-full flex flex-col">
              <div className="mb-4">
                <p className="text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wide">{t('dashboard.charts.distribution')}</p>
                <h2 className="text-base font-semibold text-[var(--app-text)]">{t('dashboard.charts.symptom_frequency')}</h2>
              </div>
              {(hasSearchQuery ? filteredFrequencyData : frequencyData).length > 0 ? (
                <>
                  <div role="img" aria-label={t('dashboard.charts.distribution_aria', 'Symptom frequency distribution')} className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hasSearchQuery ? filteredFrequencyData : frequencyData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                        <CartesianGrid {...cartesianGridProps} />
                        <XAxis type="number" tick={{ fill: chartColors.axis, fontSize: 11 }} tickLine={false} axisLine={{ stroke: chartColors.grid }} allowDecimals={false} />
                        <YAxis dataKey="name" type="category" width={yAxisWidth} tick={{ fill: chartColors.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: chartColors.primaryMuted }} contentStyle={tooltipContentStyle} />
                        <Bar dataKey="count" name={t('charts.y_count')} fill={chartColors.primary} radius={[0, 6, 6, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-[var(--app-text-muted)] mt-3 pt-3 border-t border-[var(--app-border)]">{t('charts.caption_bars')}</p>
                </>
              ) : (
                <div className="flex-1 h-72 flex flex-col items-center justify-center bg-[var(--app-surface-soft)] rounded-[var(--radius-lg)] border border-dashed border-[var(--app-border)] gap-3">
                  <p className="text-sm font-medium text-[var(--app-text-muted)]">{hasSearchQuery ? t('dashboard.charts.no_freq_match') : t('dashboard.charts.no_freq_data')}</p>
                </div>
              )}
              <Button intent="ghost" size="sm" onClick={() => navigate('/timeline')} className="mt-4">
                {t('dashboard.charts.view_timeline')}
              </Button>
            </Card>
          </motion.div>
        </ErrorBoundary>

        <ErrorBoundary title={t('dashboard.insights.title')} onRetry={refreshData}>
          <motion.div {...{ ...motionFade, transition: { ...(motionFade.transition || {}), delay: 0.2 } }} className="h-full">
            <Card elevation={1} className="h-full flex flex-col">
              <div className="mb-4">
                <p className="text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wide">{t('dashboard.insights.title')}</p>
                <h2 className="text-base font-semibold text-[var(--app-text)]">{t('dashboard.insights.personalized_insights')}</h2>
              </div>
              <div className="space-y-3 flex-1" aria-live="polite">
                {userProfile?.lifestyle && (
                  <div className="p-3 bg-[var(--app-surface-soft)] rounded-[var(--radius-lg)] border border-[var(--app-border)]">
                    <p className="text-xs font-semibold text-[var(--app-text)] mb-0.5">{t('dashboard.insights.profile_title')}</p>
                    <p className="text-xs text-[var(--app-text-muted)] leading-relaxed">{t('dashboard.insights.profile_body', { lifestyle: userProfile.lifestyle })}</p>
                  </div>
                )}
                {symptoms.length > 0 && (
                  <div className="p-3 bg-[var(--app-surface-soft)] rounded-[var(--radius-lg)] border border-[var(--app-border)]">
                    <p className="text-xs font-semibold text-[var(--app-text)] mb-0.5">{t('dashboard.insights.pattern_title')}</p>
                    <p className="text-xs text-[var(--app-text-muted)] leading-relaxed">{t('dashboard.insights.pattern_body', { count: symptoms.length })}</p>
                  </div>
                )}
                {!userProfile?.lifestyle && symptoms.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center py-8 text-center gap-2">
                    <p className="text-sm font-medium text-[var(--app-text-muted)]">{t('dashboard.insights.empty', 'No insights yet')}</p>
                    <p className="text-xs text-[var(--app-text-disabled)]">{t('dashboard.insights.empty_sub', 'Log symptoms and complete your profile to see insights')}</p>
                  </div>
                )}
              </div>
              <Button intent="ghost" size="sm" onClick={() => navigate('/analysis')} className="mt-4">
                {t('dashboard.charts.view_report')}
              </Button>
            </Card>
          </motion.div>
        </ErrorBoundary>
      </div>

        </>
      )}
    </PageFrame>
  );
}

function DashboardShell() {
  const { t } = useTranslation();
  return (
    <ErrorBoundary
      title={t('dashboard.error.title', 'Dashboard Error')}
      subtitle={t('dashboard.error.subtitle', 'Your data is safe. Please reload.')}
      onRetry={() => window.location.reload()}
    >
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardInner />
      </Suspense>
    </ErrorBoundary>
  );
}

export default DashboardShell;
