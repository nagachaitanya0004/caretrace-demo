import { useContext, useDeferredValue, useEffect, useId, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppContext } from '../AppContext';
import { useAuth } from '../AuthContext';
import TestimonialsSection from '../components/TestimonialsSection';
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

import { chartColors, cartesianGridProps, tooltipContentStyle } from '../utils/chartTheme';

const matchesSearch = (query, ...values) => {
  if (!query) {
    return true;
  }

  return values.some((value) => {
    if (Array.isArray(value)) {
      return value.some((item) => String(item ?? '').toLowerCase().includes(query));
    }

    return String(value ?? '').toLowerCase().includes(query);
  });
};

function StatCard({ icon, label, value, sub, accent = 'blue', delay = '' }) {
  const colors = {
    blue: 'from-teal-600 to-cyan-700',
    teal: 'from-sky-600 to-blue-800',
    rose: 'from-rose-500 to-rose-700',
    amber: 'from-amber-400 to-orange-600',
  };

  return (
    <div className={`card-premium p-5 flex items-center gap-4 fade-in ${delay}`}>
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colors[accent]} flex items-center justify-center shadow-md shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-slate-800 leading-none">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label, t }) => {
  if (active && payload?.length) {
    return (
      <div className="px-3 py-2.5 text-sm" style={tooltipContentStyle}>
        <p className="font-semibold text-slate-800 mb-1">{label}</p>
        <p className="text-teal-800 font-semibold">
          {t('history.table.severity')}: {payload[0]?.value}
          <span className="text-slate-500 font-normal"> /10</span>
        </p>
      </div>
    );
  }

  return null;
};

function Dashboard() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const trendGradId = `dash-trend-${useId().replace(/:/g, '')}`;

  const riskMeta = {
    High: { color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', dot: 'bg-rose-500', label: t('dashboard.risk.high', 'High Risk') },
    Medium: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500', label: t('dashboard.risk.medium', 'Medium Risk') },
    Low: { color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200', dot: 'bg-teal-500', label: t('dashboard.risk.low', 'Low Risk') },
    default: { color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', dot: 'bg-slate-400', label: t('dashboard.risk.not_assessed', 'Not Assessed') },
  };
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    userProfile,
    symptoms = [],
    analysisResult,
    hasAlert,
    isLoading,
    alerts,
    demoMedications = [],
    isDemoUser,
  } = useContext(AppContext);
  const { user } = useAuth();
  const [reminderDismissed, setReminderDismissed] = useState(false);
  const [showTestimonials, setShowTestimonials] = useState(false);

  useEffect(() => {
    if (isDemoUser) setShowTestimonials(true);
  }, [isDemoUser]);
  const searchLabel = searchParams.get('q')?.trim() ?? '';
  const searchQuery = useDeferredValue(searchLabel.toLowerCase());
  const hasSearchQuery = searchLabel.length > 0;

  const risk = analysisResult?.risk || null;
  const meta = riskMeta[risk] || riskMeta.default;
  const avgSev = symptoms.length
    ? (symptoms.reduce((sum, item) => sum + Number(item.severity), 0) / symptoms.length).toFixed(1)
    : '—';
  const longestRun = symptoms.length ? Math.max(...symptoms.map((symptom) => Number(symptom.duration))) : 0;

  const formatShortDate = (date) =>
    new Date(date).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });

  const chartData = [...symptoms]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((symptom) => ({
      name: formatShortDate(symptom.date),
      severity: parseInt(symptom.severity),
      symptom: symptom.symptom,
      duration: Number(symptom.duration),
    }));

  const filteredChartData = chartData.filter((entry) =>
    matchesSearch(searchQuery, entry.symptom, entry.name, entry.severity, entry.duration)
  );

  const frequencyMap = {};
  symptoms.forEach((symptom) => {
    const normalizedName = symptom.symptom.toLowerCase().trim();
    frequencyMap[normalizedName] = (frequencyMap[normalizedName] || 0) + 1;
  });

  const frequencyData = Object.keys(frequencyMap)
    .map((key) => ({
      name: t(`symptoms.options.${key.toLowerCase()}`, { defaultValue: key.charAt(0).toUpperCase() + key.slice(1) }),
      count: frequencyMap[key],
    }))
    .sort((a, b) => b.count - a.count);

  const filteredFrequencyData = frequencyData.filter((entry) =>
    matchesSearch(searchQuery, entry.name, entry.count, ['distribution', 'frequency', 'symptom', 'count'])
  );

  const todayLogged = symptoms.some((symptom) => new Date(symptom.date).toDateString() === new Date().toDateString());
  const showReminder = !hasAlert() && !todayLogged && !reminderDismissed;

  const clearDashboardSearch = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('q');
    setSearchParams(nextParams, { replace: true });
  };

  const quickActions = [
    {
      key: 'log-symptom',
      label: t('dashboard.log_symptom'),
      keywords: ['symptom', 'log', 'track', 'entry', 'record'],
      className: 'flex items-center gap-2 px-4 py-2.5 bg-white text-zinc-800 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>,
      onClick: () => navigate('/symptoms'),
    },
    {
      key: 'run-analysis',
      label: t('dashboard.run_analysis'),
      keywords: ['analysis', 'risk', 'scan', 'insights', 'report'],
      className: 'flex items-center gap-2 px-4 py-2.5 bg-white/15 text-white border border-white/30 rounded-xl text-sm font-semibold hover:bg-white/25 transition-all duration-200',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
      onClick: () => navigate('/analysis'),
    },
    {
      key: 'timeline',
      label: t('dashboard.view_timeline'),
      keywords: ['timeline', 'history', 'dates', 'recent', 'symptoms'],
      className: 'flex items-center gap-2 px-4 py-2.5 bg-white/15 text-white border border-white/30 rounded-xl text-sm font-semibold hover:bg-white/25 transition-all duration-200',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
      onClick: () => navigate('/timeline'),
    },
    {
      key: 'testimonials',
      label: t('dashboard.testimonials_btn'),
      keywords: ['testimonials', 'reviews', 'feedback', 'users'],
      className: `flex items-center gap-2 px-4 py-2.5 ${showTestimonials ? 'bg-white/30 text-white' : 'bg-white/15 text-white hover:bg-white/25'} border border-white/30 rounded-xl text-sm font-semibold transition-all duration-200`,
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
      onClick: () => setShowTestimonials(!showTestimonials),
    },
  ];

  const visibleQuickActions = quickActions.filter((action) =>
    matchesSearch(searchQuery, action.label, action.keywords)
  );

  const statCards = [
    {
      key: 'symptoms-logged',
      accent: 'blue',
      delay: 'stagger-1',
      label: t('dashboard.stats.logged'),
      value: isLoading ? '—' : symptoms.length,
      sub: t('dashboard.stats.all_time'),
      keywords: ['symptoms', 'logged', 'entries', 'tracking', 'count'],
      icon: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
    },
    {
      key: 'avg-severity',
      accent: 'teal',
      delay: 'stagger-2',
      label: t('dashboard.stats.avg_sev'),
      value: isLoading ? '—' : avgSev,
      sub: t('dashboard.stats.across_logs'),
      keywords: ['average', 'severity', 'logs', 'symptoms', 'score'],
      icon: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
    },
    {
      key: 'longest-duration',
      accent: 'amber',
      delay: 'stagger-3',
      label: t('dashboard.stats.longest'),
      value: isLoading ? '—' : longestRun ? `${longestRun}d` : '—',
      sub: t('dashboard.stats.single_run'),
      keywords: ['longest', 'duration', 'run', 'days', 'symptom'],
      icon: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      key: 'active-alerts',
      accent: 'rose',
      delay: 'stagger-4',
      label: t('dashboard.stats.alerts'),
      value: isLoading ? '—' : String(alerts?.length ?? 0),
      sub: hasAlert() ? t('dashboard.stats.needs_attention') : t('dashboard.stats.all_clear'),
      keywords: ['alerts', 'warning', 'health alert', 'attention', 'risk'],
      icon: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
    },
  ];

  const visibleStatCards = statCards.filter((card) =>
    matchesSearch(searchQuery, card.label, card.sub, card.keywords)
  );

  const insights = [
    {
      key: 'profile-guidance',
      title: t('dashboard.insights.profile_title'),
      body: userProfile?.lifestyle
        ? t('dashboard.insights.profile_body', { lifestyle: userProfile.lifestyle })
        : t('dashboard.insights.profile_empty'),
      keywords: ['profile', 'guidance', 'lifestyle', 'settings', 'recommendations'],
      className: 'p-4 bg-zinc-50 rounded-2xl border border-zinc-100',
      iconWrapClassName: 'w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0',
      titleClassName: 'text-sm font-semibold text-zinc-900 mb-0.5',
      bodyClassName: 'text-xs text-zinc-800 leading-relaxed',
      icon: <svg className="w-4 h-4 text-zinc-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    },
    ...(symptoms.length > 0
      ? [
          {
            key: 'tracking-pattern',
            title: t('dashboard.insights.pattern_title'),
            body: t('dashboard.insights.pattern_body', { count: symptoms.length, avg: avgSev }),
            keywords: ['tracking', 'pattern', 'severity', 'analysis', 'symptoms', 'trend'],
            className: 'p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl border border-teal-100',
            iconWrapClassName: 'w-8 h-8 rounded-xl bg-teal-100 flex items-center justify-center shrink-0',
            titleClassName: 'text-sm font-semibold text-teal-900 mb-0.5',
            bodyClassName: 'text-xs text-teal-700 leading-relaxed',
            icon: <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
          },
        ]
      : []),
  ];

  const visibleInsights = insights.filter((insight) =>
    matchesSearch(searchQuery, insight.title, insight.body, insight.keywords)
  );

  const showAlertBanner = hasAlert() && matchesSearch(
    searchQuery,
    t('dashboard.alert_title'),
    t('dashboard.alert_body'),
    ['alert', 'warning', 'health', 'risk', 'screening']
  );

  const showReminderBanner = showReminder && matchesSearch(
    searchQuery,
    t('dashboard.reminder_title'),
    t('dashboard.reminder_body'),
    ['reminder', 'daily', 'track', 'today', 'log']
  );

  const showRiskCard = !hasSearchQuery || matchesSearch(
    searchQuery,
    t('dashboard.risk.title'),
    meta.label,
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

  return (
    <div className="h-full overflow-y-auto">
      <div className="gradient-ocean px-8 pt-8 pb-10 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full pointer-events-none" />
        <div className="absolute top-4 right-28 w-24 h-24 bg-white/5 rounded-full pointer-events-none" />

        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="fade-in">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-zinc-200 text-xs font-semibold uppercase tracking-widest">CareTrace AI</span>
              <span className="text-zinc-300/50">·</span>
              <span className="text-zinc-200 text-xs">{t('dashboard.tagline')}</span>
            </div>
            {isLoading ? (
              <div className="skeleton h-9 w-64 mb-2" />
            ) : (
              <h1 className="text-3xl font-bold text-white leading-tight">
                {userProfile?.name ? t('dashboard.welcome', { name: userProfile.name }) : t('dashboard.hello', { name: user?.email?.split('@')[0] || t('dashboard.welcome_default') })} 👋
              </h1>
            )}
            <p className="text-zinc-200 text-sm mt-1.5 font-medium">
              {isLoading
                ? t('dashboard.loading')
                : t('dashboard.tracked_count', { count: symptoms.length })} · {new Date().toLocaleDateString(i18n.language, { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {visibleQuickActions.length > 0 && (
            <div className="flex flex-wrap gap-3 fade-in stagger-1">
              {visibleQuickActions.map((action) => (
                <button
                  key={action.key}
                  onClick={action.onClick}
                  className={action.className}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 md:px-8 -mt-5 pb-10">
        
        {!hasSearchQuery && showTestimonials && <TestimonialsSection />}

        {!hasSearchQuery && demoMedications.length > 0 && (
          <div className="card-premium mb-6 p-6 border-sky-100 bg-white slide-up">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide">
                  {t('dashboard.demo_meds.label')}
                </p>
                <h2 className="text-lg font-bold text-slate-800">{t('dashboard.demo_meds.title')}</h2>
              </div>
            </div>
            <ul className="divide-y divide-slate-100">
              {demoMedications.map((med) => (
                <li key={med.name} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div>
                    <p className="font-semibold text-slate-800">{med.name}</p>
                    <p className="text-sm text-slate-500">
                      {med.dose} · {med.schedule}
                    </p>
                  </div>
                  {med.notes && <p className="text-xs text-slate-400 sm:text-right max-w-md">{med.notes}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasSearchQuery && (
          <div className="card-premium mb-6 border-zinc-100 bg-zinc-50/80 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 fade-in">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">{t('dashboard.search.title')}</p>
              <p className="text-sm text-slate-700">
                {t('dashboard.search.results', { query: searchLabel })}
              </p>
            </div>
            <button
              type="button"
              onClick={clearDashboardSearch}
              className="shrink-0 text-xs font-semibold text-zinc-800 bg-white hover:bg-zinc-100 border border-zinc-200 px-3 py-2 rounded-lg transition-colors"
            >
              {t('dashboard.search.clear')}
            </button>
          </div>
        )}

        {showAlertBanner && (
          <div className="alert-pulse card-premium mb-6 border-rose-200 bg-rose-50/80 p-4 flex items-start gap-4 fade-in">
            <div className="w-9 h-9 bg-rose-100 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-rose-800 text-sm">{t('dashboard.alert_title')}</h3>
              <p className="text-rose-700 text-sm mt-0.5">{t('dashboard.alert_body')}</p>
            </div>
            <button
              onClick={() => navigate('/alerts')}
              className="shrink-0 text-xs font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200 border border-rose-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              {t('dashboard.alert_view')}
            </button>
          </div>
        )}

        {showReminderBanner && (
          <div className="card-premium mb-6 border-indigo-100 bg-indigo-50/70 p-4 flex items-center gap-4 fade-in stagger-1">
            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-indigo-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-indigo-800 text-sm">{t('dashboard.reminder_title')}</p>
              <p className="text-indigo-600 text-xs mt-0.5">{t('dashboard.reminder_body')}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => navigate('/symptoms')}
                className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors"
              >
                {t('dashboard.reminder_log')}
              </button>
              <button
                onClick={() => setReminderDismissed(true)}
                className="text-xs text-indigo-400 hover:text-indigo-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {!hasSearchMatches && hasSearchQuery ? (
          <div className="card-premium p-8 text-center border-dashed border-slate-200 bg-slate-50/70 fade-in">
            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-1">{t('dashboard.search.no_matches')}</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {t('dashboard.search.no_matches_sub')}
            </p>
          </div>
        ) : (
          <>
            {visibleStatCards.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {visibleStatCards.map((card) => (
                  <StatCard
                    key={card.key}
                    accent={card.accent}
                    delay={card.delay}
                    label={card.label}
                    value={card.value}
                    sub={card.sub}
                    icon={card.icon}
                  />
                ))}
              </div>
            )}

            {(showRiskCard || showTrendChart) && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {showRiskCard && (
                  <div className={`card-premium p-6 ${meta.bg} ${meta.border} border slide-up ${showTrendChart ? '' : 'lg:col-span-3'}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('dashboard.risk.title')}</p>
                        <h2 className="text-lg font-bold text-slate-800 mt-0.5">{t('dashboard.risk.status')}</h2>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${meta.border} ${meta.bg}`}>
                        <span className={`w-2 h-2 rounded-full ${meta.dot} ${risk === 'High' ? 'animate-pulse' : ''}`} />
                        <span className={`text-xs font-bold ${meta.color}`}>{meta.label}</span>
                      </div>
                    </div>

                    {!analysisResult ? (
                      <div className="py-6 flex flex-col items-center text-center">
                        <div className="w-14 h-14 rounded-2xl bg-white/60 border border-slate-200 flex items-center justify-center mb-4 shadow-sm">
                          <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </div>
                        <p className="text-sm text-slate-600 font-medium mb-1">{t('dashboard.risk.no_analysis')}</p>
                        <p className="text-xs text-slate-400 mb-4">{t('dashboard.risk.no_analysis_sub')}</p>
                        <button
                          onClick={() => navigate('/analysis')}
                          className="px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-700 hover:from-teal-700 hover:to-cyan-800 text-white text-xs font-semibold rounded-xl transition-all shadow-md"
                        >
                          {t('dashboard.run_analysis')}
                        </button>
                      </div>
                    ) : (
                      <div className="slide-up">
                        <div className={`text-5xl font-extrabold ${meta.color} mb-3`}>
                          {risk
                            ? t(`dashboard.risk.${String(risk).toLowerCase()}`, { defaultValue: risk })
                            : meta.label}
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed mb-4 bg-white/50 p-3 rounded-xl border border-white">
                          {analysisResult.reason}
                        </p>
                        <button
                          onClick={() => navigate('/analysis')}
                          className="w-full py-2 text-xs font-semibold text-slate-600 bg-white/70 hover:bg-white border border-slate-200 rounded-xl transition-all"
                        >
                          {t('analysis.report.view_full_report', 'View Full Report →')}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {showTrendChart && (
                  <div className={`card-premium p-6 slide-up stagger-1 ${showRiskCard ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('dashboard.charts.trend')}</p>
                        <h2 className="text-lg font-bold text-slate-800">{t('dashboard.charts.severity_timeline')}</h2>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">
                        {t('dashboard.charts.data_points', { count: (hasSearchQuery ? filteredChartData : chartData).length })}
                      </span>
                    </div>

                    {(hasSearchQuery ? filteredChartData : chartData).length > 0 ? (
                      <div>
                        <div className="h-52 sm:h-56 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={hasSearchQuery ? filteredChartData : chartData}
                              margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                            >
                              <defs>
                                <linearGradient id={trendGradId} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.22} />
                                  <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid {...cartesianGridProps} />
                              <XAxis
                                dataKey="name"
                                tick={{ fill: chartColors.axis, fontSize: 11 }}
                                tickLine={false}
                                axisLine={{ stroke: chartColors.grid }}
                                label={{ value: t('charts.x_time'), position: 'bottom', offset: 0, fill: chartColors.axis, fontSize: 11 }}
                              />
                              <YAxis
                                domain={[0, 10]}
                                tick={{ fill: chartColors.axis, fontSize: 11 }}
                                tickLine={false}
                                axisLine={{ stroke: chartColors.grid }}
                                width={36}
                                label={{
                                  value: t('charts.y_severity'),
                                  angle: -90,
                                  position: 'insideLeft',
                                  fill: chartColors.axis,
                                  fontSize: 11,
                                }}
                              />
                              <Tooltip content={<CustomTooltip t={t} />} />
                              <Area
                                type="monotone"
                                dataKey="severity"
                                name={t('history.table.severity')}
                                stroke={chartColors.primary}
                                strokeWidth={2.5}
                                fill={`url(#${trendGradId})`}
                                dot={{ r: 4, fill: '#fff', stroke: chartColors.primary, strokeWidth: 2 }}
                                activeDot={{ r: 6, fill: chartColors.secondary }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="mt-3 text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
                          {t('charts.caption_trend')}
                        </p>
                      </div>
                    ) : (
                      <div className="h-48 flex flex-col items-center justify-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                        <svg className="w-10 h-10 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                        </svg>
                        <p className="text-sm font-medium text-slate-400">
                          {hasSearchQuery ? t('dashboard.charts.no_match') : t('dashboard.charts.no_data')}
                        </p>
                        <p className="text-xs text-slate-300 mt-1">
                          {hasSearchQuery ? t('dashboard.charts.no_match_sub') : t('dashboard.charts.no_data_sub')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {(showDistributionCard || showInsightsCard) && (
              <div className={`grid grid-cols-1 gap-6 ${showDistributionCard && showInsightsCard ? 'md:grid-cols-2' : ''}`}>
                {showDistributionCard && (
                  <div className="card-premium p-6 slide-up stagger-2">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('dashboard.charts.distribution')}</p>
                        <h2 className="text-lg font-bold text-slate-800">{t('dashboard.charts.symptom_frequency')}</h2>
                      </div>
                    </div>

                    {(hasSearchQuery ? filteredFrequencyData : frequencyData).length > 0 ? (
                      <div>
                        <div className="h-52 sm:h-56 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={hasSearchQuery ? filteredFrequencyData : frequencyData}
                              margin={{ top: 8, right: 16, left: 4, bottom: 8 }}
                              layout="vertical"
                            >
                              <CartesianGrid {...cartesianGridProps} />
                              <XAxis
                                type="number"
                                tick={{ fill: chartColors.axis, fontSize: 11 }}
                                tickLine={false}
                                axisLine={{ stroke: chartColors.grid }}
                                allowDecimals={false}
                                label={{ value: t('charts.y_count'), position: 'bottom', offset: 0, fill: chartColors.axis, fontSize: 11 }}
                              />
                              <YAxis
                                dataKey="name"
                                type="category"
                                width={108}
                                tick={{ fill: chartColors.axis, fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <Tooltip
                                cursor={{ fill: chartColors.primaryMuted }}
                                contentStyle={tooltipContentStyle}
                              />
                              <Bar
                                dataKey="count"
                                name={t('charts.y_count')}
                                fill={chartColors.primary}
                                radius={[0, 8, 8, 0]}
                                barSize={22}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="mt-3 text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
                          {t('charts.caption_bars')}
                        </p>
                      </div>
                    ) : (
                      <div className="h-48 flex flex-col items-center justify-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-sm font-medium text-slate-400">
                          {hasSearchQuery ? t('dashboard.charts.no_freq_match') : t('dashboard.charts.no_freq_data')}
                        </p>
                      </div>
                    )}

                    <button
                      onClick={() => navigate('/timeline')}
                      className="mt-4 w-full py-2.5 text-xs font-semibold text-zinc-800 hover:text-zinc-800 bg-zinc-50 hover:bg-zinc-100 rounded-xl transition-colors"
                    >
                      {t('dashboard.charts.view_timeline')}
                    </button>
                  </div>
                )}

                {showInsightsCard && (
                  <div className="card-premium p-6 slide-up stagger-3">
                    <div className="mb-5">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('dashboard.insights.title')}</p>
                      <h2 className="text-lg font-bold text-slate-800">{t('dashboard.insights.personalized_insights')}</h2>
                    </div>

                    <div className="space-y-3">
                      {visibleInsights.length > 0 ? (
                        visibleInsights.map((insight) => (
                          <div key={insight.key} className={insight.className}>
                            <div className="flex items-start gap-3">
                              <div className={insight.iconWrapClassName}>
                                {insight.icon}
                              </div>
                              <div>
                                <p className={insight.titleClassName}>{insight.title}</p>
                                <p className={insight.bodyClassName}>{insight.body}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-6 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                          <p className="text-sm font-medium text-slate-500">{t('dashboard.charts.no_insight_match')}</p>
                          <p className="text-xs text-slate-400 mt-1">{t('dashboard.charts.no_insight_sub')}</p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => navigate('/reports')}
                      className="mt-4 w-full py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                      {t('dashboard.charts.view_report')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
