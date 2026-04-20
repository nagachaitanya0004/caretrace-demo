import { useState, useEffect } from 'react';
import { api, unwrapApiPayload } from '../services/api';
import Card from './Card';
import Button from './Button';

// Validation ranges matching backend Pydantic schema
const FIELDS = [
  { key: 'systolic_bp',       label: 'Systolic BP',       unit: 'mmHg',  min: 50,  max: 300, isFloat: false },
  { key: 'diastolic_bp',      label: 'Diastolic BP',      unit: 'mmHg',  min: 30,  max: 200, isFloat: false },
  { key: 'blood_sugar_mg_dl', label: 'Blood Sugar',       unit: 'mg/dL', min: 0,   max: null, isFloat: true },
  { key: 'heart_rate_bpm',    label: 'Heart Rate',        unit: 'bpm',   min: 20,  max: 300, isFloat: false },
  { key: 'oxygen_saturation', label: 'Oxygen Saturation', unit: '%',     min: 50,  max: 100, isFloat: false },
];

const INITIAL_FORM = {
  systolic_bp: '',
  diastolic_bp: '',
  blood_sugar_mg_dl: '',
  heart_rate_bpm: '',
  oxygen_saturation: '',
};

// Helper components matching HealthProfile.jsx patterns
function SectionHeader({ title, icon, onAddEntry, showForm }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {!showForm && (
        <Button variant="secondary" onClick={onAddEntry}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Entry
        </Button>
      )}
    </div>
  );
}

function DisplayRow({ label, value }) {
  const isEmpty = value === 'Not provided';
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</span>
      <span className={`text-sm ${isEmpty ? 'text-gray-400 italic' : 'text-gray-800 font-medium'}`}>{value}</span>
    </div>
  );
}

const fieldCls = "w-full px-3 py-2 border border-gray-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-zinc-600";
const fieldErrorCls = "w-full px-3 py-2 border border-red-500 rounded-md text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500";
const labelCls = "block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1";
const errorTextCls = "text-xs text-red-500 mt-1";

function validateField(fieldDef, rawValue) {
  if (rawValue === '' || rawValue === null || rawValue === undefined) return null;
  const num = fieldDef.isFloat ? parseFloat(rawValue) : parseInt(rawValue, 10);
  if (isNaN(num)) return 'Must be a valid number';
  if (fieldDef.min !== null && num < fieldDef.min) {
    return `Must be at least ${fieldDef.min}`;
  }
  if (fieldDef.max !== null && num > fieldDef.max) {
    return `Must be at most ${fieldDef.max}`;
  }
  return null;
}

export default function HealthMetricsSection({ addNotification }) {
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/health-metrics');
        const records = unwrapApiPayload(res) || [];
        setLatest(records.length > 0 ? records[0] : null);
      } catch {
        setLatest(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async () => {
    // Validate all non-empty fields
    const newErrors = {};
    let hasAnyFilled = false;
    let hasAnyError = false;

    for (const fieldDef of FIELDS) {
      const raw = form[fieldDef.key];
      if (raw !== '') {
        hasAnyFilled = true;
        const err = validateField(fieldDef, raw);
        if (err) {
          newErrors[fieldDef.key] = err;
          hasAnyError = true;
        }
      }
    }

    if (hasAnyError) {
      setErrors(newErrors);
      return;
    }

    // All fields empty — show validation message
    if (!hasAnyFilled) {
      addNotification('Please enter at least one metric value', 'error');
      return;
    }

    // At least one valid field — POST
    setSaving(true);
    try {
      const payload = {};
      for (const fieldDef of FIELDS) {
        const raw = form[fieldDef.key];
        if (raw !== '') {
          payload[fieldDef.key] = fieldDef.isFloat
            ? parseFloat(raw)
            : parseInt(raw, 10);
        }
      }
      await api.post('/api/health-metrics', payload);

      // Re-fetch to update display
      const res = await api.get('/api/health-metrics');
      const records = unwrapApiPayload(res) || [];
      setLatest(records.length > 0 ? records[0] : null);

      // Close form and reset
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

  const handleCancel = () => {
    setShowForm(false);
    setForm(INITIAL_FORM);
    setErrors({});
  };

  if (loading) {
    return (
      <Card className="border-slate-200/80">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-zinc-200 border-t-zinc-800 rounded-full animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200/80">
      <SectionHeader
        title="Health Metrics (Vitals)"
        icon={
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        }
        onAddEntry={() => setShowForm(true)}
        showForm={showForm}
      />

      {!showForm ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5">
          {FIELDS.map((fieldDef) => {
            const value = latest && latest[fieldDef.key] != null
              ? `${latest[fieldDef.key]} ${fieldDef.unit}`
              : 'Not provided';
            return <DisplayRow key={fieldDef.key} label={fieldDef.label} value={value} />;
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-gray-400 -mt-2 mb-1">Enter your current vital signs</p>
          <div className="grid grid-cols-2 gap-4">
            {FIELDS.map((fieldDef) => (
              <div key={fieldDef.key}>
                <label className={labelCls}>
                  {fieldDef.label} ({fieldDef.unit})
                </label>
                <input
                  type="number"
                  name={fieldDef.key}
                  value={form[fieldDef.key]}
                  onChange={handleChange}
                  disabled={saving}
                  className={errors[fieldDef.key] ? fieldErrorCls : fieldCls}
                  step={fieldDef.isFloat ? '0.1' : '1'}
                />
                {errors[fieldDef.key] && (
                  <p className={errorTextCls}>{errors[fieldDef.key]}</p>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
