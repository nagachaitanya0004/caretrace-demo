// CareTrace AI - Dashboard Component
// Licensed under MIT License
// Type definitions and component structure are original work

import React, { Suspense, useContext, useDeferredValue, useEffect, useId, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../AppContext';
import { useAuth } from '../AuthContext';
import PageFrame from '../components/PageFrame';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

/**
 * @typedef {Object} SymptomContext
 * @property {string} [frequency]
 * @property {string} [duration_text]
 */

/**
 * @typedef {Object} Symptom
 * @property {string} id
 * @property {string} symptom
 * @property {number} severity
 * @property {number} duration
 * @property {string} date
 * @property {SymptomContext} [context]
 */

/**
 * @typedef {Object} Alert
 * @property {string} id
 * @property {string} message
 * @property {string} [symptom]
 */

/**
 * @typedef {Object} AnalysisResult
 * @property {string} risk
 * @property {string} reason
 * @property {string} [created_at]
 */

/**
 * @typedef {Object} DemoMedication
 * @property {string} name
 * @property {string} dose
 * @property {string} schedule
 * @property {string} [notes]
 */

/**
 * @typedef {Object} UserProfile
 * @property {string} [name]
 * @property {string} [lifestyle]
 * @property {string} [email]
 */

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[50vh]">
          <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[var(--app-text)] mb-2">Dashboard Error</h2>
          <p className="text-sm text-[var(--app-text-muted)] mb-6 max-w-md">We encountered a critical error loading your dashboard. Your data is safe, but the view could not be rendered.</p>
          <Button intent="primary" onClick={() => window.location.reload()}>Reload Dashboard</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

class WidgetErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <Card elevation={1} className={`h-full min-h-[16rem] flex flex-col items-center justify-center p-6 text-center ${this.props.className || ''}`}>
          <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          </div>
          <p className="text-sm font-semibold text-[var(--app-text)] mb-1">{this.props.title || 'Widget Error'}</p>
          <p className="text-xs text-[var(--app-text-muted)] max-w-[200px] mb-4">This component failed to load gracefully.</p>
          <Button intent="ghost" size="sm" onClick={() => this.setState({ hasError: false, error: null })}>
            Retry
          </Button>
        </Card>
      );
    }
    return this.props.children;
  }
}

const CustomTooltip = ({ active, payload, label, t }) => {
  if (active && payload?.length) {
    const val = payload[0].value;
    let colorClass = 'text-[var(--app-success)]';
    if (val >= 4 && val <= 6) colorClass = 'text-[var(--app-warning)]';
    else if (val >= 7) colorClass = 'text-[var(--app-danger)]';
    return (
      <div className="px-3 py-2.5 text-xs bg-[var(--app-surface)] border border-[var(--app-border)] rounded-[var(--radius-md)] shadow-[var(--shadow-l2)]">
        <p className="font-medium text-[var(--app-text-muted)] mb-1">{label}</p>
        <p className="font-semibold text-[var(--app-text)] flex items-center gap-1">
          {t('history.table.severity')}:
          <span className={colorClass}>{val}</span>
          <span className="text-[var(--app-text-disabled)] font-normal">/10</span>
        </p>
      </div>
    );
  }
  return null;
};

const matchesSearch = (query, ...values) => {
  if (!query) return true;
  return values.some((value) => {
    if (Array.isArray(value)) {
      return value.some((item) => String(item ?? '').toLowerCase().includes(query));
    }
    return String(value ?? '').toLowerCase().includes(query);
  });
};

const formatShortDate = (date, language) => {
  try {
    return new Date(date || Date.now()).toLocaleDateString(language, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

const StatCardSkeleton = () => (
  <Card elevation={1} className="h-full flex flex-col justify-between hover:shadow-[var(--shadow-l2)] transition-shadow">
    <div className="flex justify-between items-start mb-6">
      <div className="h-3 w-20 bg-[var(--app-surface-soft)] rounded animate-pulse" />
      <div className="h-5 w-5 bg-[var(--app-surface-soft)] rounded animate-pulse" />
    </div>
    <div>
      <div className="h-8 w-16 bg-[var(--app-surface-soft)] rounded animate-pulse mb-2" />
      <div className="h-3 w-24 bg-[var(--app-surface-soft)] rounded animate-pulse" />
    </div>
  </Card>
);

const ChartSkeleton = () => (
  <div className="h-72 w-full flex items-end gap-2 pt-4 px-2">
    {[...Array(12)].map((_, i) => (
      <div key={i} className="bg-[var(--app-surface-soft)] rounded-t animate-pulse flex-1" style={{ height: `${((i * 17) % 60) + 20}%` }} />
    ))}
  </div>
);

const DashboardSkeleton = () => (
  <PageFrame title="Loading..." subtitle="Preparing your health overview" maxWidthClass="max-w-5xl">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card elevation={1} className="h-72"><div className="h-full bg-[var(--app-surface-soft)] animate-pulse rounded" /></Card>
      <Card elevation={1} className="h-72 flex flex-col justify-end"><ChartSkeleton /></Card>
    </div>
  </PageFrame>
);

function DashboardInner() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const gradientId = useId();
  const strokeId = useId();

  useEffect(() => {
    document.title = `Dashboard — CareTrace AI`;
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const {
    userProfile,
    symptoms = [],
    analysisResult,
    hasAlert,
    isLoading,
    alerts,
    demoMedications = [],
  } = useContext(AppContext);
  const { user } = useAuth();
  const [reminderDismissed, setReminderDismissed] = useState(() => {
    const today = new Date().toDateString();
    const dismissedDate = localStorage.getItem('caretrace_reminder_dismissed_date');
    return dismissedDate === today;
  });

  useEffect(() => {
    const today = new Date().toDateString();
    const dismissedDate = localStorage.getItem('caretrace_reminder_dismissed_date');
    if (dismissedDate !== today) {
      localStorage.removeItem('caretrace_reminder_dismissed_date');
    }
  }, []);

  // Absolute Null-Safety Wrappers
  const safeSymptoms = useMemo(() => symptoms ?? [], [symptoms]);
  const safeDemoMedications = useMemo(() => demoMedications ?? [], [demoMedications]);
  const safeAlerts = useMemo(() => alerts ?? [], [alerts]);

  const searchLabel = searchParams.get('q')?.trim() ?? '';
  const searchQuery = useDeferredValue(searchLabel.toLowerCase());
  const hasSearchQuery = searchLabel.length > 0;

  const risk = analysisResult?.risk || null;
  const avgSev = useMemo(() => safeSymptoms.length
    ? (safeSymptoms.reduce((sum, item) => sum + Number(item?.severity ?? 0), 0) / safeSymptoms.length).toFixed(1)
    : '—', [safeSymptoms]);
  const longestRun = useMemo(() => safeSymptoms.length ? Math.max(...safeSymptoms.map((symptom) => Number(symptom?.duration ?? 0))) : 0, [safeSymptoms]);

  // Shannon Entropy Index (H = -Σ p_k log₂ p_k)
  const entropyMetric = useMemo(() => {
    if (safeSymptoms.length === 0) return { value: '0.00', status: 'Optimal', color: 'text-[var(--app-success)]' };
    const counts = {};
    safeSymptoms.forEach((s) => {
      const name = String(s?.symptom ?? '').toLowerCase().trim();
      if (name) {
        counts[name] = (counts[name] ?? 0) + 1;
      }
    });
    const total = safeSymptoms.length;
    let h = 0;
    Object.values(counts).forEach((count) => {
      const p = count / total;
      h -= p * Math.log2(p);
    });
    let status = 'High Predictability';
    let color = 'text-[var(--app-success)]';
    if (h > 1.5) {
      status = 'High Randomness';
      color = 'text-[var(--app-warning)]';
    } else if (h > 0.8) {
      status = 'Moderate Order';
      color = 'text-[var(--app-info)]';
    }
    return { value: h.toFixed(2), status, color };
  }, [safeSymptoms]);

  // Standard Dispersion (σ = √[Σ(x_i - μ)² / N])
  const dispersionMetric = useMemo(() => {
    if (safeSymptoms.length === 0) return { value: '0.00', status: 'Stable', color: 'text-[var(--app-success)]' };
    const severities = safeSymptoms.map((s) => Number(s?.severity ?? 0));
    const mean = severities.reduce((a, b) => a + b, 0) / severities.length;
    const variance = severities.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / severities.length;
    const stdDev = Math.sqrt(variance);
    let status = 'Narrow Variance';
    let color = 'text-[var(--app-success)]';
    if (stdDev > 2.5) {
      status = 'Wide Fluctuations';
      color = 'text-[var(--app-danger)]';
    } else if (stdDev > 1.2) {
      status = 'Moderate Volatility';
      color = 'text-[var(--app-warning)]';
    }
    return { value: stdDev.toFixed(2), status, color };
  }, [safeSymptoms]);

  // Pearson Correlation Coefficient Temporal Drift (r = Cov(X,Y)/(σ_x σ_y))
  const driftMetric = useMemo(() => {
    if (safeSymptoms.length < 2) return { value: '0.00', status: 'Stationary', color: 'text-[var(--app-text-disabled)]', direction: 'Neutral' };
    const sorted = [...safeSymptoms]
      .map((s) => ({
        x: new Date(s?.date ?? 0).getTime() / (1000 * 60 * 60 * 24),
        y: Number(s?.severity ?? 0),
      }))
      .sort((a, b) => a.x - b.x);
    
    const n = sorted.length;
    const meanX = sorted.reduce((sum, item) => sum + item.x, 0) / n;
    const meanY = sorted.reduce((sum, item) => sum + item.y, 0) / n;
    
    let num = 0;
    let denX = 0;
    let denY = 0;
    sorted.forEach((item) => {
      const dx = item.x - meanX;
      const dy = item.y - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    });
    
    if (denX === 0 || denY === 0) return { value: '0.00', status: 'Stationary', color: 'text-[var(--app-text-disabled)]', direction: 'Neutral' };
    const r = num / Math.sqrt(denX * denY);
    
    let status = 'Linear Drift';
    let color = 'text-[var(--app-text)]';
    let direction = 'Neutral';
    if (r < -0.3) {
      status = 'Regressing (Recovery)';
      color = 'text-[var(--app-success)]';
      direction = 'Negative Trend';
    } else if (r > 0.3) {
      status = 'Escalating (Attention)';
      color = 'text-[var(--app-danger)]';
      direction = 'Positive Trend';
    } else {
      status = 'Stationary Plateau';
      color = 'text-[var(--app-info)]';
      direction = 'No Drift';
    }
    return { value: r.toFixed(2), status, color, direction };
  }, [safeSymptoms]);

  const chartData = useMemo(() => [...safeSymptoms]
    .sort((a, b) => new Date(a?.date ?? 0).getTime() - new Date(b?.date ?? 0).getTime())
    .map((symptom) => ({
      name: formatShortDate(symptom?.date ?? new Date(), i18n.language),
      severity: parseInt(symptom?.severity ?? 0, 10) || 0,
      symptom: symptom?.symptom ?? '',
      duration: Number(symptom?.duration ?? 0),
    })), [safeSymptoms, i18n.language]);

  const filteredChartData = useMemo(() => chartData.filter((entry) =>
    matchesSearch(searchQuery, entry.symptom, entry.name, entry.severity, entry.duration)
  ), [chartData, searchQuery]);

  const frequencyData = useMemo(() => {
    const map = {};
    safeSymptoms.forEach((symptom) => {
      const normalizedName = String(symptom?.symptom ?? '').toLowerCase().trim();
      if (normalizedName) {
        map[normalizedName] = (map[normalizedName] ?? 0) + 1;
      }
    });
    return Object.keys(map)
      .map((key) => ({
        name: t(`symptoms.options.${key}`, { defaultValue: key.charAt(0).toUpperCase() + key.slice(1) }),
        count: map[key],
      }))
      .sort((a, b) => (b?.count ?? 0) - (a?.count ?? 0));
  }, [safeSymptoms, t]);

  const filteredFrequencyData = useMemo(() => frequencyData.filter((entry) =>
    matchesSearch(searchQuery, entry.name, entry.count, ['distribution', 'frequency', 'symptom', 'count'])
  ), [frequencyData, searchQuery]);

  const nameLengths = (hasSearchQuery ? filteredFrequencyData : frequencyData).map(d => d.name.length);
  const dynamicYAxisWidth = nameLengths.length > 0 ? Math.min(Math.max(...nameLengths) * 7 + 16, 160) : 160;

  const todayLogged = safeSymptoms.some((symptom) => new Date(symptom?.date ?? 0).toDateString() === new Date().toDateString());
  const showReminder = !todayLogged && !reminderDismissed;

  const handleDismissReminder = () => {
    localStorage.setItem('caretrace_reminder_dismissed_date', new Date().toDateString());
    setReminderDismissed(true);
  };

  const clearDashboardSearch = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('q');
    setSearchParams(nextParams, { replace: true });
  };

  const quickActions = useMemo(() => [
    {
      key: 'log-symptom',
      label: t('dashboard.log_symptom'),
      keywords: [t('dashboard.stats.logged'), t('dashboard.stats.all_time'), 'logged', 'symptoms'],
      intent: 'cta',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
      onClick: () => navigate('/symptoms'),
    },
    {
      key: 'run-analysis',
      label: t('dashboard.run_analysis'),
      keywords: ['analysis', 'risk', 'scan', 'insights', 'report'],
      intent: 'ghost',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
      onClick: () => navigate('/analysis'),
    },
    {
      key: 'timeline',
      label: t('dashboard.view_timeline'),
      keywords: ['timeline', 'history', 'dates', 'recent', 'symptoms'],
      intent: 'ghost',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
      onClick: () => navigate('/timeline'),
    },
  ], [t, navigate]);

  const visibleQuickActions = useMemo(() => quickActions.filter((action) =>
    matchesSearch(searchQuery, action.label, action.keywords)
  ), [searchQuery, quickActions]);

  const statCards = useMemo(() => [
    {
      key: 'symptoms-logged',
      label: t('dashboard.stats.logged'),
      value: safeSymptoms.length,
      sub: t('dashboard.stats.all_time'),
      icon: <svg className="w-5 h-5 text-[var(--app-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
      path: '/history'
    },
    {
      key: 'avg-severity',
      label: t('dashboard.stats.avg_sev'),
      value: avgSev,
      sub: t('dashboard.stats.across_logs'),
      icon: <svg className="w-5 h-5 text-[var(--app-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
      path: '/timeline'
    },
    {
      key: 'longest-duration',
      label: t('dashboard.stats.longest'),
      value: longestRun ? `${longestRun}d` : '—',
      sub: t('dashboard.stats.single_run'),
      icon: <svg className="w-5 h-5 text-[var(--app-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      path: '/history'
    },
    {
      key: 'active-alerts',
      label: t('dashboard.stats.alerts'),
      value: String(safeAlerts.length),
      sub: hasAlert() ? t('dashboard.stats.needs_attention') : t('dashboard.stats.all_clear'),
      icon: <svg className="w-5 h-5 text-[var(--app-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
      path: '/alerts'
    },
  ], [t, safeSymptoms.length, avgSev, longestRun, safeAlerts.length, hasAlert]);

  const visibleStatCards = useMemo(() => statCards.filter((card) =>
    matchesSearch(searchQuery, card.label, card.sub, card.keywords)
  ), [searchQuery, statCards]);

  const insights = useMemo(() => [
    {
      key: 'profile-guidance',
      title: t('dashboard.insights.profile_title'),
      body: userProfile?.lifestyle
        ? t('dashboard.insights.profile_body', { lifestyle: userProfile.lifestyle })
        : t('dashboard.insights.profile_empty'),
      keywords: [t('dashboard.insights.profile_title'), 'profile', 'guidance', 'lifestyle'],
      icon: <svg className="w-4 h-4 text-[var(--app-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    }
  ], [t, userProfile]);

  const visibleInsights = useMemo(() => insights.filter((insight) =>
    matchesSearch(searchQuery, insight.title, insight.body, insight.keywords)
  ), [searchQuery, insights]);

  const showAlertBanner = hasAlert() && matchesSearch(
    searchQuery,
    t('dashboard.alert_title'),
    t('dashboard.alert_body'),
    ['alert', 'warning', 'health', 'risk', 'screening']
  );

  const showReminderBanner = !hasAlert() && showReminder && matchesSearch(
    searchQuery,
    t('dashboard.reminder_title'),
    t('dashboard.reminder_body'),
    ['reminder', 'daily', 'track', 'today', 'log']
  );

  const showRiskCard = !hasSearchQuery || matchesSearch(
    searchQuery,
    t('dashboard.risk.title'),
    risk,
    analysisResult?.reason,
    ['analysis', 'scan', 'risk', 'report', 'status']
  );

  const showTrendChart = !hasSearchQuery
    || filteredChartData.length > 0
    || matchesSearch(searchQuery, t('dashboard.charts.trend'), t('dashboard.charts.severity_timeline'), ['severity', 'timeline', 'chart', 'graph']);

  const showDistributionCard = !hasSearchQuery
    || filteredFrequencyData.length > 0
    || matchesSearch(searchQuery, t('dashboard.charts.distribution'), t('dashboard.charts.symptom_frequency'), ['distribution', 'frequency', 'count', 'occurrence']);

  const showInsightsCard = !hasSearchQuery
    || visibleInsights.length > 0
    || matchesSearch(searchQuery, t('dashboard.insights.title'), ['insights', 'guidance', 'profile', 'report']);

  const hasSearchMatches = [
    visibleQuickActions.length > 0,
    showAlertBanner,
    showReminderBanner,
    visibleStatCards.length > 0,
    showRiskCard,
    showTrendChart,
    showDistributionCard,
    showInsightsCard,
  ].some(Boolean);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greeting.morning');
    if (hour < 17) return t('dashboard.greeting.afternoon');
    return t('dashboard.greeting.evening');
  };

  const getStreak = () => {
    if (!safeSymptoms.length) return 0;
    const dates = [...new Set(safeSymptoms.map(s => {
      const d = new Date(s?.date ?? Date.now());
      return !isNaN(d) ? d.toDateString() : null;
    }).filter(Boolean))]
      .map(d => new Date(d).setHours(0,0,0,0))
      .sort((a, b) => b - a);
    
    if (!dates.length) return 0;
    const today = new Date().setHours(0,0,0,0);
    const yesterday = today - 86400000;
    
    if (dates[0] < yesterday) return 0;
    
    let streak = 1;
    for (let i = 0; i < dates.length - 1; i++) {
      if (dates[i] - dates[i+1] === 86400000) streak++;
      else break;
    }
    return streak;
  };

  const streak = getStreak();
  const dateStr = new Date().toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const subtitle = (
    <span className="flex items-center gap-3">
      <span>{dateStr}</span>
      {streak > 0 && <Badge variant="accent">{streak}-day streak</Badge>}
    </span>
  );

  const quickActionsJSX = visibleQuickActions.map((action) => (
    <Button
      key={action.key}
      intent={action.intent}
      size="md"
      onClick={action.onClick}
    >
      {action.icon}
      {action.label}
    </Button>
  ));

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <PageFrame
      title={`${getGreeting()}, ${userProfile?.name || user?.email?.split('@')[0] || t('dashboard.greeting_default')}`}
      subtitle={subtitle}
      actions={quickActionsJSX}
      maxWidthClass="max-w-5xl"
    >

        {!hasSearchQuery && safeDemoMedications.length > 0 && (
          <WidgetErrorBoundary title="Demo Medications">
            <motion.div 
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 120, damping: 14 }}
              className="p-6 bg-[var(--app-surface)] border border-[var(--app-border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-l1)]"
            >
              <div className="mb-4">
                <p className="text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider mb-1 flex justify-between items-center">
                  <span>{t('dashboard.demo_meds.label')}</span>
                  <Badge variant="info">Sample Data</Badge>
                </p>
                <h2 className="text-base font-medium text-[var(--app-text)]">{t('dashboard.demo_meds.title')}</h2>
            </div>
              <ul className="divide-y divide-[var(--app-border)]">
              {safeDemoMedications.map((med) => (
                <li key={med.name} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div>
                       <p className="font-medium text-sm text-[var(--app-text)]">{med.name}</p>
                       <p className="text-xs text-[var(--app-text-muted)]">
                       {med.dose} · {med.schedule}
                     </p>
                   </div>
                    {med.notes && <p className="text-xs text-[var(--app-text-disabled)] sm:text-right max-w-md">{med.notes}</p>}
                </li>
              ))}
            </ul>
            </motion.div>
          </WidgetErrorBoundary>
        )}

        {hasSearchQuery && (
            <motion.div 
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 120, damping: 14 }}
              className="border border-[var(--app-border)] bg-[var(--app-surface)] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-[var(--radius-xl)] shadow-[var(--shadow-l1)]"
            >
            <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--app-text-muted)]">{t('dashboard.search.title')}</p>
                <p className="text-sm text-[var(--app-text)] mt-1">
                {t('dashboard.search.results', { query: searchLabel })}
              </p>
            </div>
            <Button
              onClick={clearDashboardSearch}
              intent="ghost"
              size="sm"
              className="shrink-0 w-full sm:w-auto"
            >
              {t('dashboard.search.clear')}
            </Button>
            </motion.div>
        )}

        {showAlertBanner && (
            <motion.div 
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 120, damping: 14 }}
              className="border border-[var(--app-danger)]/20 bg-[var(--app-danger-bg)] p-4 flex items-start gap-4 rounded-[var(--radius-xl)]"
              role="alert"
              aria-live="assertive"
            >
              <div className="w-8 h-8 bg-[var(--app-danger)]/10 rounded-lg flex items-center justify-center shrink-0 border border-[var(--app-danger)]/20">
                <svg className="w-4 h-4 text-[var(--app-danger)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-[var(--app-danger)] text-sm">{t('dashboard.alert_title')}</h3>
                <p className="text-[var(--app-danger)]/80 text-xs mt-1">{t('dashboard.alert_body')}</p>
              </div>
              <Button
                onClick={() => navigate('/alerts')}
                intent="ghost"
                size="sm"
                className="shrink-0 text-[var(--app-danger)] bg-[var(--app-danger)]/10 hover:bg-[var(--app-danger)]/20"
              >
                {t('dashboard.alert_view')}
              </Button>
            </motion.div>
        )}

        {showReminderBanner && (
            <motion.div 
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.1 }}
              className="border border-[var(--app-border)] bg-[var(--app-surface)] p-4 flex items-center gap-4 rounded-[var(--radius-xl)] shadow-[var(--shadow-l1)]"
            >
              <div className="w-8 h-8 bg-[var(--app-surface-soft)] rounded-lg flex items-center justify-center shrink-0 border border-[var(--app-border)]">
                <svg className="w-4 h-4 text-[var(--app-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium text-[var(--app-text)] text-sm">{t('dashboard.reminder_title')}</p>
                <p className="text-[var(--app-text-muted)] text-xs mt-1">{t('dashboard.reminder_body')}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={() => navigate('/symptoms')}
                  intent="cta"
                  size="sm"
                >
                  {t('dashboard.reminder_log')}
                </Button>
                <button
                  onClick={handleDismissReminder}
                  className="text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors min-h-[32px] flex items-center px-2"
                  aria-label="Dismiss reminder"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </motion.div>
        )}

        {!hasSearchMatches && hasSearchQuery ? (
          <WidgetErrorBoundary title="Search Results">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 14 }}
              className="p-8 text-center border border-[var(--app-border)] bg-[var(--app-surface)] rounded-[var(--radius-xl)]"
            >
              <div className="w-12 h-12 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-soft)] flex items-center justify-center mx-auto mb-4">
                <svg className="w-5 h-5 text-[var(--app-text-disabled)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              </div>
              <h2 className="text-base font-medium text-[var(--app-text)] mb-1">{t('dashboard.search.no_matches')}</h2>
              <p className="text-sm text-[var(--app-text-muted)] max-w-md mx-auto">
              {t('dashboard.search.no_matches_sub')}
            </p>
            </motion.div>
          </WidgetErrorBoundary>
        ) : (
          <>
            {visibleStatCards.length > 0 && (
              <WidgetErrorBoundary title="Statistics Overview">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {visibleStatCards.map((card) => (
                    <motion.button 
                      key={card.key}
                      whileHover={{ y: -4, scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                      onClick={() => navigate(card.path)} 
                      className="text-left w-full h-full block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] rounded-[var(--radius-xl)] cursor-pointer"
                      aria-label={`${card.label}: ${card.value} ${card.sub}`}
                    >
                      <Card elevation={1} className="h-full flex flex-col justify-between hover:shadow-[var(--shadow-l2)] transition-shadow">
                        <div className="flex justify-between items-start mb-6">
                          <span className="text-xs uppercase tracking-wider text-[var(--app-text-muted)] font-medium">{card.label}</span>
                          <div aria-hidden="true">{card.icon}</div>
                        </div>
                        <div>
                          <span className="text-2xl tracking-tight text-[var(--app-text)] font-bold tabular-nums">{card.value}</span>
                          {card.sub && <p className="text-xs text-[var(--app-text-muted)] mt-1">{card.sub}</p>}
                        </div>
                      </Card>
                    </motion.button>
                  ))}
                </div>
              </WidgetErrorBoundary>
            )}

            {/* Advanced Mathematical Diagnostics Biomarkers Section */}
            <WidgetErrorBoundary title="Mathematical Health Biomarkers">
              <motion.div 
                initial={{ opacity: 0, y: 16 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.15 }}
                className="mt-6"
              >
                <Card elevation={2} className="relative overflow-hidden border border-[var(--app-border)] bg-[var(--app-surface)]">
                  {/* Geometric background grid vector */}
                  <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--app-text) 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                  
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[var(--app-border)] pb-4 mb-6">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--brand-accent)] font-semibold">Analytical Modeling Engine v1.0.4</span>
                      <h3 className="text-base font-bold text-[var(--app-text)] mt-0.5">Biomarker Dynamics & Mathematical Diagnostics</h3>
                    </div>
                    <Badge variant="accent" className="font-mono text-[10px] tracking-wider mt-2 md:mt-0">Ecosystem Stability: Active</Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Entropy Meter */}
                    <div className="p-5 rounded-[var(--radius-lg)] bg-[var(--app-surface-soft)] border border-[var(--app-border-soft)] flex flex-col justify-between h-full relative group hover:border-[var(--brand-accent)] transition-colors">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider">Information Entropy</span>
                          <span className="font-mono text-[9px] text-[var(--app-text-disabled)] bg-[var(--app-surface)] px-1.5 py-0.5 rounded">H = -Σ p_i log₂ p_i</span>
                        </div>
                        <p className="text-xs text-[var(--app-text-disabled)] leading-relaxed mt-1">
                          Measures the structural randomness of symptom occurrences. Lower values indicate highly structured and predictable patterns.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-[var(--app-border-soft)] flex justify-between items-end">
                        <div>
                          <span className={`text-2xl font-bold tracking-tight ${entropyMetric.color}`}>{entropyMetric.value}</span>
                          <span className="text-[10px] font-mono text-[var(--app-text-disabled)] ml-1">bits</span>
                        </div>
                        <span className="text-[10px] font-semibold text-[var(--app-text-muted)] bg-[var(--app-surface)] px-2 py-1 rounded-full">{entropyMetric.status}</span>
                      </div>
                    </div>

                    {/* Dispersion Meter */}
                    <div className="p-5 rounded-[var(--radius-lg)] bg-[var(--app-surface-soft)] border border-[var(--app-border-soft)] flex flex-col justify-between h-full relative group hover:border-[var(--brand-accent)] transition-colors">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider">Severity Dispersion</span>
                          <span className="font-mono text-[9px] text-[var(--app-text-disabled)] bg-[var(--app-surface)] px-1.5 py-0.5 rounded">σ = √[Σ(x_i-μ)²/N]</span>
                        </div>
                        <p className="text-xs text-[var(--app-text-disabled)] leading-relaxed mt-1">
                          Quantifies the standard deviation of symptom intensities. Lower values denote stable, uniform severity thresholds.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-[var(--app-border-soft)] flex justify-between items-end">
                        <div>
                          <span className={`text-2xl font-bold tracking-tight ${dispersionMetric.color}`}>{dispersionMetric.value}</span>
                          <span className="text-[10px] font-mono text-[var(--app-text-disabled)] ml-1">points</span>
                        </div>
                        <span className="text-[10px] font-semibold text-[var(--app-text-muted)] bg-[var(--app-surface)] px-2 py-1 rounded-full">{dispersionMetric.status}</span>
                      </div>
                    </div>

                    {/* Temporal Drift */}
                    <div className="p-5 rounded-[var(--radius-lg)] bg-[var(--app-surface-soft)] border border-[var(--app-border-soft)] flex flex-col justify-between h-full relative group hover:border-[var(--brand-accent)] transition-colors">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider">Temporal Drift Coefficient</span>
                          <span className="font-mono text-[9px] text-[var(--app-text-disabled)] bg-[var(--app-surface)] px-1.5 py-0.5 rounded">r = Cov(X,Y)/(σ_x σ_y)</span>
                        </div>
                        <p className="text-xs text-[var(--app-text-disabled)] leading-relaxed mt-1">
                          Measures linear correlation of severity over time. A negative drift indicates a trend towards recovery.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-[var(--app-border-soft)] flex justify-between items-end">
                        <div>
                          <span className={`text-2xl font-bold tracking-tight ${driftMetric.color}`}>{driftMetric.value}</span>
                          <span className="text-[10px] font-mono text-[var(--app-text-disabled)] ml-1">coeff</span>
                        </div>
                        <span className="text-[10px] font-semibold text-[var(--app-text-muted)] bg-[var(--app-surface)] px-2 py-1 rounded-full">{driftMetric.status}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </WidgetErrorBoundary>


            {(showRiskCard || showTrendChart) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch gap-6">
                {showRiskCard && (
                  <WidgetErrorBoundary title={t('dashboard.risk.title')}>
                    <motion.div 
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.2 }}
                      className="h-full"
                    >
                      <Card elevation={1} className="h-full flex flex-col justify-between">
                        <div>
                          <h2 className="text-lg font-bold text-[var(--app-text)] mb-1">
                            {t('dashboard.risk.title')}
                            {analysisResult?.created_at && (
                              <span className="ml-2 text-xs font-normal text-[var(--app-text-muted)]">
                                Last updated {new Date(analysisResult.created_at).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </h2>
                          <div className="mt-4 mb-4">
                            <Badge variant={risk ? risk.toLowerCase() : 'pending'}>
                              {risk ? t(`dashboard.risk.${risk.toLowerCase()}`, { defaultValue: risk }) : t('dashboard.risk.not_assessed')}
                            </Badge>
                          </div>

                    {!analysisResult ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                          <svg className="w-10 h-10 text-[var(--app-text-disabled)] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                          <p className="text-sm text-[var(--app-text-muted)] mb-4">{t('dashboard.risk.action_pending')}</p>
                          <Button intent="primary" size="sm" onClick={() => navigate('/analysis')}>
                          {t('dashboard.run_analysis')}
                          </Button>
                      </div>
                    ) : (
                          <p className="max-w-prose text-sm leading-relaxed text-[var(--app-text-muted)] mb-6">
                              {analysisResult.reason}
                            </p>
                    )}
                        </div>
                        {analysisResult && (
                          <div>
                            <Button intent="ghost" size="sm" onClick={() => navigate('/analysis')}>
                              {t('analysis.report.view_full_report', 'View Full Report')}
                            </Button>
                          </div>
                        )}
                      </Card>
                    </motion.div>
                  </WidgetErrorBoundary>
                )}

                {showTrendChart && (
                  <WidgetErrorBoundary title={t('dashboard.charts.severity_timeline')}>
                    <motion.div 
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.25 }}
                      className="h-full"
                    >
                      <Card elevation={1} className="h-full flex flex-col" role="img" aria-label={t('dashboard.charts.severity_timeline')}>
                      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                          <p className="text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider">{t('dashboard.charts.trend')}</p>
                          <h2 className="text-base font-medium text-[var(--app-text)] mt-1">{t('dashboard.charts.severity_timeline')}</h2>
                      </div>
                        <span className="text-xs text-[var(--app-text-disabled)]">
                        {t('dashboard.charts.data_points', { count: (hasSearchQuery ? filteredChartData : chartData).length })}
                      </span>
                    </div>

                    {(hasSearchQuery ? filteredChartData : chartData).length > 0 ? (
                        <div className="flex-1 flex flex-col">
                          <div className="min-h-[288px] w-full flex-1">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={hasSearchQuery ? filteredChartData : chartData}
                              margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                            >
                              <defs>
                                  <linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="var(--app-chart-secondary)" />
                                    <stop offset="100%" stopColor="var(--app-chart-primary)" />
                                  </linearGradient>
                                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--app-chart-primary)" stopOpacity={0.15} />
                                    <stop offset="100%" stopColor="var(--app-chart-primary)" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--app-chart-grid)" vertical={false} />
                              <XAxis
                                dataKey="name"
                                  tick={{ fill: 'var(--app-chart-axis)', fontSize: 11 }}
                                tickLine={false}
                                  axisLine={{ stroke: 'var(--app-border)' }}
                                  dy={10}
                              />
                              <YAxis
                                domain={[0, 10]}
                                  tick={{ fill: 'var(--app-chart-axis)', fontSize: 11 }}
                                tickLine={false}
                                  axisLine={{ stroke: 'var(--app-border)' }}
                                  width={24}
                              />
                                <Tooltip 
                                  content={<CustomTooltip t={t} />} 
                                  animationDuration={0}
                                  cursor={{ stroke: 'var(--app-border)', strokeWidth: 1 }}
                                />
                              <Area
                                  type="basis"
                                dataKey="severity"
                                name={t('history.table.severity')}
                                  stroke={`url(#${strokeId})`}
                                strokeWidth={2.5}
                                fill={`url(#${gradientId})`}
                                  dot={false}
                                  activeDot={{ r: 4, fill: 'var(--app-chart-primary)', stroke: 'var(--app-chart-dot)', strokeWidth: 2 }}
                                  isAnimationActive={false}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                          <p className="mt-4 text-xs text-[var(--app-text-muted)] leading-relaxed">
                          Severity (0–10)
                        </p>
                      </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-[var(--app-border)] rounded-[var(--radius-lg)] bg-[var(--app-surface-soft)] py-12 text-center h-72">
                          <svg className="w-8 h-8 text-[var(--app-text-disabled)] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4" />
                          </svg>
                          <p className="text-sm font-medium text-[var(--app-text)]">
                          {hasSearchQuery ? t('dashboard.charts.no_match') : t('dashboard.charts.no_data')}
                        </p>
                          <p className="text-xs text-[var(--app-text-muted)] mt-1">
                          {hasSearchQuery ? t('dashboard.charts.no_match_sub') : t('dashboard.charts.no_data_sub')}
                        </p>
                      </div>
                    )}
                      </Card>
                    </motion.div>
                  </WidgetErrorBoundary>
                )}
              </div>
            )}

            {(showDistributionCard || showInsightsCard) && (
              <div className={`grid grid-cols-1 items-stretch gap-6 ${showDistributionCard && showInsightsCard ? 'md:grid-cols-2' : ''}`}>
                {showDistributionCard && (
                  <WidgetErrorBoundary title={t('dashboard.charts.symptom_frequency')}>
                    <motion.div 
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.3 }}
                      className="h-full"
                    >
                      <Card elevation={1} className="h-full flex flex-col justify-between" role="img" aria-label={t('dashboard.charts.symptom_frequency')}>
                      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                          <p className="text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider">{t('dashboard.charts.distribution')}</p>
                          <h2 className="text-base font-medium text-[var(--app-text)] mt-1">{t('dashboard.charts.symptom_frequency')}</h2>
                      </div>
                    </div>

                    {(hasSearchQuery ? filteredFrequencyData : frequencyData).length > 0 ? (
                        <div className="flex-1 flex flex-col">
                          <div className="min-h-[288px] w-full flex-1">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={hasSearchQuery ? filteredFrequencyData : frequencyData}
                              margin={{ top: 8, right: 16, left: 4, bottom: 8 }}
                              layout="vertical"
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--app-chart-grid)" horizontal={false} />
                              <XAxis
                                type="number"
                                  tick={{ fill: 'var(--app-chart-axis)', fontSize: 11 }}
                                tickLine={false}
                                  axisLine={{ stroke: 'var(--app-border)' }}
                                allowDecimals={false}
                              />
                              <YAxis
                                dataKey="name"
                                type="category"
                                  width={dynamicYAxisWidth}
                                  tick={{ fill: 'var(--app-text)', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <Tooltip
                                  cursor={{ fill: 'var(--app-chart-grid)' }}
                                  contentStyle={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)', color: 'var(--app-text)', fontSize: '12px' }}
                                  animationDuration={0}
                              />
                              <Bar
                                dataKey="count"
                                name={t('charts.y_count')}
                                  fill="var(--app-chart-primary)"
                                  radius={[0, 4, 4, 0]}
                                  barSize={16}
                                  isAnimationActive={false}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                          <p className="mt-4 text-xs text-[var(--app-text-muted)] leading-relaxed">
                          {t('charts.caption_bars')}
                        </p>
                      </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-[var(--app-border)] rounded-[var(--radius-lg)] bg-[var(--app-surface-soft)] py-12 text-center h-72">
                          <svg className="w-8 h-8 text-[var(--app-text-disabled)] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <p className="text-sm font-medium text-[var(--app-text)]">
                          {hasSearchQuery ? t('dashboard.charts.no_freq_match') : t('dashboard.charts.no_freq_data')}
                        </p>
                        <p className="text-xs text-[var(--app-text-muted)] mt-1">
                        {t('dashboard.charts.no_freq_sub')}
                      </p>
                      </div>
                    )}

                        <div className="mt-6">
                          <Button intent="ghost" size="sm" onClick={() => navigate('/timeline')} className="w-full">
                            {t('dashboard.charts.view_timeline')}
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  </WidgetErrorBoundary>
                )}

                {showInsightsCard && (
                  <WidgetErrorBoundary title={t('dashboard.insights.title')}>
                    <motion.div 
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.35 }}
                      className="h-full"
                    >
                      <Card elevation={1} className="h-full flex flex-col justify-between">
                        <div>
                      <div className="mb-6">
                            <p className="text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider">{t('dashboard.insights.title')}</p>
                            <h2 className="text-base font-medium text-[var(--app-text)] mt-1">{t('dashboard.insights.personalized_insights')}</h2>
                    </div>

                      <div className="flex-1 space-y-3">
                      {visibleInsights.length > 0 ? (
                        visibleInsights.map((insight) => (
                              <div key={insight.key} className="p-4 bg-[var(--app-surface-soft)] rounded-[var(--radius-lg)] border border-[var(--app-border)]">
                            <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-md bg-[var(--app-surface)] flex items-center justify-center shrink-0 border border-[var(--app-border)]">
                                {insight.icon}
                              </div>
                              <div>
                                    <p className="text-sm font-medium text-[var(--app-text)] mb-1">{insight.title}</p>
                                    <p className="text-xs text-[var(--app-text-muted)] leading-relaxed">{insight.body}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                            <div className="py-12 text-center bg-[var(--app-surface-soft)] rounded-[var(--radius-lg)] border border-dashed border-[var(--app-border)]">
                              <p className="text-sm font-medium text-[var(--app-text)]">{t('dashboard.charts.no_insight_match')}</p>
                              <p className="text-xs text-[var(--app-text-muted)] mt-1">{t('dashboard.charts.no_insight_sub')}</p>
                        </div>
                      )}
                    </div>
                        </div>

                        <div className="mt-6">
                          <Button intent="ghost" size="sm" onClick={() => navigate('/analysis')} className="w-full">
                            {t('dashboard.run_analysis')}
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  </WidgetErrorBoundary>
                )}
              </div>
            )}
          </>
        )}
      </PageFrame>
    );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardInner />
    </Suspense>
  );
}