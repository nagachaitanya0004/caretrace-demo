// CareTrace AI - Dashboard Component
// Licensed under MIT License
// Type definitions and component structure are original work

import React, { Suspense, useContext, useDeferredValue, useEffect, useId, useMemo, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../AppContext';
import { useAuth } from '../AuthContext';
import { useNotification } from '../NotificationContext';
import { api, unwrapApiPayload, API_BASE_URL } from '../services/api';
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
          <span className="text-[var(--app-text-muted)] opacity-70 font-normal">/10</span>
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
  const [timeRange, setTimeRange] = useState('all');
  const [showXaiHelp, setShowXaiHelp] = useState(false);

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
  // longestRun removed to satisfy lint

  // Today Logged & Streak (Computed early to avoid TDZ ReferenceError)
  const todayLogged = useMemo(() => {
    return safeSymptoms.some((symptom) => new Date(symptom?.date ?? 0).toDateString() === new Date().toDateString());
  }, [safeSymptoms]);

  const streak = useMemo(() => {
    if (!safeSymptoms.length) return 0;
    const dates = [...new Set(safeSymptoms.map(s => {
      const d = new Date(s?.date ?? Date.now());
      return !isNaN(d) ? d.toDateString() : null;
    }).filter(Boolean))]
      .map(d => new Date(d).setHours(0, 0, 0, 0))
      .sort((a, b) => b - a);

    if (!dates.length) return 0;
    const today = new Date().setHours(0, 0, 0, 0);
    const yesterday = today - 86400000;

    if (dates[0] < yesterday) return 0;

    let streak = 1;
    for (let i = 0; i < dates.length - 1; i++) {
      if (dates[i] - dates[i + 1] === 86400000) streak++;
      else break;
    }
    return streak;
  }, [safeSymptoms]);

  const last7DaysStreakLog = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateString = d.toDateString();
      const hasLog = safeSymptoms.some(s => new Date(s?.date ?? 0).toDateString() === dateString);
      days.push({
        label: d.toLocaleDateString(i18n.language, { weekday: 'narrow' }), // e.g. "M", "T"
        hasLog,
        isToday: i === 0,
      });
    }
    return days;
  }, [safeSymptoms, i18n.language]);

  // Profile Completion Score
  const profileCompletionScore = useMemo(() => {
    if (!userProfile) return 0;
    const fields = ['name', 'age', 'gender', 'lifestyle', 'height_cm', 'weight_kg'];
    let filled = 0;
    fields.forEach((field) => {
      if (userProfile[field] !== undefined && userProfile[field] !== null && userProfile[field] !== '') {
        filled++;
      }
    });
    return Math.round((filled / fields.length) * 100);
  }, [userProfile]);

  // Wellness Index Calculations
  const wellnessIndex = useMemo(() => {
    let score = 95;
    const severityVal = parseFloat(avgSev);
    if (!isNaN(severityVal)) {
      score -= severityVal * 6;
    }
    if (safeAlerts.length > 0) {
      score -= Math.min(25, safeAlerts.length * 8);
    }
    const streakVal = todayLogged ? 5 : 0;
    score += streakVal;
    return Math.max(10, Math.min(100, Math.round(score)));
  }, [avgSev, safeAlerts.length, todayLogged]);

  const { wellnessStatusText, wellnessBarColor } = useMemo(() => {
    if (wellnessIndex >= 90) return { wellnessStatusText: 'Optimal Health Alignment', wellnessBarColor: 'bg-[var(--brand-accent)]' };
    if (wellnessIndex >= 75) return { wellnessStatusText: 'Stable Condition Profile', wellnessBarColor: 'bg-[var(--app-info)]' };
    if (wellnessIndex >= 60) return { wellnessStatusText: 'Mild Variances Detected', wellnessBarColor: 'bg-[var(--app-warning)]' };
    return { wellnessStatusText: 'Clinical Attention Recommended', wellnessBarColor: 'bg-[var(--app-danger)]' };
  }, [wellnessIndex]);

  const { avgSevSub, avgSevBarColor } = useMemo(() => {
    const val = parseFloat(avgSev);
    if (isNaN(val) || val === 0) return { avgSevSub: 'No logged symptoms', avgSevBarColor: 'bg-[var(--app-success)]' };
    if (val < 3) return { avgSevSub: 'Mild intensity threshold', avgSevBarColor: 'bg-[var(--app-success)]' };
    if (val < 6) return { avgSevSub: 'Moderate severity pattern', avgSevBarColor: 'bg-[var(--app-warning)]' };
    return { avgSevSub: 'Elevated distress indicators', avgSevBarColor: 'bg-[var(--app-danger)]' };
  }, [avgSev]);

  // Mathematical Biomarkers Engine
  const entropyMetric = useMemo(() => {
    if (!safeSymptoms.length) return { value: '—', status: 'N/A', color: 'text-[var(--app-text-muted)] bg-[var(--app-surface-soft)] border-[var(--app-border)]', explanation: 'No symptoms logged' };
    const counts = {};
    safeSymptoms.forEach(s => {
      const name = String(s?.symptom ?? '').toLowerCase().trim();
      if (name) counts[name] = (counts[name] ?? 0) + 1;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (total === 0) return { value: '—', status: 'N/A', color: 'text-[var(--app-text-muted)] bg-[var(--app-surface-soft)] border-[var(--app-border)]', explanation: 'No symptoms logged' };
    let entropy = 0;
    Object.values(counts).forEach(count => {
      const p = count / total;
      entropy -= p * Math.log2(p);
    });
    const consistencyScore = Math.max(0, Math.min(100, Math.round((1 - entropy / 2.0) * 100)));
    let status = 'Consistent';
    let color = 'text-[var(--badge-success-text)] bg-[var(--badge-success-bg)] border-[var(--app-success-border)]';
    if (consistencyScore < 50) {
      status = 'Highly Variable';
      color = 'text-[var(--badge-danger-text)] bg-[var(--badge-danger-bg)] border-[var(--app-danger-border)]';
    } else if (consistencyScore < 80) {
      status = 'Moderate Changes';
      color = 'text-[var(--badge-warning-text)] bg-[var(--badge-warning-bg)] border-[var(--app-warning-border)]';
    }
    return {
      value: `${consistencyScore}%`,
      status,
      color,
      explanation: consistencyScore >= 80
        ? 'Your symptom patterns follow a highly consistent, predictable routine.'
        : consistencyScore >= 50
          ? 'Your symptom patterns show moderate day-to-day changes.'
          : 'Your symptom occurrences are highly variable and scattered.'
    };
  }, [safeSymptoms]);

  const dispersionMetric = useMemo(() => {
    if (!safeSymptoms.length) return { value: '—', status: 'N/A', color: 'text-[var(--app-text-muted)] bg-[var(--app-surface-soft)] border-[var(--app-border)]', explanation: 'No symptoms logged' };
    const severities = safeSymptoms.map(s => Number(s?.severity ?? 0));
    const mean = severities.reduce((a, b) => a + b, 0) / severities.length;
    const variance = severities.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / severities.length;
    const stdDev = Math.sqrt(variance);
    const volatilityScore = Math.max(0, Math.min(100, Math.round((stdDev / 5.0) * 100)));
    let status = 'Low Volatility';
    let color = 'text-[var(--badge-success-text)] bg-[var(--badge-success-bg)] border-[var(--app-success-border)]';
    if (volatilityScore >= 40) {
      status = 'High Swings';
      color = 'text-[var(--badge-danger-text)] bg-[var(--badge-danger-bg)] border-[var(--app-danger-border)]';
    } else if (volatilityScore >= 20) {
      status = 'Moderate Swings';
      color = 'text-[var(--badge-warning-text)] bg-[var(--badge-warning-bg)] border-[var(--app-warning-border)]';
    }
    return {
      value: `${volatilityScore}%`,
      status,
      color,
      explanation: volatilityScore >= 40
        ? 'Large severity fluctuations; discomfort levels swing between extreme intensities.'
        : volatilityScore >= 20
          ? 'Moderate volatility in logged symptom severity levels.'
          : 'Highly consistent symptom severity; discomfort holds at a flat baseline.'
    };
  }, [safeSymptoms]);

  const driftMetric = useMemo(() => {
    if (safeSymptoms.length < 2) return { value: '—', status: 'Steady', color: 'text-[var(--app-text-muted)] bg-[var(--app-surface-soft)] border-[var(--app-border)]', explanation: 'Requires at least 2 logs to calculate progression trends.' };
    const sorted = [...safeSymptoms].sort((a, b) => new Date(a?.date ?? 0).getTime() - new Date(b?.date ?? 0).getTime());
    const x = sorted.map(s => new Date(s?.date ?? 0).getTime());
    const y = sorted.map(s => Number(s?.severity ?? 0));
    const n = sorted.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const meanX = sumX / n;
    const meanY = sumY / n;
    let num = 0;
    let denX = 0;
    let denY = 0;
    for (let i = 0; i < n; i++) {
      const diffX = x[i] - meanX;
      const diffY = y[i] - meanY;
      num += diffX * diffY;
      denX += diffX * diffX;
      denY += diffY * diffY;
    }
    if (denX === 0 || denY === 0) {
      return {
        value: '0%',
        status: 'Steady',
        color: 'text-[var(--app-text-muted)] bg-[var(--app-surface-soft)] border-[var(--app-border)]',
        explanation: 'Symptom severity or timestamps are stable; no linear changes.'
      };
    }
    const r = num / Math.sqrt(denX * denY);
    const strengthVal = Math.round(Math.abs(r) * 100);
    let status = 'Steady';
    let color = 'text-[var(--app-text-muted)] bg-[var(--app-surface-soft)] border-[var(--app-border)]';
    let explanation = 'Symptom logs show no significant linear progression trend.';
    if (r < -0.2) {
      status = 'Improving';
      color = 'text-[var(--badge-success-text)] bg-[var(--badge-success-bg)] border-[var(--app-success-border)]';
      explanation = 'Symptom severity is decreasing over time, showing a positive recovery trend.';
    } else if (r > 0.2) {
      status = 'Increasing';
      color = 'text-[var(--badge-danger-text)] bg-[var(--badge-danger-bg)] border-[var(--app-danger-border)]';
      explanation = 'Symptom severity shows a rising trend over time; closer monitoring advised.';
    }
    return { value: `${strengthVal}%`, status, color, explanation };
  }, [safeSymptoms]);

  // Medical Reports Integration
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [uploadingReport, setUploadingReport] = useState(false);
  const [selectedReportFile, setSelectedReportFile] = useState(null);
  const reportFileInputRef = useRef(null);
  const { addNotification: notify } = useNotification() || { addNotification: () => {} };

  const fetchReports = async () => {
    setReportsLoading(true);
    try {
      const res = await api.get('/api/medical-reports');
      const data = unwrapApiPayload(res) || [];
      setReports([...data].sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at)));
    } catch {
      setReports([]);
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleReportFileSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
    const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
    const MAX_SIZE = 10 * 1024 * 1024;
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_TYPES.includes(file.type) || !ALLOWED_EXTENSIONS.includes(ext)) {
      notify(t('reports.error.invalid_type', 'Only PDF, JPG, and PNG files are allowed'), 'error');
      return;
    }
    if (file.size > MAX_SIZE) {
      notify(t('reports.error.too_large', 'File size must be under 10 MB'), 'error');
      return;
    }
    setSelectedReportFile(file);
  };

  const handleReportUpload = async () => {
    if (!selectedReportFile) return;
    setUploadingReport(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedReportFile);
      await api.uploadFile('/api/medical-reports/upload', formData);
      notify(t('reports.upload_success', 'Medical report uploaded successfully'), 'success');
      setSelectedReportFile(null);
      await fetchReports();
    } catch (err) {
      notify(err.message || t('reports.upload_error', 'Failed to upload file'), 'error');
    } finally {
      setUploadingReport(false);
    }
  };

  const handleReportView = (report) => {
    window.open(`${API_BASE_URL}/api/medical-reports/${report.id}/download?inline=true`, '_blank', 'noopener,noreferrer');
  };

  const handleReportDownload = (report) => {
    const a = document.createElement('a');
    a.href = `${API_BASE_URL}/api/medical-reports/${report.id}/download`;
    a.download = report.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const chartData = useMemo(() => [...safeSymptoms]
    .sort((a, b) => new Date(a?.date ?? 0).getTime() - new Date(b?.date ?? 0).getTime())
    .map((symptom) => ({
      name: formatShortDate(symptom?.date ?? new Date(), i18n.language),
      severity: parseInt(symptom?.severity ?? 0, 10) || 0,
      symptom: symptom?.symptom ?? '',
      duration: Number(symptom?.duration ?? 0),
      rawDate: symptom?.date ?? 0,
    })), [safeSymptoms, i18n.language]);

  const filteredChartData = useMemo(() => chartData.filter((entry) =>
    matchesSearch(searchQuery, entry.symptom, entry.name, entry.severity, entry.duration)
  ), [chartData, searchQuery]);

  const filteredByTimeRangeChartData = useMemo(() => {
    const rawData = hasSearchQuery ? filteredChartData : chartData;
    if (timeRange === 'all') return rawData;
    const now = new Date();
    const cutoff = new Date();
    if (timeRange === '7d') {
      cutoff.setDate(now.getDate() - 7);
    } else if (timeRange === '30d') {
      cutoff.setDate(now.getDate() - 30);
    }
    return rawData.filter((d) => new Date(d.rawDate).getTime() >= cutoff.getTime());
  }, [chartData, filteredChartData, hasSearchQuery, timeRange]);

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



  const statCards = useMemo(() => [
    {
      key: 'wellness-index',
      label: t('dashboard.stats.wellness_index', 'Wellness Index'),
      value: `${wellnessIndex}%`,
      sub: wellnessStatusText,
      icon: (
        <div className="w-8 h-8 rounded-lg bg-[var(--app-accent-glow)] flex items-center justify-center border border-[var(--brand-accent)]/20">
          <svg className="w-4 h-4 text-[var(--brand-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
      ),
      path: '/analysis',
      keywords: ['wellness', 'health', 'index', 'score', 'status'],
      barColor: wellnessBarColor,
      percent: wellnessIndex
    },
    {
      key: 'avg-severity',
      label: t('dashboard.stats.avg_sev', 'Mean Severity'),
      value: `${avgSev} / 10`,
      sub: avgSevSub,
      icon: (
        <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
          <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
      ),
      path: '/timeline',
      keywords: ['severity', 'average', 'mean', 'symptoms'],
      barColor: avgSevBarColor,
      percent: parseFloat(avgSev) ? parseFloat(avgSev) * 10 : 0
    },
    {
      key: 'logging-streak',
      label: t('dashboard.stats.streak', 'Activity Streak'),
      value: t('dashboard.stats.streak_value', '{{count}} Days', { count: streak }),
      sub: todayLogged ? t('dashboard.stats.streak_logged', 'Today logged ✓') : t('dashboard.stats.streak_pending', 'Awaiting log today'),
      icon: (
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
          <svg className="w-4 h-4 text-amber-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      ),
      path: '/symptoms',
      keywords: ['streak', 'activity', 'days', 'logging', 'history'],
      barColor: 'bg-amber-500',
      percent: Math.min(100, (streak / 7) * 100)
    },
    {
      key: 'profile-completion',
      label: t('dashboard.stats.profile_completion', 'Profile Context'),
      value: `${profileCompletionScore}%`,
      sub: profileCompletionScore === 100 ? t('dashboard.stats.profile_completed', 'Full clinical precision') : t('dashboard.stats.profile_incomplete', 'Complete to optimize AI'),
      icon: (
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      ),
      path: '/profile',
      keywords: ['profile', 'completion', 'context', 'setup'],
      barColor: 'bg-blue-500',
      percent: profileCompletionScore
    }
  ], [t, wellnessIndex, wellnessStatusText, wellnessBarColor, avgSev, avgSevSub, avgSevBarColor, streak, todayLogged, profileCompletionScore]);

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

  const dateStr = new Date().toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Greeting Welcome Hero card markup
  const welcomeHeroCard = (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 14 }}
      className="p-6 rounded-[var(--radius-xl)] bg-[var(--app-surface)] border border-[var(--app-border-soft)] shadow-sm relative overflow-hidden"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--brand-accent)] bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/20 rounded">
              HEALTH PROFILE
            </span>
            {streak > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--badge-warning-text)] bg-[var(--badge-warning-bg)] border border-[var(--app-warning-border)] px-2.5 py-0.5 rounded-full">
                <svg className="w-3.5 h-3.5 fill-current animate-pulse" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                {streak}-day active streak
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--app-text-heading)] leading-tight">
            {getGreeting()}, {userProfile?.name || user?.email?.split('@')[0] || t('dashboard.greeting_default')}
          </h1>
          <p className="text-sm text-[var(--app-text-muted)] mt-1 font-medium">
            {dateStr} · Real-time AI diagnostic context active.
          </p>
        </div>

        <div className="bg-[var(--app-surface-soft)] border border-[var(--app-border)] p-4 rounded-2xl flex items-center justify-between gap-6 w-full md:w-auto shrink-0">
          <div>
            <p className="text-xs font-bold text-[var(--app-text)] uppercase tracking-wider">DAILY CHECK-IN</p>
            <p className="text-[10px] text-[var(--app-text-muted)] mt-0.5">How are you feeling today?</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/symptoms')}
            className="px-3.5 py-1.5 text-xs font-bold text-[var(--brand-accent-on)] bg-[var(--brand-accent)] hover:bg-[var(--app-accent-hover)] rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-[var(--brand-accent)]/20"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            Log Symptoms
          </motion.button>
        </div>
      </div>
    </motion.div>
  );

  // Biomarkers card markup
  const biomarkerPanelJSX = (
    <WidgetErrorBoundary title="Symptom Patterns & Trends">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.3 }}
        className="mt-6"
      >
        <Card elevation={1} className="relative overflow-hidden border border-[var(--app-border-soft)] hover:border-[var(--brand-accent)]/20 transition-all duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-4 border-b border-[var(--app-border-soft)]">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider text-[var(--brand-accent)] bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/20 rounded">ANALYTICS</span>
                <span className="text-[10px] text-[var(--app-text-muted)] opacity-75 font-mono">HEALTH PATTERN DETECTION</span>
              </div>
              <h2 className="text-lg font-bold text-[var(--app-text-heading)] mt-1 flex items-center gap-1.5">
                Symptom Patterns & Trends
                <button
                  onClick={() => setShowXaiHelp(prev => !prev)}
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold text-[var(--app-text-muted)] hover:text-[var(--brand-accent)] bg-[var(--app-surface-soft)] hover:bg-[var(--app-accent-glow)] border border-[var(--app-border)] hover:border-[var(--brand-accent)]/30 transition-all cursor-pointer focus:outline-none"
                  title="How this analysis works (Explainable AI)"
                  aria-label="Toggle Explainable AI help panel"
                >
                  ?
                </button>
              </h2>
            </div>
            <p className="text-xs text-[var(--app-text-muted)] max-w-sm mt-1 md:mt-0 leading-snug">
              Real-time statistical evaluation of symptom occurrences, severity shifts, and general recovery direction.
            </p>
          </div>

          <AnimatePresence>
            {showXaiHelp && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                animate={{ height: 'auto', opacity: 1, marginBottom: 24 }}
                exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-[var(--app-accent-glow)] rounded-[var(--radius-lg)] border border-[var(--brand-accent)]/20 text-sm text-[var(--app-text)]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-full bg-[var(--brand-accent)]/15 flex items-center justify-center border border-[var(--brand-accent)]/30 shrink-0">
                      <svg className="w-3.5 h-3.5 text-[var(--brand-accent)] font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-[var(--app-text-heading)] tracking-tight">How we analyze your symptom patterns</h3>
                  </div>
                  <p className="text-xs text-[var(--app-text-muted)] mb-4 leading-relaxed">
                    CareTrace AI runs real-time mathematical calculations on your logged symptoms to make sense of trends. Here is what each metric represents, in simple terms:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-[var(--app-surface)] rounded-xl border border-[var(--app-border-soft)]">
                      <span className="text-xs font-bold text-[var(--brand-accent)] block mb-1">Consistency (Routine)</span>
                      <p className="text-[11px] text-[var(--app-text-muted)] leading-relaxed">
                        Measures if your symptoms follow a predictable daily schedule. High consistency indicates regular timing, while low consistency indicates scattered/irregular occurrences.
                      </p>
                    </div>
                    <div className="p-3 bg-[var(--app-surface)] rounded-xl border border-[var(--app-border-soft)]">
                      <span className="text-xs font-bold text-[var(--brand-accent)] block mb-1">Volatility (Swings)</span>
                      <p className="text-[11px] text-[var(--app-text-muted)] leading-relaxed">
                        Measures sudden shifts or swings in how intense your symptoms feel. Low volatility means steady discomfort levels; high volatility indicates sharp spikes and drops.
                      </p>
                    </div>
                    <div className="p-3 bg-[var(--app-surface)] rounded-xl border border-[var(--app-border-soft)]">
                      <span className="text-xs font-bold text-[var(--brand-accent)] block mb-1">Progression Trend</span>
                      <p className="text-[11px] text-[var(--app-text-muted)] leading-relaxed">
                        Tracks the long-term direction of symptom severity. It identifies whether your condition is steadily improving (recovering), remaining steady, or escalating over time.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pattern Consistency */}
            <div className="p-4 bg-[var(--app-surface-soft)] rounded-[var(--radius-lg)] border border-[var(--app-border-soft)] flex flex-col justify-between hover:shadow-sm transition-all duration-200 group">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[var(--app-text-muted)] uppercase tracking-wider">Pattern Consistency</span>
                  <Badge className={`text-[10px] px-2 py-0.5 border ${entropyMetric.color}`}>{entropyMetric.status}</Badge>
                </div>
                <div className="flex items-baseline gap-1.5 my-2">
                  <span className="text-3xl font-extrabold text-[var(--app-text)] tracking-tight font-mono">{entropyMetric.value}</span>
                  <span className="text-xs text-[var(--app-text-muted)] opacity-75">score</span>
                </div>
                <p className="text-xs text-[var(--app-text-muted)] leading-relaxed mt-2">{entropyMetric.explanation}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--app-border-soft)] flex justify-between items-center text-[9px] text-[var(--app-text-muted)] opacity-75 font-mono">
                <span>METRIC: ROUTINE SCORE</span>
                <span>CONSISTENCY</span>
              </div>
            </div>

            {/* Severity Volatility */}
            <div className="p-4 bg-[var(--app-surface-soft)] rounded-[var(--radius-lg)] border border-[var(--app-border-soft)] flex flex-col justify-between hover:shadow-sm transition-all duration-200 group">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[var(--app-text-muted)] uppercase tracking-wider">Severity Volatility</span>
                  <Badge className={`text-[10px] px-2 py-0.5 border ${dispersionMetric.color}`}>{dispersionMetric.status}</Badge>
                </div>
                <div className="flex items-baseline gap-1.5 my-2">
                  <span className="text-3xl font-extrabold text-[var(--app-text)] tracking-tight font-mono">{dispersionMetric.value}</span>
                  <span className="text-xs text-[var(--app-text-muted)] opacity-75">rate</span>
                </div>
                <p className="text-xs text-[var(--app-text-muted)] leading-relaxed mt-2">{dispersionMetric.explanation}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--app-border-soft)] flex justify-between items-center text-[9px] text-[var(--app-text-muted)] opacity-75 font-mono">
                <span>METRIC: FLUCTUATION RATE</span>
                <span>VOLATILITY</span>
              </div>
            </div>

            {/* Progression Trend */}
            <div className="p-4 bg-[var(--app-surface-soft)] rounded-[var(--radius-lg)] border border-[var(--app-border-soft)] flex flex-col justify-between hover:shadow-sm transition-all duration-200 group">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[var(--app-text-muted)] uppercase tracking-wider">Progression Trend</span>
                  <Badge className={`text-[10px] px-2 py-0.5 border ${driftMetric.color}`}>{driftMetric.status}</Badge>
                </div>
                <div className="flex items-baseline gap-1.5 my-2">
                  <span className="text-3xl font-extrabold text-[var(--app-text)] tracking-tight font-mono">{driftMetric.value}</span>
                  <span className="text-xs text-[var(--app-text-muted)] opacity-75">trend strength</span>
                </div>
                <p className="text-xs text-[var(--app-text-muted)] leading-relaxed mt-2">{driftMetric.explanation}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--app-border-soft)] flex justify-between items-center text-[9px] text-[var(--app-text-muted)] opacity-75 font-mono">
                <span>METRIC: PROGRESSION VECTOR</span>
                <span>TREND VECTOR</span>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </WidgetErrorBoundary>
  );



  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <PageFrame
      title=""
      subtitle=""
      actions={null}
      maxWidthClass="max-w-5xl"
    >
      {welcomeHeroCard}

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
              <h2 className="text-base font-medium text-[var(--app-text-heading)]">{t('dashboard.demo_meds.title')}</h2>
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
                  {med.notes && <p className="text-xs text-[var(--app-text-muted)] sm:text-right max-w-md">{med.notes}</p>}
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
              className="text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors min-h-[32px] flex items-center px-2 animate-none"
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
              <svg className="w-5 h-5 text-[var(--app-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="text-base font-medium text-[var(--app-text-heading)] mb-1">{t('dashboard.search.no_matches')}</h2>
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
                    whileHover={{ y: -6, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    onClick={() => navigate(card.path)}
                    className="text-left w-full h-full block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] rounded-[var(--radius-xl)] cursor-pointer"
                    aria-label={`${card.label}: ${card.value} ${card.sub}`}
                  >
                    <Card elevation={1} className="h-full flex flex-col justify-between hover:shadow-[var(--shadow-l2)] transition-shadow border border-[var(--app-border-soft)] hover:border-[var(--brand-accent)]/20">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <span className="text-xs uppercase tracking-wider text-[var(--app-text-muted)] font-bold">{card.label}</span>
                          <div aria-hidden="true">{card.icon}</div>
                        </div>
                        <div>
                          <span className="text-3xl tracking-tight text-[var(--app-text)] font-black tabular-nums">{card.value}</span>
                          {card.sub && <p className="text-xs font-semibold text-[var(--app-text-muted)] mt-1">{card.sub}</p>}
                        </div>
                      </div>

                      {/* Custom Visual Trackers */}
                      <div className="mt-5 pt-3 border-t border-[var(--app-border-soft)]">
                        {card.key === 'wellness-index' && (
                          <div className="flex flex-col gap-1.5">
                            <div className="w-full h-1.5 bg-[var(--app-surface-soft)] rounded-full overflow-hidden border border-[var(--app-border-soft)]">
                              <div
                                className={`h-full ${card.barColor} transition-all duration-500 ease-out`}
                                style={{ width: `${card.percent}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[9px] text-[var(--app-text-muted)] opacity-75 font-mono">
                              <span>ALIGNMENT</span>
                              <span>{card.value}</span>
                            </div>
                          </div>
                        )}

                        {card.key === 'avg-severity' && (
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1">
                              {[...Array(10)].map((_, idx) => {
                                const dotValue = idx + 1;
                                const valNum = parseFloat(avgSev);
                                let colorClass = 'bg-[var(--app-surface-soft)] border border-[var(--app-border)]';
                                if (!isNaN(valNum) && dotValue <= Math.round(valNum)) {
                                  colorClass = valNum < 3 ? 'bg-[var(--badge-success-text)]'
                                               : valNum < 6 ? 'bg-[var(--badge-warning-text)]'
                                               : 'bg-[var(--badge-danger-text)]';
                                }
                                return (
                                  <div
                                    key={idx}
                                    className={`w-2.5 h-2.5 rounded-full ${colorClass} transition-colors duration-300`}
                                    title={`Severity ${dotValue}`}
                                  />
                                );
                              })}
                            </div>
                            <div className="flex justify-between items-center text-[9px] text-[var(--app-text-muted)] opacity-75 font-mono">
                              <span>SCALE (1-10)</span>
                              <span>{avgSev}</span>
                            </div>
                          </div>
                        )}

                        {card.key === 'logging-streak' && (
                          <div className="flex gap-1.5 justify-between">
                            {last7DaysStreakLog.map((day, idx) => (
                              <div key={idx} className="flex flex-col items-center gap-0.5">
                                <span className={`text-[8px] font-bold ${day.isToday ? 'text-[var(--brand-accent)]' : 'text-[var(--app-text-muted)] opacity-85'}`}>
                                  {day.label}
                                </span>
                                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${
                                  day.hasLog
                                    ? 'bg-[var(--brand-accent)] text-[var(--brand-accent-on)]'
                                    : 'bg-[var(--app-surface-soft)] border border-[var(--app-border)] text-[var(--app-text-muted)] opacity-75'
                                }`}>
                                  {day.hasLog ? '✓' : ''}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {card.key === 'profile-completion' && (
                          <div className="flex flex-col gap-1.5">
                            <div className="w-full h-1.5 bg-[var(--app-surface-soft)] rounded-full overflow-hidden border border-[var(--app-border-soft)]">
                              <div
                                className="h-full bg-blue-500 transition-all duration-500 ease-out"
                                style={{ width: `${profileCompletionScore}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[9px] text-[var(--app-text-muted)] opacity-75 font-mono">
                              <span>COMPLETE</span>
                              <span>{profileCompletionScore}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  </motion.button>
                ))}
              </div>
            </WidgetErrorBoundary>
          )}

          {biomarkerPanelJSX}

          {(showRiskCard || showTrendChart) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch gap-6">
              {showRiskCard && (
                <WidgetErrorBoundary title={t('dashboard.risk.title')}>
                  <motion.div
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.2 }}
                    className="h-full"
                  >
                    <Card elevation={1} className="h-full flex flex-col justify-between border border-[var(--app-border-soft)]">
                      <div>
                        <h2 className="text-lg font-bold text-[var(--app-text-heading)] mb-1">
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
                          <>
                            <p className="max-w-prose text-sm leading-relaxed text-[var(--app-text-muted)] mb-6">
                              {analysisResult.reason}
                            </p>
                            <div className="mt-4 p-3 bg-[var(--app-surface-soft)] rounded-xl border border-[var(--app-border-soft)]">
                              <div className="flex items-center gap-1.5 mb-2.5">
                                <svg className="w-3.5 h-3.5 text-[var(--brand-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--app-text)] font-mono">
                                  AI Inputs & Telemetry Analyzed
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-[var(--app-surface)] p-2 rounded-lg border border-[var(--app-border-soft)]">
                                  <span className="block text-xs font-bold text-[var(--app-text)] font-mono">{safeSymptoms.length}</span>
                                  <span className="text-[9px] text-[var(--app-text-muted)] block mt-0.5 leading-tight">Logs Analyzed</span>
                                </div>
                                <div className="bg-[var(--app-surface)] p-2 rounded-lg border border-[var(--app-border-soft)]">
                                  <span className="block text-xs font-bold text-[var(--app-text)] font-mono">{safeAlerts.length}</span>
                                  <span className="text-[9px] text-[var(--app-text-muted)] block mt-0.5 leading-tight">Active Alerts</span>
                                </div>
                                <div className="bg-[var(--app-surface)] p-2 rounded-lg border border-[var(--app-border-soft)]">
                                  <span className="block text-xs font-bold text-[var(--app-text)] font-mono">{profileCompletionScore}%</span>
                                  <span className="text-[9px] text-[var(--app-text-muted)] block mt-0.5 leading-tight">Profile Context</span>
                                </div>
                              </div>
                              <p className="text-[9px] text-[var(--app-text-muted)] opacity-75 mt-2 font-medium leading-normal">
                                Diagnostic confidence increases as you complete more logs and clinical profile parameters.
                              </p>
                            </div>
                          </>
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
                    <Card elevation={1} className="h-full flex flex-col border border-[var(--app-border-soft)]" role="img" aria-label={t('dashboard.charts.severity_timeline')}>
                      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider">{t('dashboard.charts.trend')}</p>
                          <h2 className="text-base font-medium text-[var(--app-text-heading)] mt-1">{t('dashboard.charts.severity_timeline')}</h2>
                        </div>
                        <div className="flex items-center gap-1 bg-[var(--app-surface-soft)] p-0.5 rounded-lg border border-[var(--app-border)] shrink-0 self-start sm:self-center">
                          {['7d', '30d', 'all'].map((range) => (
                            <button
                              key={range}
                              onClick={() => setTimeRange(range)}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-md uppercase transition-all cursor-pointer ${
                                timeRange === range
                                  ? 'bg-[var(--app-surface)] text-[var(--brand-accent)] shadow-sm border border-[var(--app-border-soft)]'
                                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                              }`}
                            >
                              {range === 'all' ? 'All' : range.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {filteredByTimeRangeChartData.length > 0 ? (
                        <div className="flex-1 flex flex-col">
                          <div className="min-h-[288px] w-full flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart
                                data={filteredByTimeRangeChartData}
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {showDistributionCard && (
                <WidgetErrorBoundary title={t('dashboard.charts.symptom_frequency')}>
                  <motion.div
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.3 }}
                    className="h-full"
                  >
                    <Card elevation={1} className="h-full flex flex-col justify-between border border-[var(--app-border-soft)]" role="img" aria-label={t('dashboard.charts.symptom_frequency')}>
                      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider">{t('dashboard.charts.distribution')}</p>
                          <h2 className="text-base font-medium text-[var(--app-text-heading)] mt-1">{t('dashboard.charts.symptom_frequency')}</h2>
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
                    <Card elevation={1} className="h-full flex flex-col justify-between border border-[var(--app-border-soft)]">
                      <div>
                        <div className="mb-6">
                          <p className="text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider">{t('dashboard.insights.title')}</p>
                          <h2 className="text-base font-medium text-[var(--app-text-heading)] mt-1">{t('dashboard.insights.personalized_insights')}</h2>
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

              {/* Medical Reports & Documents Integration Panel */}
              <WidgetErrorBoundary title="Clinical Reports">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.4 }}
                  className="h-full"
                >
                  <Card elevation={1} className="h-full flex flex-col justify-between border border-[var(--app-border-soft)]">
                    <div>
                      <div className="mb-6 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider">Clinical Documents</p>
                          <h2 className="text-base font-medium text-[var(--app-text-heading)] mt-1">Medical Reports ({reports.length})</h2>
                        </div>
                        <Badge variant={reports.length > 0 ? 'accent' : 'pending'}>
                          {reports.length > 0 ? 'Synchronized' : 'Empty'}
                        </Badge>
                      </div>

                      <div className="mb-4">
                        <input
                          ref={reportFileInputRef}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="sr-only"
                          onChange={handleReportFileSelect}
                          aria-label="Upload Report from Dashboard"
                        />
                        {!selectedReportFile ? (
                          <button
                            type="button"
                            onClick={() => reportFileInputRef.current?.click()}
                            disabled={uploadingReport}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-dashed border-[var(--app-border)] hover:border-[var(--brand-accent)] rounded-[var(--radius-md)] text-xs text-[var(--app-text-muted)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--app-text)] transition-all cursor-pointer focus:outline-none disabled:opacity-50"
                          >
                            <svg className="w-4 h-4 text-[var(--app-text-disabled)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Upload a medical report</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 p-2 border border-[var(--app-border)] rounded-[var(--radius-md)] bg-[var(--app-surface-soft)]">
                            <span className="text-xs text-[var(--app-text)] truncate flex-1 font-medium">{selectedReportFile.name}</span>
                            <div className="flex gap-1">
                              <Button intent="primary" size="sm" onClick={handleReportUpload} loading={uploadingReport} className="!py-1 !px-2.5 !text-[10px]">
                                {uploadingReport ? '...' : 'Upload'}
                              </Button>
                              <Button intent="ghost" size="sm" onClick={() => setSelectedReportFile(null)} disabled={uploadingReport} className="!py-1 !px-2.5 !text-[10px]">
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {reportsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-5 h-5 border-2 border-[var(--app-border)] border-t-[var(--brand-accent)] rounded-full animate-spin" />
                        </div>
                      ) : reports.length === 0 ? (
                        <div className="py-8 text-center bg-[var(--app-surface-soft)] rounded-[var(--radius-lg)] border border-dashed border-[var(--app-border)]">
                          <p className="text-xs font-medium text-[var(--app-text-muted)]">No documents uploaded yet.</p>
                          <p className="text-[10px] text-[var(--app-text-muted)] opacity-80 mt-0.5">Upload a report to synchronize with AI diagnostic context.</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {reports.slice(0, 3).map((report) => (
                            <div key={report.id} className="flex items-center justify-between p-2.5 border border-[var(--app-border-soft)] rounded-xl bg-[var(--app-surface-soft)] hover:bg-[var(--app-surface)] transition-all group">
                              <div className="min-w-0 flex-1 pr-2">
                                <p className="text-xs font-semibold text-[var(--app-text)] truncate">{report.file_name}</p>
                                <p className="text-[9px] text-[var(--app-text-muted)] opacity-75 font-mono uppercase mt-0.5">
                                  {new Date(report.uploaded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button
                                  onClick={() => handleReportView(report)}
                                  className="p-1 text-[var(--app-text-muted)] hover:text-[var(--brand-accent)] hover:bg-[var(--app-surface)] rounded-md transition-colors cursor-pointer"
                                  title="View"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                </button>
                                <button
                                  onClick={() => handleReportDownload(report)}
                                  className="p-1 text-[var(--app-text-muted)] hover:text-[var(--brand-accent)] hover:bg-[var(--app-surface)] rounded-md transition-colors cursor-pointer"
                                  title="Download"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-[var(--app-border-soft)]">
                      <Button intent="ghost" size="sm" onClick={() => navigate('/reports')} className="w-full">
                        Manage All Documents
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              </WidgetErrorBoundary>
            </div>
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