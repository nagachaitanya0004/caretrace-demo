import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { api } from '../services/api';

const TOTAL_STEPS = 4;
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const CONDITION_OPTIONS = ['Diabetes', 'Heart Disease', 'Hypertension', 'Cancer', 'Stroke', 'Asthma', 'Other'];
const RELATION_OPTIONS  = ['Father', 'Mother', 'Sibling', 'Grandparent', 'Other'];

const inputStyle = {
  width: '100%',
  padding: '0.625rem 0.75rem',
  border: '1px solid #e5e7eb',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  color: '#111827',
  backgroundColor: '#ffffff',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.8125rem',
  fontWeight: 500,
  color: '#374151',
  marginBottom: '0.375rem',
};

const fieldStyle = { marginBottom: '1rem' };

// Parse a comma-separated string into a trimmed, non-empty array
function parseList(str) {
  return str.split(',').map((s) => s.trim()).filter(Boolean);
}

export default function Onboarding() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1 — Basic Information
  const [basicForm, setBasicForm] = useState({
    age: '', gender: '', height_cm: '', weight_kg: '', blood_group: '', lifestyle: '',
  });

  // Step 2 — Medical History (comma-separated strings in UI, sent as arrays)
  const [medForm, setMedForm] = useState({
    conditions: '', medications: '', allergies: '', surgeries: '',
  });

  // Step 3 — Family History (dynamic list of {condition, relation} rows)
  const [famEntries, setFamEntries] = useState([{ condition: '', relation: '' }]);

  const addFamEntry    = () => setFamEntries(prev => [...prev, { condition: '', relation: '' }]);
  const removeFamEntry = (i) => setFamEntries(prev => prev.filter((_, idx) => idx !== i));
  const updateFamEntry = (i, field, value) =>
    setFamEntries(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e));

  // Step 4 — Lifestyle & Habits
  const [lifeForm, setLifeForm] = useState({
    sleep_hours: '', sleep_quality: '', diet_type: '',
    exercise_frequency: '', water_intake_liters: '',
    smoking: false, alcohol: false, stress_level: 5,
  });
  const handleLifeChange = (e) => {
    const { name, value, type, checked } = e.target;
    setLifeForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleBasicChange = (e) => {
    const { name, value } = e.target;
    setBasicForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleMedChange = (e) => {
    const { name, value } = e.target;
    setMedForm((prev) => ({ ...prev, [name]: value }));
  };

  const finishOnboarding = async () => {
    await api.patch('/auth/onboarding/complete');
    if (setUser) setUser((prev) => ({ ...prev, is_onboarded: true }));
    navigate('/dashboard', { replace: true });
  };

  // Step 1 — save basic info then advance to step 2
  const handleStep1Next = async () => {
    setIsSubmitting(true);
    try {
      const payload = {};
      if (basicForm.age !== '')         payload.age        = parseInt(basicForm.age, 10);
      if (basicForm.gender !== '')      payload.gender     = basicForm.gender;
      if (basicForm.height_cm !== '')   payload.height_cm  = parseFloat(basicForm.height_cm);
      if (basicForm.weight_kg !== '')   payload.weight_kg  = parseFloat(basicForm.weight_kg);
      if (basicForm.blood_group !== '') payload.blood_group = basicForm.blood_group;
      if (basicForm.lifestyle !== '')   payload.lifestyle  = basicForm.lifestyle;
      if (Object.keys(payload).length > 0) {
        await api.put('/api/users/me', payload);
      }
      setStep(2);
    } catch {
      // Failsafe: still advance
      setStep(2);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 1 — skip directly to step 2 without saving
  const handleStep1Skip = () => setStep(2);

  // Step 2 — save medical history then advance to step 3
  const handleStep2Next = async () => {
    setIsSubmitting(true);
    try {
      const payload = {};
      const conditions = parseList(medForm.conditions);
      const medications = parseList(medForm.medications);
      const allergies   = parseList(medForm.allergies);
      const surgeries   = parseList(medForm.surgeries);
      if (conditions.length)  payload.conditions  = conditions;
      if (medications.length) payload.medications = medications;
      if (allergies.length)   payload.allergies   = allergies;
      if (surgeries.length)   payload.surgeries   = surgeries;
      if (Object.keys(payload).length > 0) {
        await api.put('/api/medical-history', payload);
      }
      setStep(3);
    } catch {
      setStep(3);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2 — skip without saving
  const handleStep2Skip = () => setStep(3);

  // Step 3 — save family history then advance to step 4
  const handleStep3Next = async () => {
    setIsSubmitting(true);
    try {
      const entries = famEntries
        .filter(e => e.condition.trim())
        .map(e => ({ condition_name: e.condition.trim(), relation: e.relation || null }));
      if (entries.length > 0) {
        await api.post('/api/family-history', { entries });
      }
      setStep(4);
    } catch {
      setStep(4);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3 — skip without saving
  const handleStep3Skip = () => setStep(4);

  // Step 4 — save lifestyle data then finish onboarding
  const handleStep4Next = async () => {
    setIsSubmitting(true);
    try {
      const payload = {};
      if (lifeForm.sleep_hours !== '')        payload.sleep_hours        = parseFloat(lifeForm.sleep_hours);
      if (lifeForm.sleep_quality !== '')      payload.sleep_quality      = lifeForm.sleep_quality;
      if (lifeForm.diet_type !== '')          payload.diet_type          = lifeForm.diet_type;
      if (lifeForm.exercise_frequency !== '') payload.exercise_frequency = lifeForm.exercise_frequency;
      if (lifeForm.water_intake_liters !== '') payload.water_intake_liters = parseFloat(lifeForm.water_intake_liters);
      payload.smoking      = lifeForm.smoking;
      payload.alcohol      = lifeForm.alcohol;
      payload.stress_level = parseInt(lifeForm.stress_level, 10);
      await api.put('/api/lifestyle', payload);
      await finishOnboarding();
    } catch {
      try { await finishOnboarding(); } catch { navigate('/dashboard', { replace: true }); }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 4 — skip without saving
  const handleStep4Skip = async () => {
    setIsSubmitting(true);
    try {
      await finishOnboarding();
    } catch {
      navigate('/dashboard', { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const bmiPreview = (() => {
    const h = parseFloat(basicForm.height_cm);
    const w = parseFloat(basicForm.weight_kg);
    if (h > 0 && w > 0) return (w / (h / 100) ** 2).toFixed(2);
    return null;
  })();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: '480px', backgroundColor: '#ffffff', borderRadius: '1rem', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: '2.5rem' }}>

        {/* Step indicator */}
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
          Step {step} of {TOTAL_STEPS}
        </p>

        {/* Header */}
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', marginBottom: '0.375rem' }}>
          Complete Your Profile
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
          Help us personalize your health insights
        </p>
        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#111827', marginBottom: '1.75rem', paddingTop: '0.25rem' }}>
          {step === 1 ? 'Basic Information' : step === 2 ? 'Medical History' : step === 3 ? 'Family Health History' : 'Lifestyle & Habits'}
        </p>

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>Age</label>
                <input type="number" name="age" min="1" max="120" placeholder="e.g. 28"
                  value={basicForm.age} onChange={handleBasicChange} disabled={isSubmitting} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Gender</label>
                <select name="gender" value={basicForm.gender} onChange={handleBasicChange}
                  disabled={isSubmitting} style={{ ...inputStyle, backgroundColor: '#ffffff' }}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: bmiPreview ? '0.5rem' : '1rem' }}>
              <div>
                <label style={labelStyle}>Height (cm)</label>
                <input type="number" name="height_cm" min="1" step="0.1" placeholder="e.g. 170"
                  value={basicForm.height_cm} onChange={handleBasicChange} disabled={isSubmitting} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Weight (kg)</label>
                <input type="number" name="weight_kg" min="1" step="0.1" placeholder="e.g. 65"
                  value={basicForm.weight_kg} onChange={handleBasicChange} disabled={isSubmitting} style={inputStyle} />
              </div>
            </div>

            {bmiPreview && (
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '1rem', marginTop: '0.25rem' }}>
                BMI: <span style={{ fontWeight: 600, color: '#111827' }}>{bmiPreview}</span>
              </p>
            )}

            <div style={fieldStyle}>
              <label style={labelStyle}>Blood Group</label>
              <select name="blood_group" value={basicForm.blood_group} onChange={handleBasicChange}
                disabled={isSubmitting} style={{ ...inputStyle, backgroundColor: '#ffffff' }}>
                <option value="">Select</option>
                {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
              </select>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Lifestyle</label>
              <select name="lifestyle" value={basicForm.lifestyle} onChange={handleBasicChange}
                disabled={isSubmitting} style={{ ...inputStyle, backgroundColor: '#ffffff' }}>
                <option value="">Select</option>
                <option value="active">Active</option>
                <option value="sedentary">Sedentary</option>
                <option value="smoker">Smoker</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button onClick={handleStep1Next} disabled={isSubmitting}
                style={{ flex: 1, padding: '0.75rem', backgroundColor: '#111827', color: '#ffffff', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.6 : 1 }}>
                {isSubmitting ? 'Saving…' : 'Next'}
              </button>
              <button onClick={handleStep1Skip} disabled={isSubmitting}
                style={{ flex: 1, padding: '0.75rem', backgroundColor: 'transparent', color: '#6b7280', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, border: '1px solid #e5e7eb', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.6 : 1 }}>
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '1.25rem', marginTop: '-1rem' }}>
              Separate multiple entries with commas
            </p>

            <div style={fieldStyle}>
              <label style={labelStyle}>Existing Conditions</label>
              <input type="text" name="conditions" placeholder="e.g. Diabetes, Hypertension"
                value={medForm.conditions} onChange={handleMedChange} disabled={isSubmitting} style={inputStyle} />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Current Medications</label>
              <input type="text" name="medications" placeholder="e.g. Metformin, Aspirin"
                value={medForm.medications} onChange={handleMedChange} disabled={isSubmitting} style={inputStyle} />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Allergies</label>
              <input type="text" name="allergies" placeholder="e.g. Penicillin, Peanuts"
                value={medForm.allergies} onChange={handleMedChange} disabled={isSubmitting} style={inputStyle} />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Past Surgeries</label>
              <input type="text" name="surgeries" placeholder="e.g. Appendectomy, ACL repair"
                value={medForm.surgeries} onChange={handleMedChange} disabled={isSubmitting} style={inputStyle} />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button onClick={handleStep2Next} disabled={isSubmitting}
                style={{ flex: 1, padding: '0.75rem', backgroundColor: '#111827', color: '#ffffff', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.6 : 1 }}>
                {isSubmitting ? 'Saving…' : 'Next'}
              </button>
              <button onClick={handleStep2Skip} disabled={isSubmitting}
                style={{ flex: 1, padding: '0.75rem', backgroundColor: 'transparent', color: '#6b7280', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, border: '1px solid #e5e7eb', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.6 : 1 }}>
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <div>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '1.25rem', marginTop: '-1rem' }}>
              Add conditions that run in your family
            </p>

            {famEntries.map((entry, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'end' }}>
                <div>
                  {i === 0 && <label style={labelStyle}>Condition</label>}
                  <select
                    value={entry.condition}
                    onChange={(e) => updateFamEntry(i, 'condition', e.target.value)}
                    disabled={isSubmitting}
                    style={{ ...inputStyle, backgroundColor: '#ffffff' }}
                  >
                    <option value="">Select or type</option>
                    {CONDITION_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  {i === 0 && <label style={labelStyle}>Relation</label>}
                  <select
                    value={entry.relation}
                    onChange={(e) => updateFamEntry(i, 'relation', e.target.value)}
                    disabled={isSubmitting}
                    style={{ ...inputStyle, backgroundColor: '#ffffff' }}
                  >
                    <option value="">Select (optional)</option>
                    {RELATION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <button
                  onClick={() => removeFamEntry(i)}
                  disabled={isSubmitting || famEntries.length === 1}
                  style={{ padding: '0.5rem', background: 'none', border: '1px solid #e5e7eb', borderRadius: '0.5rem', cursor: famEntries.length === 1 ? 'not-allowed' : 'pointer', color: '#9ca3af', opacity: famEntries.length === 1 ? 0.4 : 1, marginBottom: '0.05rem' }}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}

            <button
              onClick={addFamEntry}
              disabled={isSubmitting}
              style={{ fontSize: '0.8125rem', color: '#374151', background: 'none', border: '1px dashed #d1d5db', borderRadius: '0.5rem', padding: '0.5rem 0.875rem', cursor: 'pointer', marginBottom: '1.25rem', width: '100%' }}
            >
              + Add another condition
            </button>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={handleStep3Next} disabled={isSubmitting}
                style={{ flex: 1, padding: '0.75rem', backgroundColor: '#111827', color: '#ffffff', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.6 : 1 }}>
                {isSubmitting ? 'Saving…' : 'Next'}
              </button>
              <button onClick={handleStep3Skip} disabled={isSubmitting}
                style={{ flex: 1, padding: '0.75rem', backgroundColor: 'transparent', color: '#6b7280', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, border: '1px solid #e5e7eb', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.6 : 1 }}>
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4 ── */}
        {step === 4 && (
          <div>
            {/* Sleep */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>Sleep Duration (hrs)</label>
                <input type="number" name="sleep_hours" min="0" max="24" step="0.5" placeholder="e.g. 7"
                  value={lifeForm.sleep_hours} onChange={handleLifeChange} disabled={isSubmitting} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Sleep Quality</label>
                <select name="sleep_quality" value={lifeForm.sleep_quality} onChange={handleLifeChange}
                  disabled={isSubmitting} style={{ ...inputStyle, backgroundColor: '#ffffff' }}>
                  <option value="">Select</option>
                  <option value="good">Good</option>
                  <option value="average">Average</option>
                  <option value="poor">Poor</option>
                </select>
              </div>
            </div>

            {/* Diet + Exercise */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>Diet Type</label>
                <select name="diet_type" value={lifeForm.diet_type} onChange={handleLifeChange}
                  disabled={isSubmitting} style={{ ...inputStyle, backgroundColor: '#ffffff' }}>
                  <option value="">Select</option>
                  <option value="veg">Vegetarian</option>
                  <option value="non-veg">Non-Vegetarian</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Exercise Frequency</label>
                <select name="exercise_frequency" value={lifeForm.exercise_frequency} onChange={handleLifeChange}
                  disabled={isSubmitting} style={{ ...inputStyle, backgroundColor: '#ffffff' }}>
                  <option value="">Select</option>
                  <option value="none">None</option>
                  <option value="weekly">Weekly</option>
                  <option value="regular">Regular</option>
                </select>
              </div>
            </div>

            {/* Water intake */}
            <div style={fieldStyle}>
              <label style={labelStyle}>Water Intake (liters/day)</label>
              <input type="number" name="water_intake_liters" min="0" step="0.1" placeholder="e.g. 2.5"
                value={lifeForm.water_intake_liters} onChange={handleLifeChange} disabled={isSubmitting} style={inputStyle} />
            </div>

            {/* Stress level slider */}
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Stress Level <span style={{ fontWeight: 700, color: '#111827' }}>{lifeForm.stress_level}</span><span style={{ color: '#9ca3af' }}>/10</span>
              </label>
              <input type="range" name="stress_level" min="1" max="10" step="1"
                value={lifeForm.stress_level} onChange={handleLifeChange} disabled={isSubmitting}
                style={{ width: '100%', accentColor: '#111827' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                <span>Low</span><span>High</span>
              </div>
            </div>

            {/* Smoking + Alcohol toggles */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {[['smoking', 'Smoking'], ['alcohol', 'Alcohol']].map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: '#374151' }}>
                  {label}
                  <input type="checkbox" name={key} checked={lifeForm[key]} onChange={handleLifeChange}
                    disabled={isSubmitting} style={{ width: '1rem', height: '1rem', accentColor: '#111827' }} />
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={handleStep4Next} disabled={isSubmitting}
                style={{ flex: 1, padding: '0.75rem', backgroundColor: '#111827', color: '#ffffff', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.6 : 1 }}>
                {isSubmitting ? 'Saving…' : 'Finish'}
              </button>
              <button onClick={handleStep4Skip} disabled={isSubmitting}
                style={{ flex: 1, padding: '0.75rem', backgroundColor: 'transparent', color: '#6b7280', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, border: '1px solid #e5e7eb', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.6 : 1 }}>
                Skip for now
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
