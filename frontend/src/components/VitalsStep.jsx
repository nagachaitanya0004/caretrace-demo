import { useState } from 'react';
import { api } from '../services/api';
import Button from './Button';
import Input from './Input';

// Validation ranges matching backend Pydantic schema
const FIELDS = [
  { key: 'systolic_bp',       label: 'Systolic BP (mmHg)',    min: 50,  max: 300, isFloat: false, placeholder: 'e.g. 120' },
  { key: 'diastolic_bp',      label: 'Diastolic BP (mmHg)',   min: 30,  max: 200, isFloat: false, placeholder: 'e.g. 80' },
  { key: 'blood_sugar_mg_dl', label: 'Blood Sugar (mg/dL)',   min: 0,   max: null, isFloat: true, placeholder: 'e.g. 100' },
  { key: 'heart_rate_bpm',    label: 'Heart Rate (bpm)',      min: 20,  max: 300, isFloat: false, placeholder: 'e.g. 72' },
  { key: 'oxygen_saturation', label: 'Oxygen Saturation (%)', min: 50,  max: 100, isFloat: false, placeholder: 'e.g. 98' },
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

    // All fields empty — advance without API call
    if (!hasAnyFilled) {
      onNext();
      return;
    }

    // At least one valid field — POST then advance regardless of outcome
    setIsSubmitting(true);
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
    <div>
      {FIELDS.map((fieldDef) => (
        <Input
          key={fieldDef.key}
          className="mb-4"
          label={fieldDef.label}
          type="number"
          name={fieldDef.key}
          value={form[fieldDef.key]}
          onChange={handleChange}
          disabled={isDisabled}
          placeholder={fieldDef.placeholder}
          step={fieldDef.isFloat ? '0.1' : '1'}
          error={errors[fieldDef.key]}
          aria-invalid={!!errors[fieldDef.key]}
          aria-describedby={errors[fieldDef.key] ? `err-${fieldDef.key}` : undefined}
        />
      ))}

      <div className="flex gap-3 mt-2">
        <Button
          onClick={handleNext}
          disabled={isDisabled}
          intent="primary"
          size="md"
          loading={isSubmitting}
          className="flex-1"
        >
          Next
        </Button>
        <Button
          onClick={handleSkip}
          disabled={isDisabled}
          intent="ghost"
          size="md"
          className="flex-1"
        >
          Skip
        </Button>
      </div>
    </div>
  );
}
