import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api, unwrapApiPayload } from '../services/api';
import Card from './Card';
import Button from './Button';
import Input from './Input';
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

  return (
    <Card elevation={1}>
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--app-surface-soft)] text-[var(--app-danger)] transition-colors duration-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-[var(--app-text)] tracking-[-0.01em]">
            {t('health_metrics.title', 'Health Metrics (Vitals)')}
          </h2>
        </div>
        {!showForm && (
          <Button intent="ghost" size="sm" onClick={() => setShowForm(true)} className="gap-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-text)]">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('health_metrics.add_entry', 'Add Entry')}
          </Button>
        )}
      </div>

      {!showForm ? (
        hasData ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {FIELDS.map((f) => {
              const rawVal = latest?.[f.key];
              const hasVal = rawVal != null;
              return (
                <div key={f.key} className="flex flex-col gap-1 px-4 py-3 rounded-xl bg-[var(--app-surface-soft)] border border-[var(--app-border-soft)]">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-text-disabled)]">
                    {f.label}
                  </span>
                  {hasVal ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-semibold text-[var(--app-text)] tabular-nums">{rawVal}</span>
                      <span className="text-[10px] font-medium text-[var(--app-text-muted)]">{f.unit}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-[var(--app-text-disabled)] italic">—</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--app-surface-soft)] flex items-center justify-center text-[var(--app-text-disabled)]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <p className="text-sm text-[var(--app-text-disabled)] text-center max-w-xs">No vitals recorded yet. Track your health metrics to monitor trends over time.</p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[var(--app-text-muted)] border border-dashed border-[var(--app-border)] rounded-xl hover:border-[var(--brand-accent)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-soft)] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Record your first vitals
            </button>
          </div>
        )
      ) : (
        <div className="space-y-4 animate-[fadeIn_0.15s_ease-out]">
          <p className="text-xs text-[var(--app-text-disabled)] -mt-2 mb-1">{t('health_metrics.form_subtitle', 'Enter your current vital signs')}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {FIELDS.map((f) => (
              <Input
                key={f.key}
                id={`metric-${f.key}`}
                label={`${f.label} (${f.unit})`}
                type="number"
                name={f.key}
                value={form[f.key]}
                onChange={handleChange}
                disabled={saving}
                step={f.isFloat ? '0.1' : '1'}
                inputClassName="tabular-nums"
                error={errors[f.key]}
                aria-invalid={!!errors[f.key]}
                aria-describedby={errors[f.key] ? `err-metric-${f.key}` : undefined}
              />
            ))}
          </div>
          <div className="flex gap-2 pt-2">
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
