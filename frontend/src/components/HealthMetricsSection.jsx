import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api, unwrapApiPayload } from '../services/api';
import Card from './Card';
import Button from './Button';
import Input from './Input';
import Badge from './Badge';
import { useNotification } from '../NotificationContext';

const FIELDS = [
  { key: 'systolic_bp',       label: 'Systolic BP',       unit: 'mmHg',  min: 50,  max: 300, isFloat: false },
  { key: 'diastolic_bp',      label: 'Diastolic BP',      unit: 'mmHg',  min: 30,  max: 200, isFloat: false },
  { key: 'blood_sugar_mg_dl', label: 'Blood Sugar',       unit: 'mg/dL', min: 0,   max: null, isFloat: true  },
  { key: 'heart_rate_bpm',    label: 'Heart Rate',        unit: 'bpm',   min: 20,  max: 300, isFloat: false },
  { key: 'oxygen_saturation', label: 'Oxygen Saturation', unit: '%',     min: 50,  max: 100, isFloat: false },
];

const INITIAL_FORM = {
  systolic_bp: '', diastolic_bp: '', blood_sugar_mg_dl: '',
  heart_rate_bpm: '', oxygen_saturation: '',
};

function validateField(fieldDef, rawValue) {
  if (rawValue === '' || rawValue == null) return null;
  const num = fieldDef.isFloat ? parseFloat(rawValue) : parseInt(rawValue, 10);
  if (isNaN(num)) return 'Must be a valid number';
  if (fieldDef.min !== null && num < fieldDef.min) return `Must be at least ${fieldDef.min}`;
  if (fieldDef.max !== null && num > fieldDef.max) return `Must be at most ${fieldDef.max}`;
  return null;
}

// Clinical Guidelines Classification Helpers
function getBPStatus(sys, dia) {
  if (sys == null && dia == null) return null;
  const s = parseInt(sys, 10);
  const d = parseInt(dia, 10);
  if (isNaN(s) && isNaN(d)) return null;

  if (isNaN(s)) {
    if (d < 80) return { label: 'Normal (Diastolic)', variant: 'success' };
    if (d < 90) return { label: 'Stage 1 Hypertension', variant: 'warning' };
    return { label: 'Stage 2 Hypertension', variant: 'danger' };
  }
  if (isNaN(d)) {
    if (s < 120) return { label: 'Normal (Systolic)', variant: 'success' };
    if (s < 130) return { label: 'Elevated (Systolic)', variant: 'warning' };
    if (s < 140) return { label: 'Stage 1 Hypertension', variant: 'warning' };
    return { label: 'Stage 2 Hypertension', variant: 'danger' };
  }

  if (s >= 140 || d >= 90) {
    return { label: 'Stage 2 Hypertension', variant: 'danger' };
  }
  if ((s >= 130 && s <= 139) || (d >= 80 && d <= 89)) {
    return { label: 'Stage 1 Hypertension', variant: 'warning' };
  }
  if (s >= 120 && s <= 129 && d < 80) {
    return { label: 'Elevated', variant: 'warning' };
  }
  return { label: 'Normal', variant: 'success' };
}

function getSpo2Status(val) {
  if (val == null) return null;
  const v = parseInt(val, 10);
  if (isNaN(v)) return null;
  if (v >= 95) {
    return { label: 'Normal', variant: 'success' };
  }
  if (v >= 90) {
    return { label: 'Low SpO₂', variant: 'warning' };
  }
  return { label: 'Hypoxemia', variant: 'danger' };
}

// Keep tachycardia/bradycardia labels, map to success/info/danger intents
function getHeartRateStatus(val) {
  if (val == null) return null;
  const v = parseInt(val, 10);
  if (isNaN(v)) return null;
  if (v >= 60 && v <= 100) {
    return { label: 'Normal', variant: 'success' };
  }
  if (v < 60) {
    return { label: 'Bradycardia', variant: 'info' };
  }
  return { label: 'Tachycardia', variant: 'danger' };
}

function getBloodSugarStatus(val) {
  if (val == null) return null;
  const v = parseFloat(val);
  if (isNaN(v)) return null;
  if (v < 100) {
    return { label: 'Normal (Fasting)', variant: 'success' };
  }
  if (v <= 125) {
    return { label: 'Prediabetes', variant: 'warning' };
  }
  return { label: 'Diabetic Range', variant: 'danger' };
}

export default function HealthMetricsSection() {
  const { t } = useTranslation();
  const [latest, setLatest]   = useState(null);
  const [loading, setLoading] = useState(true);
  const { addNotification: notify } = useNotification();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState(INITIAL_FORM);
  const [errors, setErrors]   = useState({});
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/health-metrics');
        const records = unwrapApiPayload(res) || [];
        setLatest(records.length > 0 ? records[0] : null);
      } catch { setLatest(null); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async () => {
    const newErrors = {};
    let hasAnyFilled = false;
    let hasAnyError  = false;

    for (const f of FIELDS) {
      if (form[f.key] !== '') {
        hasAnyFilled = true;
        const err = validateField(f, form[f.key]);
        if (err) { newErrors[f.key] = err; hasAnyError = true; }
      }
    }

    if (hasAnyError) { setErrors(newErrors); return; }
    if (!hasAnyFilled) { notify(t('health_metrics.error_empty', 'Please enter at least one metric value'), 'error'); return; }

    setSaving(true);
    try {
      const payload = {};
      for (const f of FIELDS) {
        if (form[f.key] !== '') {
          payload[f.key] = f.isFloat ? parseFloat(form[f.key]) : parseInt(form[f.key], 10);
        }
      }
      await api.post('/api/health-metrics', payload);
      const res = await api.get('/api/health-metrics');
      const records = unwrapApiPayload(res) || [];
      setLatest(records.length > 0 ? records[0] : null);
      setShowForm(false);
      setForm(INITIAL_FORM);
      setErrors({});
      notify(t('health_metrics.success', 'Vitals recorded'), 'success');
    } catch (e) {
      notify(e.message || t('health_metrics.error_save', 'Failed to save vitals'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => { setShowForm(false); setForm(INITIAL_FORM); setErrors({}); };

  if (loading) {
    return (
      <Card elevation={1}>
        <div className="flex items-center justify-center py-10" role="status" aria-label={t('health_metrics.loading', 'Loading vitals')}>
          <div className="w-8 h-8 border-[3px] border-[var(--app-border)] border-t-[var(--brand-accent)] rounded-full animate-spin" />
        </div>
      </Card>
    );
  }

  const hasData = latest && FIELDS.some(f => latest[f.key] != null);

  // Group vitals logically for layout
  const bpSys = latest?.systolic_bp;
  const bpDia = latest?.diastolic_bp;
  const hasBP = bpSys != null || bpDia != null;
  const bpStatus = getBPStatus(bpSys, bpDia);

  const hrVal = latest?.heart_rate_bpm;
  const hasHR = hrVal != null;
  const hrStatus = getHeartRateStatus(hrVal);

  const spo2Val = latest?.oxygen_saturation;
  const hasSpo2 = spo2Val != null;
  const spo2Status = getSpo2Status(spo2Val);

  const bsVal = latest?.blood_sugar_mg_dl;
  const hasBS = bsVal != null;
  const bsStatus = getBloodSugarStatus(bsVal);

  return (
    <Card elevation={1} className="border border-zinc-200/80 dark:border-zinc-800/80 shadow-md">
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--app-surface-soft)] text-[var(--app-text-muted)] border border-[var(--app-border-soft)] transition-colors duration-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h2 className="text-base font-bold text-[var(--app-text)] tracking-[-0.01em]">
            {t('health_metrics.title', 'Clinical Vitals')}
          </h2>
        </div>
        {!showForm && (
          <Button intent="ghost" size="sm" onClick={() => setShowForm(true)} className="gap-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-text)]">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('health_metrics.add_entry', 'Log Vitals')}
          </Button>
        )}
      </div>

      {!showForm ? (
        hasData ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. BLOOD PRESSURE CARD */}
            <div className="flex flex-col justify-between p-4 rounded-2xl bg-[var(--app-surface-soft)] border border-[var(--app-border-soft)] shadow-sm min-h-[110px]">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-[var(--app-text-disabled)]">
                    Blood Pressure
                  </span>
                  <svg className="w-4 h-4 text-[var(--app-text-muted)]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h3.5l1.5-4 2 10 2-14 2 10 1.5-4H21" />
                  </svg>
                </div>
                {hasBP ? (
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-[var(--app-text)] tracking-tight tabular-nums">
                      {bpSys ?? '—'}/{bpDia ?? '—'}
                    </span>
                    <span className="text-[10px] font-bold text-[var(--app-text-muted)]">mmHg</span>
                  </div>
                ) : (
                  <span className="text-sm text-[var(--app-text-disabled)] italic">—</span>
                )}
              </div>
              {hasBP && bpStatus && (
                <div className="mt-3 flex">
                  <Badge variant={bpStatus.variant} className="text-[9px] font-extrabold uppercase">
                    {bpStatus.label}
                  </Badge>
                </div>
              )}
            </div>

            {/* 2. BLOOD SUGAR CARD */}
            <div className="flex flex-col justify-between p-4 rounded-2xl bg-[var(--app-surface-soft)] border border-[var(--app-border-soft)] shadow-sm min-h-[110px]">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-[var(--app-text-disabled)]">
                    Blood Sugar
                  </span>
                  <svg className="w-4 h-4 text-[var(--app-text-muted)]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                  </svg>
                </div>
                {hasBS ? (
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-[var(--app-text)] tracking-tight tabular-nums">{bsVal}</span>
                    <span className="text-[10px] font-bold text-[var(--app-text-muted)]">mg/dL</span>
                  </div>
                ) : (
                  <span className="text-sm text-[var(--app-text-disabled)] italic">—</span>
                )}
              </div>
              {hasBS && bsStatus && (
                <div className="mt-3 flex">
                  <Badge variant={bsStatus.variant} className="text-[9px] font-extrabold uppercase">
                    {bsStatus.label}
                  </Badge>
                </div>
              )}
            </div>

            {/* 3. HEART RATE CARD */}
            <div className="flex flex-col justify-between p-4 rounded-2xl bg-[var(--app-surface-soft)] border border-[var(--app-border-soft)] shadow-sm min-h-[110px]">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-[var(--app-text-disabled)]">
                    Heart Rate
                  </span>
                  <svg className="w-4 h-4 text-[var(--app-text-muted)]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </div>
                {hasHR ? (
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-[var(--app-text)] tracking-tight tabular-nums">{hrVal}</span>
                    <span className="text-[10px] font-bold text-[var(--app-text-muted)]">bpm</span>
                  </div>
                ) : (
                  <span className="text-sm text-[var(--app-text-disabled)] italic">—</span>
                )}
              </div>
              {hasHR && hrStatus && (
                <div className="mt-3 flex">
                  <Badge variant={hrStatus.variant} className="text-[9px] font-extrabold uppercase">
                    {hrStatus.label}
                  </Badge>
                </div>
              )}
            </div>

            {/* 4. OXYGEN SATURATION CARD */}
            <div className="flex flex-col justify-between p-4 rounded-2xl bg-[var(--app-surface-soft)] border border-[var(--app-border-soft)] shadow-sm min-h-[110px]">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-[var(--app-text-disabled)]">
                    Oxygen Saturation
                  </span>
                  <svg className="w-4 h-4 text-[var(--app-text-muted)]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
                  </svg>
                </div>
                {hasSpo2 ? (
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-[var(--app-text)] tracking-tight tabular-nums">{spo2Val}</span>
                    <span className="text-[10px] font-bold text-[var(--app-text-muted)]">%</span>
                  </div>
                ) : (
                  <span className="text-sm text-[var(--app-text-disabled)] italic">—</span>
                )}
              </div>
              {hasSpo2 && spo2Status && (
                <div className="mt-3 flex">
                  <Badge variant={spo2Status.variant} className="text-[9px] font-extrabold uppercase">
                    {spo2Status.label}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--app-surface-soft)] flex items-center justify-center text-[var(--app-text-disabled)]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <p className="text-sm text-[var(--app-text-disabled)] text-center max-w-xs">No clinical vitals logged. Track your vitals to monitor your cardiovascular health trends.</p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[var(--app-text-muted)] border border-dashed border-[var(--app-border)] rounded-xl hover:border-[var(--brand-accent)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-soft)] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Log your first vitals
            </button>
          </div>
        )
      ) : (
        <div className="space-y-6 animate-[fadeIn_0.15s_ease-out]">
          <p className="text-xs text-[var(--app-text-disabled)] -mt-2 mb-1">{t('health_metrics.form_subtitle', 'Enter your current vital signs')}</p>
          
          <div className="space-y-4">
            {/* Blood Pressure Input Group */}
            <div className="p-4 rounded-2xl bg-[var(--app-surface-soft)] border border-[var(--app-border-soft)]">
              <span className="block text-[10px] font-bold text-[var(--app-text-disabled)] uppercase tracking-wider mb-3">Blood Pressure Section</span>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="metric-systolic_bp"
                  label="Systolic BP (mmHg)"
                  type="number"
                  name="systolic_bp"
                  value={form.systolic_bp}
                  onChange={handleChange}
                  disabled={saving}
                  step="1"
                  inputClassName="tabular-nums"
                  error={errors.systolic_bp}
                  aria-invalid={!!errors.systolic_bp}
                  aria-describedby={errors.systolic_bp ? "err-metric-systolic_bp" : undefined}
                />
                <Input
                  id="metric-diastolic_bp"
                  label="Diastolic BP (mmHg)"
                  type="number"
                  name="diastolic_bp"
                  value={form.diastolic_bp}
                  onChange={handleChange}
                  disabled={saving}
                  step="1"
                  inputClassName="tabular-nums"
                  error={errors.diastolic_bp}
                  aria-invalid={!!errors.diastolic_bp}
                  aria-describedby={errors.diastolic_bp ? "err-metric-diastolic_bp" : undefined}
                />
              </div>
            </div>

            {/* Other Vitals Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                id="metric-blood_sugar_mg_dl"
                label="Blood Sugar (mg/dL)"
                type="number"
                name="blood_sugar_mg_dl"
                value={form.blood_sugar_mg_dl}
                onChange={handleChange}
                disabled={saving}
                step="0.1"
                inputClassName="tabular-nums"
                error={errors.blood_sugar_mg_dl}
                aria-invalid={!!errors.blood_sugar_mg_dl}
                aria-describedby={errors.blood_sugar_mg_dl ? "err-metric-blood_sugar_mg_dl" : undefined}
              />
              <Input
                id="metric-heart_rate_bpm"
                label="Heart Rate (bpm)"
                type="number"
                name="heart_rate_bpm"
                value={form.heart_rate_bpm}
                onChange={handleChange}
                disabled={saving}
                step="1"
                inputClassName="tabular-nums"
                error={errors.heart_rate_bpm}
                aria-invalid={!!errors.heart_rate_bpm}
                aria-describedby={errors.heart_rate_bpm ? "err-metric-heart_rate_bpm" : undefined}
              />
              <Input
                id="metric-oxygen_saturation"
                label="Oxygen Saturation (%)"
                type="number"
                name="oxygen_saturation"
                value={form.oxygen_saturation}
                onChange={handleChange}
                disabled={saving}
                step="1"
                inputClassName="tabular-nums"
                error={errors.oxygen_saturation}
                aria-invalid={!!errors.oxygen_saturation}
                aria-describedby={errors.oxygen_saturation ? "err-metric-oxygen_saturation" : undefined}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2 justify-end">
            <Button intent="ghost" size="sm" onClick={handleCancel} disabled={saving}>{t('common.cancel', 'Cancel')}</Button>
            <Button intent="primary" size="sm" onClick={handleSubmit} loading={saving}>
              {saving ? t('common.saving', 'Saving\u2026') : t('common.save', 'Save')}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
