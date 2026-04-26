import { useState, useEffect } from 'react';
import { api, unwrapApiPayload } from '../services/api';
import Card from './Card';
import Button from './Button';

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

// ── Token-driven field styles ─────────────────────────────────────────────────
const fieldCls =
  'w-full px-3 py-2 bg-[var(--app-input-bg)] text-[var(--app-text)] ' +
  'border border-[var(--app-input-border)] rounded-[var(--radius-md)] text-sm ' +
  'transition-colors duration-150 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:border-[var(--brand-accent)]';

const fieldErrorCls =
  'w-full px-3 py-2 bg-[var(--app-input-bg)] text-[var(--app-text)] ' +
  'border border-[var(--app-danger)] rounded-[var(--radius-md)] text-sm ' +
  'transition-colors duration-150 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-danger)]';

const labelCls = 'block text-xs font-medium text-[var(--app-text-muted)] uppercase tracking-wide mb-1';

function validateField(fieldDef, rawValue) {
  if (rawValue === '' || rawValue == null) return null;
  const num = fieldDef.isFloat ? parseFloat(rawValue) : parseInt(rawValue, 10);
  if (isNaN(num)) return 'Must be a valid number';
  if (fieldDef.min !== null && num < fieldDef.min) return `Must be at least ${fieldDef.min}`;
  if (fieldDef.max !== null && num > fieldDef.max) return `Must be at most ${fieldDef.max}`;
  return null;
}

function DisplayRow({ label, value }) {
  const isEmpty = value === 'Not provided';
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-[var(--app-text-disabled)] uppercase tracking-wide">{label}</span>
      <span className={`text-sm ${isEmpty ? 'text-[var(--app-text-disabled)] italic' : 'text-[var(--app-text)] font-medium'}`}>
        {value}
      </span>
    </div>
  );
}

export default function HealthMetricsSection({ addNotification }) {
  const [latest, setLatest]   = useState(null);
  const [loading, setLoading] = useState(true);
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
    if (!hasAnyFilled) { addNotification('Please enter at least one metric value', 'error'); return; }

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
      addNotification('Vitals recorded', 'success');
    } catch (e) {
      addNotification(e.message || 'Failed to save vitals', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => { setShowForm(false); setForm(INITIAL_FORM); setErrors({}); };

  if (loading) {
    return (
      <Card elevation={1}>
        <div className="flex items-center justify-center py-8" role="status" aria-label="Loading vitals">
          <span className="w-8 h-8 rounded-full border-4 border-[var(--app-border)] border-t-[var(--app-text)] animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card elevation={1}>
      {/* Section header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-[var(--app-text)] flex items-center gap-2">
          <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          Health Metrics (Vitals)
        </h2>
        {!showForm && (
          <Button intent="secondary" size="sm" onClick={() => setShowForm(true)}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Entry
          </Button>
        )}
      </div>

      {!showForm ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5">
          {FIELDS.map((f) => {
            const value = latest && latest[f.key] != null ? `${latest[f.key]} ${f.unit}` : 'Not provided';
            return <DisplayRow key={f.key} label={f.label} value={value} />;
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-[var(--app-text-disabled)] -mt-2 mb-1">Enter your current vital signs</p>
          <div className="grid grid-cols-2 gap-4">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label className={labelCls} htmlFor={`metric-${f.key}`}>
                  {f.label} ({f.unit})
                </label>
                <input
                  id={`metric-${f.key}`}
                  type="number"
                  name={f.key}
                  value={form[f.key]}
                  onChange={handleChange}
                  disabled={saving}
                  className={errors[f.key] ? fieldErrorCls : fieldCls}
                  step={f.isFloat ? '0.1' : '1'}
                  aria-invalid={!!errors[f.key]}
                  aria-describedby={errors[f.key] ? `err-${f.key}` : undefined}
                />
                {errors[f.key] && (
                  <p id={`err-${f.key}`} className="text-xs text-[var(--app-danger)] mt-1" role="alert">
                    {errors[f.key]}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Button intent="ghost" size="sm" onClick={handleCancel} disabled={saving}>Cancel</Button>
            <Button intent="primary" size="sm" onClick={handleSubmit} loading={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
