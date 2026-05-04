import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import Button from './Button';
import Input from './Input';

// Validation ranges matching backend Pydantic schema
const getFields = (t) => [
  { key: 'systolic_bp',       label: t('health_metrics.systolic_bp'),    min: 50,  max: 300, isFloat: false, placeholder: 'e.g. 120' },
  { key: 'diastolic_bp',      label: t('health_metrics.diastolic_bp'),   min: 30,  max: 200, isFloat: false, placeholder: 'e.g. 80' },
  { key: 'blood_sugar_mg_dl', label: t('health_metrics.blood_sugar'),   min: 0,   max: null, isFloat: true, placeholder: 'e.g. 100' },
  { key: 'heart_rate_bpm',    label: t('health_metrics.heart_rate'),      min: 20,  max: 300, isFloat: false, placeholder: 'e.g. 72' },
  { key: 'oxygen_saturation', label: t('health_metrics.oxygen_saturation'), min: 50,  max: 100, isFloat: false, placeholder: 'e.g. 98' },
];

const INITIAL_FORM = {
  systolic_bp: '',
  diastolic_bp: '',
  blood_sugar_mg_dl: '',
  heart_rate_bpm: '',
  oxygen_saturation: '',
};

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

export default function VitalsStep({ onNext, disabled }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDisabled = disabled || isSubmitting;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleNext = async () => {
    // Validate all non-empty fields
    const newErrors = {};
    let hasAnyFilled = false;
    let hasAnyError = false;

    const fields = getFields(t);
    for (const fieldDef of fields) {
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

    // All fields empty — advance without API call
    if (!hasAnyFilled) {
      onNext();
      return;
    }

    // At least one valid field — POST then advance regardless of outcome
    setIsSubmitting(true);
    try {
      const payload = {};
      const fields = getFields(t);
      for (const fieldDef of fields) {
        const raw = form[fieldDef.key];
        if (raw !== '') {
          payload[fieldDef.key] = fieldDef.isFloat
            ? parseFloat(raw)
            : parseInt(raw, 10);
        }
      }
      await api.post('/api/health-metrics', payload);
    } catch {
      // Non-blocking: advance even on failure
    } finally {
      setIsSubmitting(false);
    }
    onNext();
  };

  const handleSkip = () => {
    onNext();
  };

  return (
    <div className="space-y-1">
      {getFields(t).map((fieldDef) => (
        <Input
          key={fieldDef.key}
          id={`vitals-${fieldDef.key}`}
          className="mb-4"
          label={fieldDef.label}
          type="number"
          name={fieldDef.key}
          value={form[fieldDef.key]}
          onChange={handleChange}
          disabled={isDisabled}
          placeholder={fieldDef.placeholder}
          step={fieldDef.isFloat ? '0.1' : '1'}
          inputClassName="tabular-nums"
          error={errors[fieldDef.key]}
          aria-invalid={!!errors[fieldDef.key]}
          aria-describedby={errors[fieldDef.key] ? `err-vitals-${fieldDef.key}` : undefined}
        />
      ))}

      <div className="flex gap-3 pt-2">
        <Button
          onClick={handleNext}
          disabled={isDisabled}
          intent="primary"
          size="md"
          loading={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? t('common.saving', 'Saving…') : t('common.next', 'Next')}
        </Button>
        <Button
          onClick={handleSkip}
          disabled={isDisabled}
          intent="ghost"
          size="md"
          className="flex-1"
        >
          {t('common.skip', 'Skip')}
        </Button>
      </div>
    </div>
  );
}
