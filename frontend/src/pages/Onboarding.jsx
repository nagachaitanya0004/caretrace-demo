import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { api } from '../services/api';
import VitalsStep from '../components/VitalsStep';

const TOTAL_STEPS = 5;
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const CONDITION_OPTIONS = ['Diabetes', 'Heart Disease', 'Hypertension', 'Cancer', 'Stroke', 'Asthma', 'Other'];
const RELATION_OPTIONS  = ['Father', 'Mother', 'Sibling', 'Grandparent', 'Other'];

// All styles use CSS custom properties so dark mode works automatically
const S = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--app-bg)',
    padding: '1.5rem',
  },
  card: {
    width: '100%',
    maxWidth: '500px',
    backgroundColor: 'var(--app-surface)',
    borderRadius: '1rem',
    border: '1px solid var(--app-border)',
    boxShadow: 'var(--app-shadow-medium)',
    padding: '2.5rem',
  },
  stepLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--app-accent)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: '1.25rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--app-text)',
    marginBottom: '0.25rem',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: 'var(--app-text-muted)',
    marginBottom: '0.25rem',
  },
  sectionLabel: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--app-text)',
    marginBottom: '1.5rem',
    paddingTop: '0.25rem',
  },
  label: {
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: 'var(--app-text-muted)',
    marginBottom: '0.375rem',
  },
  input: {
    width: '100%',
    padding: '0.625rem 0.75rem',
    border: '1px solid var(--app-input-border)',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    color: 'var(--app-text)',
    backgroundColor: 'var(--app-input-bg)',
    outline: 'none',
    boxSizing: 'border-box',
  },
  field: { marginBottom: '1rem' },
  hint: {
    fontSize: '0.75rem',
    color: 'var(--app-text-disabled)',
    marginBottom: '1.25rem',
    marginTop: '-0.75rem',
  },
  btnPrimary: (disabled) => ({
    flex: 1,
    padding: '0.75rem',
    backgroundColor: 'var(--app-accent)',
    color: 'var(--brand-accent-on, #000)',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  }),
  btnSecondary: (disabled) => ({
    flex: 1,
    padding: '0.75rem',
    backgroundColor: 'transparent',
    color: 'var(--app-text-muted)',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    border: '1px solid var(--app-border)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  }),
  btnRow: { display: 'flex', gap: '0.75rem', marginTop: '0.5rem' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' },
  entryRow: (cols) => ({
    display: 'grid',
    gridTemplateColumns: cols,
    gap: '0.5rem',
    marginBottom: '0.75rem',
    alignItems: 'end',
  }),
  removeBtn: (disabled) => ({
    padding: '0.5rem',
    background: 'none',
    border: '1px solid var(--app-border)',
    borderRadius: '0.5rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    color: 'var(--app-text-disabled)',
    opacity: disabled ? 0.4 : 1,
  }),
  addBtn: {
    fontSize: '0.8125rem',
    color: 'var(--app-accent)',
    background: 'none',
    border: '1px dashed var(--app-border)',
    borderRadius: '0.5rem',
    padding: '0.5rem 0.875rem',
    cursor: 'pointer',
    marginBottom: '1.25rem',
    width: '100%',
  },
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.625rem 0.75rem',
    border: '1px solid var(--app-border)',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: 'var(--app-text)',
  },
  bmiText: {
    fontSize: '0.75rem',
    color: 'var(--app-text-muted)',
    marginBottom: '1rem',
    marginTop: '0.25rem',
  },
  progressBar: {
    display: 'flex',
    gap: '0.375rem',
    marginBottom: '1.75rem',
  },
};

function parseList(str) {
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

export default function Onboarding() {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]           = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [basicForm, setBasicForm] = useState({
    age: '', gender: '', height_cm: '', weight_kg: '', blood_group: '', lifestyle: '',
  });
  const [medForm, setMedForm] = useState({
    conditions: '', medications: '', allergies: '', surgeries: '',
  });
  const [famEntries, setFamEntries] = useState([{ condition: '', relation: '' }]);
  const [lifeForm, setLifeForm] = useState({
    sleep_hours: '', sleep_quality: '', diet_type: '',
    exercise_frequency: '', water_intake_liters: '',
    smoking: false, alcohol: false, stress_level: 5,
  });

  const addFamEntry    = () => setFamEntries(p => [...p, { condition: '', relation: '' }]);
  const removeFamEntry = (i) => setFamEntries(p => p.filter((_, idx) => idx !== i));
  const updateFamEntry = (i, f, v) => setFamEntries(p => p.map((e, idx) => idx === i ? { ...e, [f]: v } : e));

  const handleBasicChange = e => setBasicForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleMedChange   = e => setMedForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleLifeChange  = e => {
    const { name, value, type, checked } = e.target;
    setLifeForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const finishOnboarding = async () => {
    await api.patch('/auth/onboarding/complete');
    if (setUser) setUser(p => ({ ...p, is_onboarded: true }));
    navigate('/dashboard', { replace: true });
  };

  const handleStep1Next = async () => {
    setIsSubmitting(true);
    try {
      const payload = {};
      if (basicForm.age !== '')         payload.age         = parseInt(basicForm.age, 10);
      if (basicForm.gender !== '')      payload.gender      = basicForm.gender;
      if (basicForm.height_cm !== '')   payload.height_cm   = parseFloat(basicForm.height_cm);
      if (basicForm.weight_kg !== '')   payload.weight_kg   = parseFloat(basicForm.weight_kg);
      if (basicForm.blood_group !== '') payload.blood_group = basicForm.blood_group;
      if (basicForm.lifestyle !== '')   payload.lifestyle   = basicForm.lifestyle;
      if (Object.keys(payload).length > 0) await api.put('/api/users/me', payload);
      setStep(2);
    } catch { setStep(2); }
    finally { setIsSubmitting(false); }
  };

  const handleStep2Next = async () => {
    setIsSubmitting(true);
    try {
      const payload = {};
      const conditions  = parseList(medForm.conditions);
      const medications = parseList(medForm.medications);
      const allergies   = parseList(medForm.allergies);
      const surgeries   = parseList(medForm.surgeries);
      if (conditions.length)  payload.conditions  = conditions;
      if (medications.length) payload.medications = medications;
      if (allergies.length)   payload.allergies   = allergies;
      if (surgeries.length)   payload.surgeries   = surgeries;
      if (Object.keys(payload).length > 0) await api.put('/api/medical-history', payload);
      setStep(3);
    } catch { setStep(3); }
    finally { setIsSubmitting(false); }
  };

  const handleStep3Next = async () => {
    setIsSubmitting(true);
    try {
      const entries = famEntries
        .filter(e => e.condition.trim())
        .map(e => ({ condition_name: e.condition.trim(), relation: e.relation || null }));
      if (entries.length > 0) await api.post('/api/family-history', { entries });
      setStep(4);
    } catch { setStep(4); }
    finally { setIsSubmitting(false); }
  };

  const handleStep4Next = async () => {
    setIsSubmitting(true);
    try {
      const payload = {};
      if (lifeForm.sleep_hours !== '')         payload.sleep_hours         = parseFloat(lifeForm.sleep_hours);
      if (lifeForm.sleep_quality !== '')       payload.sleep_quality       = lifeForm.sleep_quality;
      if (lifeForm.diet_type !== '')           payload.diet_type           = lifeForm.diet_type;
      if (lifeForm.exercise_frequency !== '') payload.exercise_frequency  = lifeForm.exercise_frequency;
      if (lifeForm.water_intake_liters !== '') payload.water_intake_liters = parseFloat(lifeForm.water_intake_liters);
      payload.smoking      = lifeForm.smoking;
      payload.alcohol      = lifeForm.alcohol;
      payload.stress_level = parseInt(lifeForm.stress_level, 10);
      await api.put('/api/lifestyle', payload);
      setStep(5);
    } catch {
      setStep(5);
    } finally { setIsSubmitting(false); }
  };

  const handleStep5Next = async () => {
    await finishOnboarding();
  };

  const handleSkip = async (nextStep) => {
    if (nextStep > TOTAL_STEPS) {
      setIsSubmitting(true);
      try { await finishOnboarding(); }
      catch { navigate('/dashboard', { replace: true }); }
      finally { setIsSubmitting(false); }
    } else {
      setStep(nextStep);
    }
  };

  const bmiPreview = (() => {
    const h = parseFloat(basicForm.height_cm);
    const w = parseFloat(basicForm.weight_kg);
    if (h > 0 && w > 0) return (w / (h / 100) ** 2).toFixed(2);
    return null;
  })();

  const STEP_TITLES = ['Basic Information', 'Medical History', 'Family Health History', 'Lifestyle & Habits', 'Health Metrics (Optional)'];

  return (
    <div style={S.page}>
      <div style={S.card}>

        {/* Progress dots */}
        <div style={S.progressBar}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div key={i} style={{
              flex: 1,
              height: '3px',
              borderRadius: '999px',
              backgroundColor: i < step ? 'var(--app-accent)' : 'var(--app-border)',
              transition: 'background-color 0.3s ease',
            }} />
          ))}
        </div>

        {/* Step label */}
        <p style={S.stepLabel}>Step {step} of {TOTAL_STEPS}</p>

        {/* Header */}
        <h1 style={S.title}>Complete Your Profile</h1>
        <p style={S.subtitle}>Help us personalize your health insights</p>
        <p style={S.sectionLabel}>{STEP_TITLES[step - 1]}</p>

        {/* ── STEP 1 — Basic Information ── */}
        {step === 1 && (
          <div>
            <div style={S.grid2}>
              <div>
                <label style={S.label}>Age</label>
                <input type="number" name="age" min="1" max="120" placeholder="e.g. 28"
                  value={basicForm.age} onChange={handleBasicChange} disabled={isSubmitting} style={S.input} />
              </div>
              <div>
                <label style={S.label}>Gender</label>
                <select name="gender" value={basicForm.gender} onChange={handleBasicChange}
                  disabled={isSubmitting} style={S.input}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div style={{ ...S.grid2, marginBottom: bmiPreview ? '0.5rem' : '1rem' }}>
              <div>
                <label style={S.label}>Height (cm)</label>
                <input type="number" name="height_cm" min="1" step="0.1" placeholder="e.g. 170"
                  value={basicForm.height_cm} onChange={handleBasicChange} disabled={isSubmitting} style={S.input} />
              </div>
              <div>
                <label style={S.label}>Weight (kg)</label>
                <input type="number" name="weight_kg" min="1" step="0.1" placeholder="e.g. 65"
                  value={basicForm.weight_kg} onChange={handleBasicChange} disabled={isSubmitting} style={S.input} />
              </div>
            </div>

            {bmiPreview && (
              <p style={S.bmiText}>
                BMI: <span style={{ fontWeight: 600, color: 'var(--app-text)' }}>{bmiPreview}</span>
              </p>
            )}

            <div style={S.field}>
              <label style={S.label}>Blood Group</label>
              <select name="blood_group" value={basicForm.blood_group} onChange={handleBasicChange}
                disabled={isSubmitting} style={S.input}>
                <option value="">Select</option>
                {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
              </select>
            </div>

            <div style={S.field}>
              <label style={S.label}>Lifestyle</label>
              <select name="lifestyle" value={basicForm.lifestyle} onChange={handleBasicChange}
                disabled={isSubmitting} style={S.input}>
                <option value="">Select</option>
                <option value="active">Active</option>
                <option value="sedentary">Sedentary</option>
                <option value="smoker">Smoker</option>
              </select>
            </div>

            <div style={S.btnRow}>
              <button onClick={handleStep1Next} disabled={isSubmitting} style={S.btnPrimary(isSubmitting)}>
                {isSubmitting ? 'Saving…' : 'Next'}
              </button>
              <button onClick={() => handleSkip(2)} disabled={isSubmitting} style={S.btnSecondary(isSubmitting)}>
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2 — Medical History ── */}
        {step === 2 && (
          <div>
            <p style={S.hint}>Separate multiple entries with commas</p>
            {[
              { name: 'conditions',  label: 'Existing Conditions', placeholder: 'e.g. Diabetes, Hypertension' },
              { name: 'medications', label: 'Current Medications',  placeholder: 'e.g. Metformin, Aspirin' },
              { name: 'allergies',   label: 'Allergies',            placeholder: 'e.g. Penicillin, Peanuts' },
              { name: 'surgeries',   label: 'Past Surgeries',       placeholder: 'e.g. Appendectomy' },
            ].map(({ name, label, placeholder }) => (
              <div key={name} style={S.field}>
                <label style={S.label}>{label}</label>
                <input type="text" name={name} placeholder={placeholder}
                  value={medForm[name]} onChange={handleMedChange} disabled={isSubmitting} style={S.input} />
              </div>
            ))}
            <div style={S.btnRow}>
              <button onClick={handleStep2Next} disabled={isSubmitting} style={S.btnPrimary(isSubmitting)}>
                {isSubmitting ? 'Saving…' : 'Next'}
              </button>
              <button onClick={() => handleSkip(3)} disabled={isSubmitting} style={S.btnSecondary(isSubmitting)}>
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3 — Family Health History ── */}
        {step === 3 && (
          <div>
            <p style={S.hint}>Add conditions that run in your family</p>
            {famEntries.map((entry, i) => (
              <div key={i} style={S.entryRow('1fr 1fr auto')}>
                <div>
                  {i === 0 && <label style={S.label}>Condition</label>}
                  <select value={entry.condition} onChange={e => updateFamEntry(i, 'condition', e.target.value)}
                    disabled={isSubmitting} style={S.input}>
                    <option value="">Select</option>
                    {CONDITION_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  {i === 0 && <label style={S.label}>Relation</label>}
                  <select value={entry.relation} onChange={e => updateFamEntry(i, 'relation', e.target.value)}
                    disabled={isSubmitting} style={S.input}>
                    <option value="">Optional</option>
                    {RELATION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <button onClick={() => removeFamEntry(i)}
                  disabled={isSubmitting || famEntries.length === 1}
                  style={S.removeBtn(isSubmitting || famEntries.length === 1)}
                  title="Remove">✕</button>
              </div>
            ))}
            <button onClick={addFamEntry} disabled={isSubmitting} style={S.addBtn}>
              + Add another condition
            </button>
            <div style={S.btnRow}>
              <button onClick={handleStep3Next} disabled={isSubmitting} style={S.btnPrimary(isSubmitting)}>
                {isSubmitting ? 'Saving…' : 'Next'}
              </button>
              <button onClick={() => handleSkip(4)} disabled={isSubmitting} style={S.btnSecondary(isSubmitting)}>
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4 — Lifestyle & Habits ── */}
        {step === 4 && (
          <div>
            <div style={S.grid2}>
              <div>
                <label style={S.label}>Sleep Duration (hrs)</label>
                <input type="number" name="sleep_hours" min="0" max="24" step="0.5" placeholder="e.g. 7"
                  value={lifeForm.sleep_hours} onChange={handleLifeChange} disabled={isSubmitting} style={S.input} />
              </div>
              <div>
                <label style={S.label}>Sleep Quality</label>
                <select name="sleep_quality" value={lifeForm.sleep_quality} onChange={handleLifeChange}
                  disabled={isSubmitting} style={S.input}>
                  <option value="">Select</option>
                  <option value="good">Good</option>
                  <option value="average">Average</option>
                  <option value="poor">Poor</option>
                </select>
              </div>
            </div>

            <div style={S.grid2}>
              <div>
                <label style={S.label}>Diet Type</label>
                <select name="diet_type" value={lifeForm.diet_type} onChange={handleLifeChange}
                  disabled={isSubmitting} style={S.input}>
                  <option value="">Select</option>
                  <option value="veg">Vegetarian</option>
                  <option value="non-veg">Non-Vegetarian</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              <div>
                <label style={S.label}>Exercise Frequency</label>
                <select name="exercise_frequency" value={lifeForm.exercise_frequency} onChange={handleLifeChange}
                  disabled={isSubmitting} style={S.input}>
                  <option value="">Select</option>
                  <option value="none">None</option>
                  <option value="weekly">Weekly</option>
                  <option value="regular">Regular</option>
                </select>
              </div>
            </div>

            <div style={S.field}>
              <label style={S.label}>Water Intake (liters/day)</label>
              <input type="number" name="water_intake_liters" min="0" step="0.1" placeholder="e.g. 2.5"
                value={lifeForm.water_intake_liters} onChange={handleLifeChange} disabled={isSubmitting} style={S.input} />
            </div>

            <div style={S.field}>
              <label style={S.label}>
                Stress Level&nbsp;
                <span style={{ fontWeight: 700, color: 'var(--app-text)' }}>{lifeForm.stress_level}</span>
                <span style={{ color: 'var(--app-text-disabled)' }}>/10</span>
              </label>
              <input type="range" name="stress_level" min="1" max="10" step="1"
                value={lifeForm.stress_level} onChange={handleLifeChange} disabled={isSubmitting}
                style={{ width: '100%', accentColor: 'var(--app-accent)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--app-text-disabled)', marginTop: '0.25rem' }}>
                <span>Low</span><span>High</span>
              </div>
            </div>

            <div style={{ ...S.grid2, marginBottom: '1.25rem' }}>
              {[['smoking', 'Smoking'], ['alcohol', 'Alcohol']].map(([key, label]) => (
                <label key={key} style={S.toggleLabel}>
                  {label}
                  <input type="checkbox" name={key} checked={lifeForm[key]} onChange={handleLifeChange}
                    disabled={isSubmitting} style={{ width: '1rem', height: '1rem', accentColor: 'var(--app-accent)' }} />
                </label>
              ))}
            </div>

            <div style={S.btnRow}>
              <button onClick={handleStep4Next} disabled={isSubmitting} style={S.btnPrimary(isSubmitting)}>
                {isSubmitting ? 'Saving…' : 'Next'}
              </button>
              <button onClick={() => handleSkip(5)} disabled={isSubmitting} style={S.btnSecondary(isSubmitting)}>
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 5 — Health Metrics (Optional) ── */}
        {step === 5 && <VitalsStep onNext={handleStep5Next} disabled={isSubmitting} />}

      </div>
    </div>
  );
}
