import { useState, useEffect, useCallback } from 'react';
import { useNotification } from '../NotificationContext';
import { api, unwrapApiPayload } from '../services/api';
import PageFrame from '../components/PageFrame';
import Card from '../components/Card';
import Button from '../components/Button';
import HealthMetricsSection from '../components/HealthMetricsSection';
import MedicalReportsSection from '../components/MedicalReportsSection';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const CONDITION_OPTIONS = ['Diabetes', 'Heart Disease', 'Hypertension', 'Cancer', 'Stroke', 'Asthma', 'Other'];
const RELATION_OPTIONS  = ['Father', 'Mother', 'Sibling', 'Grandparent', 'Other'];

// ── helpers ──────────────────────────────────────────────────────────────────

function val(v) {
  return v !== null && v !== undefined && v !== '' ? v : null;
}

function displayVal(v, suffix = '') {
  return val(v) !== null ? `${v}${suffix}` : 'Not provided';
}

function displayList(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return 'Not provided';
  return arr.join(', ');
}

function parseList(str) {
  return (str || '').split(',').map((s) => s.trim()).filter(Boolean);
}

// ── sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title, icon, editing, onEdit, onCancel, onSave, saving }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {!editing ? (
        <Button variant="secondary" onClick={onEdit}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
          </svg>
          Edit
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
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
const labelCls = "block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1";

// ── main page ─────────────────────────────────────────────────────────────────

export default function HealthProfile() {
  const { addNotification } = useNotification();

  // ── data state ──
  const [profile, setProfile]   = useState(null);
  const [medHist, setMedHist]   = useState(null);
  const [famHist, setFamHist]   = useState([]);
  const [lifestyle, setLifestyle] = useState(null);
  const [loading, setLoading]   = useState(true);

  // ── edit state ──
  const [editingBasic,     setEditingBasic]     = useState(false);
  const [editingMed,       setEditingMed]       = useState(false);
  const [editingFam,       setEditingFam]       = useState(false);
  const [editingLifestyle, setEditingLifestyle] = useState(false);
  const [savingBasic,      setSavingBasic]      = useState(false);
  const [savingMed,        setSavingMed]        = useState(false);
  const [savingFam,        setSavingFam]        = useState(false);
  const [savingLifestyle,  setSavingLifestyle]  = useState(false);

  // ── form state ──
  const [basicForm,     setBasicForm]     = useState({ age: '', gender: '', height_cm: '', weight_kg: '', blood_group: '', lifestyle: '' });
  const [medForm,       setMedForm]       = useState({ conditions: '', medications: '', allergies: '', surgeries: '' });
  const [famRows,       setFamRows]       = useState([{ condition: '', relation: '' }]);
  const [lifestyleForm, setLifestyleForm] = useState({
    sleep_hours: '', sleep_quality: '', diet_type: '', exercise_frequency: '',
    water_intake_liters: '', smoking: false, alcohol: false, stress_level: 5,
  });

  // ── fetch ──
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, medRes, famRes, lifeRes] = await Promise.allSettled([
        api.get('/api/users/me'),
        api.get('/api/medical-history'),
        api.get('/api/family-history'),
        api.get('/api/lifestyle'),
      ]);
      const p = profileRes.status === 'fulfilled' ? (unwrapApiPayload(profileRes.value) || {}) : {};
      const m = medRes.status === 'fulfilled'     ? (unwrapApiPayload(medRes.value)     || null) : null;
      const f = famRes.status === 'fulfilled'     ? (unwrapApiPayload(famRes.value)     || [])   : [];
      const l = lifeRes.status === 'fulfilled'    ? (unwrapApiPayload(lifeRes.value)    || null)  : null;
      setProfile(p);
      setMedHist(m);
      setFamHist(Array.isArray(f) ? f : []);
      setLifestyle(l);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── seed form when entering edit mode ──
  const startEditBasic = () => {
    setBasicForm({
      age:         val(profile?.age)         ?? '',
      gender:      val(profile?.gender)      ?? '',
      height_cm:   val(profile?.height_cm)   ?? '',
      weight_kg:   val(profile?.weight_kg)   ?? '',
      blood_group: val(profile?.blood_group) ?? '',
      lifestyle:   val(profile?.lifestyle)   ?? '',
    });
    setEditingBasic(true);
  };

  const startEditMed = () => {
    setMedForm({
      conditions:  displayList(medHist?.conditions)  === 'Not provided' ? '' : (medHist?.conditions  || []).join(', '),
      medications: displayList(medHist?.medications) === 'Not provided' ? '' : (medHist?.medications || []).join(', '),
      allergies:   displayList(medHist?.allergies)   === 'Not provided' ? '' : (medHist?.allergies   || []).join(', '),
      surgeries:   displayList(medHist?.surgeries)   === 'Not provided' ? '' : (medHist?.surgeries   || []).join(', '),
    });
    setEditingMed(true);
  };

  // ── save basic info ──
  const saveBasic = async () => {
    setSavingBasic(true);
    try {
      const payload = {};
      if (basicForm.age !== '')         payload.age        = parseInt(basicForm.age, 10);
      if (basicForm.gender !== '')      payload.gender     = basicForm.gender;
      if (basicForm.height_cm !== '')   payload.height_cm  = parseFloat(basicForm.height_cm);
      if (basicForm.weight_kg !== '')   payload.weight_kg  = parseFloat(basicForm.weight_kg);
      if (basicForm.blood_group !== '') payload.blood_group = basicForm.blood_group;
      if (basicForm.lifestyle !== '')   payload.lifestyle  = basicForm.lifestyle;
      if (Object.keys(payload).length > 0) {
        const res = await api.put('/api/users/me', payload);
        setProfile(unwrapApiPayload(res) || profile);
      }
      setEditingBasic(false);
      addNotification('Basic information updated', 'success');
    } catch (e) {
      addNotification(e.message || 'Failed to save', 'error');
    } finally {
      setSavingBasic(false);
    }
  };

  // ── save medical history ──
  const saveMed = async () => {
    setSavingMed(true);
    try {
      const payload = {};
      const conditions  = parseList(medForm.conditions);
      const medications = parseList(medForm.medications);
      const allergies   = parseList(medForm.allergies);
      const surgeries   = parseList(medForm.surgeries);
      // Always send all four arrays so the record is complete
      payload.conditions  = conditions;
      payload.medications = medications;
      payload.allergies   = allergies;
      payload.surgeries   = surgeries;
      const res = await api.put('/api/medical-history', payload);
      setMedHist(unwrapApiPayload(res) || medHist);
      setEditingMed(false);
      addNotification('Medical history updated', 'success');
    } catch (e) {
      addNotification(e.message || 'Failed to save', 'error');
    } finally {
      setSavingMed(false);
    }
  };

  // ── family history helpers ──
  const startEditFam = () => {
    setFamRows(
      famHist.length > 0
        ? famHist.map(e => ({ condition: e.condition_name || '', relation: e.relation || '' }))
        : [{ condition: '', relation: '' }]
    );
    setEditingFam(true);
  };

  const addFamRow    = () => setFamRows(prev => [...prev, { condition: '', relation: '' }]);
  const removeFamRow = (i) => setFamRows(prev => prev.filter((_, idx) => idx !== i));
  const updateFamRow = (i, field, value) =>
    setFamRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));

  const saveFam = async () => {
    setSavingFam(true);
    try {
      const entries = famRows
        .filter(r => r.condition.trim())
        .map(r => ({ condition_name: r.condition.trim(), relation: r.relation || null }));
      const res = await api.post('/api/family-history', { entries });
      setFamHist(unwrapApiPayload(res) || []);
      setEditingFam(false);
      addNotification('Family history updated', 'success');
    } catch (e) {
      addNotification(e.message || 'Failed to save', 'error');
    } finally {
      setSavingFam(false);
    }
  };

  // ── lifestyle helpers ──
  const startEditLifestyle = () => {
    setLifestyleForm({
      sleep_hours:         val(lifestyle?.sleep_hours)         ?? '',
      sleep_quality:       val(lifestyle?.sleep_quality)       ?? '',
      diet_type:           val(lifestyle?.diet_type)           ?? '',
      exercise_frequency:  val(lifestyle?.exercise_frequency)  ?? '',
      water_intake_liters: val(lifestyle?.water_intake_liters) ?? '',
      smoking:             lifestyle?.smoking  ?? false,
      alcohol:             lifestyle?.alcohol  ?? false,
      stress_level:        lifestyle?.stress_level ?? 5,
    });
    setEditingLifestyle(true);
  };

  const handleLifestyleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setLifestyleForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const saveLifestyle = async () => {
    setSavingLifestyle(true);
    try {
      const payload = {};
      if (lifestyleForm.sleep_hours !== '')        payload.sleep_hours        = parseFloat(lifestyleForm.sleep_hours);
      if (lifestyleForm.sleep_quality !== '')      payload.sleep_quality      = lifestyleForm.sleep_quality;
      if (lifestyleForm.diet_type !== '')          payload.diet_type          = lifestyleForm.diet_type;
      if (lifestyleForm.exercise_frequency !== '') payload.exercise_frequency = lifestyleForm.exercise_frequency;
      if (lifestyleForm.water_intake_liters !== '') payload.water_intake_liters = parseFloat(lifestyleForm.water_intake_liters);
      payload.smoking      = lifestyleForm.smoking;
      payload.alcohol      = lifestyleForm.alcohol;
      payload.stress_level = parseInt(lifestyleForm.stress_level, 10);
      const res = await api.put('/api/lifestyle', payload);
      setLifestyle(unwrapApiPayload(res) || lifestyle);
      setEditingLifestyle(false);
      addNotification('Lifestyle data updated', 'success');
    } catch (e) {
      addNotification(e.message || 'Failed to save', 'error');
    } finally {
      setSavingLifestyle(false);
    }
  };

  // ── derived BMI for display ──
  const bmi = (() => {
    const h = parseFloat(editingBasic ? basicForm.height_cm : profile?.height_cm);
    const w = parseFloat(editingBasic ? basicForm.weight_kg : profile?.weight_kg);
    if (h > 0 && w > 0) return (w / (h / 100) ** 2).toFixed(2);
    return profile?.bmi ? String(profile.bmi) : null;
  })();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-zinc-200 border-t-zinc-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PageFrame
      title="Health Profile"
      subtitle="View and update your health information anytime"
      maxWidthClass="max-w-3xl"
    >
      {/* ── BASIC INFORMATION ── */}
      <Card className="border-slate-200/80">
        <SectionHeader
          title="Basic Information"
          icon={
            <svg className="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
          editing={editingBasic}
          onEdit={startEditBasic}
          onCancel={() => setEditingBasic(false)}
          onSave={saveBasic}
          saving={savingBasic}
        />

        {!editingBasic ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5">
            <DisplayRow label="Age"         value={displayVal(profile?.age, ' yrs')} />
            <DisplayRow label="Gender"      value={displayVal(profile?.gender)} />
            <DisplayRow label="Blood Group" value={displayVal(profile?.blood_group)} />
            <DisplayRow label="Height"      value={displayVal(profile?.height_cm, ' cm')} />
            <DisplayRow label="Weight"      value={displayVal(profile?.weight_kg, ' kg')} />
            <DisplayRow label="BMI"         value={bmi ? bmi : 'Not provided'} />
            <DisplayRow label="Lifestyle"   value={displayVal(profile?.lifestyle)} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Age</label>
                <input type="number" min="1" max="120" className={fieldCls}
                  value={basicForm.age} onChange={(e) => setBasicForm(p => ({ ...p, age: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Gender</label>
                <select className={fieldCls}
                  value={basicForm.gender} onChange={(e) => setBasicForm(p => ({ ...p, gender: e.target.value }))}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Height (cm)</label>
                <input type="number" min="1" step="0.1" className={fieldCls}
                  value={basicForm.height_cm} onChange={(e) => setBasicForm(p => ({ ...p, height_cm: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Weight (kg)</label>
                <input type="number" min="1" step="0.1" className={fieldCls}
                  value={basicForm.weight_kg} onChange={(e) => setBasicForm(p => ({ ...p, weight_kg: e.target.value }))} />
              </div>
            </div>
            {bmi && (
              <p className="text-xs text-gray-500">
                BMI: <span className="font-semibold text-gray-800">{bmi}</span>
              </p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Blood Group</label>
                <select className={fieldCls}
                  value={basicForm.blood_group} onChange={(e) => setBasicForm(p => ({ ...p, blood_group: e.target.value }))}>
                  <option value="">Select</option>
                  {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Lifestyle</label>
                <select className={fieldCls}
                  value={basicForm.lifestyle} onChange={(e) => setBasicForm(p => ({ ...p, lifestyle: e.target.value }))}>
                  <option value="">Select</option>
                  <option value="active">Active</option>
                  <option value="sedentary">Sedentary</option>
                  <option value="smoker">Smoker</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ── MEDICAL HISTORY ── */}
      <Card className="border-slate-200/80">
        <SectionHeader
          title="Medical History"
          icon={
            <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          editing={editingMed}
          onEdit={startEditMed}
          onCancel={() => setEditingMed(false)}
          onSave={saveMed}
          saving={savingMed}
        />

        {!editingMed ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            <DisplayRow label="Existing Conditions" value={displayList(medHist?.conditions)} />
            <DisplayRow label="Current Medications"  value={displayList(medHist?.medications)} />
            <DisplayRow label="Allergies"             value={displayList(medHist?.allergies)} />
            <DisplayRow label="Past Surgeries"        value={displayList(medHist?.surgeries)} />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-gray-400 -mt-2 mb-1">Separate multiple entries with commas</p>
            {[
              { key: 'conditions',  label: 'Existing Conditions', placeholder: 'e.g. Diabetes, Hypertension' },
              { key: 'medications', label: 'Current Medications',  placeholder: 'e.g. Metformin, Aspirin' },
              { key: 'allergies',   label: 'Allergies',            placeholder: 'e.g. Penicillin, Peanuts' },
              { key: 'surgeries',   label: 'Past Surgeries',       placeholder: 'e.g. Appendectomy' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className={labelCls}>{label}</label>
                <input type="text" className={fieldCls} placeholder={placeholder}
                  value={medForm[key]}
                  onChange={(e) => setMedForm(p => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── FAMILY HISTORY ── */}
      <Card className="border-slate-200/80">
        <SectionHeader
          title="Family Health History"
          icon={
            <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          editing={editingFam}
          onEdit={startEditFam}
          onCancel={() => setEditingFam(false)}
          onSave={saveFam}
          saving={savingFam}
        />

        {!editingFam ? (
          famHist.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Not provided</p>
          ) : (
            <div className="space-y-2">
              {famHist.map((e, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="font-medium text-gray-800">{e.condition_name}</span>
                  {e.relation && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{e.relation}</span>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-400 -mt-2">Add hereditary conditions and the family member affected</p>
            {famRows.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                <div>
                  {i === 0 && <label className={labelCls}>Condition</label>}
                  <select className={fieldCls}
                    value={row.condition} onChange={(e) => updateFamRow(i, 'condition', e.target.value)}>
                    <option value="">Select</option>
                    {CONDITION_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  {i === 0 && <label className={labelCls}>Relation</label>}
                  <select className={fieldCls}
                    value={row.relation} onChange={(e) => updateFamRow(i, 'relation', e.target.value)}>
                    <option value="">Optional</option>
                    {RELATION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <button
                  onClick={() => removeFamRow(i)}
                  disabled={famRows.length === 1}
                  className="px-2 py-2 text-gray-400 hover:text-rose-500 border border-gray-200 rounded-md text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={addFamRow}
              className="w-full text-sm text-gray-500 border border-dashed border-gray-300 rounded-md py-2 hover:border-gray-400 hover:text-gray-700 transition-colors"
            >
              + Add another condition
            </button>
          </div>
        )}
      </Card>

      {/* ── LIFESTYLE & HABITS ── */}
      <Card className="border-slate-200/80">
        <SectionHeader
          title="Lifestyle & Habits"
          icon={
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
          editing={editingLifestyle}
          onEdit={startEditLifestyle}
          onCancel={() => setEditingLifestyle(false)}
          onSave={saveLifestyle}
          saving={savingLifestyle}
        />

        {!editingLifestyle ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5">
            <DisplayRow label="Sleep Duration"    value={displayVal(lifestyle?.sleep_hours, ' hrs')} />
            <DisplayRow label="Sleep Quality"     value={displayVal(lifestyle?.sleep_quality)} />
            <DisplayRow label="Diet Type"         value={displayVal(lifestyle?.diet_type)} />
            <DisplayRow label="Exercise"          value={displayVal(lifestyle?.exercise_frequency)} />
            <DisplayRow label="Water Intake"      value={displayVal(lifestyle?.water_intake_liters, ' L/day')} />
            <DisplayRow label="Stress Level"      value={lifestyle?.stress_level != null ? `${lifestyle.stress_level}/10` : 'Not provided'} />
            <DisplayRow label="Smoking"           value={lifestyle?.smoking != null ? (lifestyle.smoking ? 'Yes' : 'No') : 'Not provided'} />
            <DisplayRow label="Alcohol"           value={lifestyle?.alcohol  != null ? (lifestyle.alcohol  ? 'Yes' : 'No') : 'Not provided'} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Sleep Duration (hrs)</label>
                <input type="number" name="sleep_hours" min="0" max="24" step="0.5" className={fieldCls}
                  placeholder="e.g. 7" value={lifestyleForm.sleep_hours} onChange={handleLifestyleChange} />
              </div>
              <div>
                <label className={labelCls}>Sleep Quality</label>
                <select name="sleep_quality" className={fieldCls}
                  value={lifestyleForm.sleep_quality} onChange={handleLifestyleChange}>
                  <option value="">Select</option>
                  <option value="good">Good</option>
                  <option value="average">Average</option>
                  <option value="poor">Poor</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Diet Type</label>
                <select name="diet_type" className={fieldCls}
                  value={lifestyleForm.diet_type} onChange={handleLifestyleChange}>
                  <option value="">Select</option>
                  <option value="veg">Vegetarian</option>
                  <option value="non-veg">Non-Vegetarian</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Exercise Frequency</label>
                <select name="exercise_frequency" className={fieldCls}
                  value={lifestyleForm.exercise_frequency} onChange={handleLifestyleChange}>
                  <option value="">Select</option>
                  <option value="none">None</option>
                  <option value="weekly">Weekly</option>
                  <option value="regular">Regular</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Water Intake (L/day)</label>
              <input type="number" name="water_intake_liters" min="0" step="0.1" className={fieldCls}
                placeholder="e.g. 2.5" value={lifestyleForm.water_intake_liters} onChange={handleLifestyleChange} />
            </div>
            <div>
              <label className={labelCls}>
                Stress Level <span className="font-semibold text-gray-800">{lifestyleForm.stress_level}</span><span className="text-gray-400">/10</span>
              </label>
              <input type="range" name="stress_level" min="1" max="10" step="1"
                value={lifestyleForm.stress_level} onChange={handleLifestyleChange}
                className="w-full accent-zinc-800" />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Low</span><span>High</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[['smoking', 'Smoking'], ['alcohol', 'Alcohol']].map(([key, label]) => (
                <label key={key} className="flex items-center justify-between px-3 py-2.5 border border-gray-300 rounded-md text-sm cursor-pointer hover:bg-gray-50">
                  {label}
                  <input type="checkbox" name={key} checked={lifestyleForm[key]} onChange={handleLifestyleChange}
                    className="w-4 h-4 accent-zinc-800" />
                </label>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* ── HEALTH METRICS (VITALS) ── */}
      <HealthMetricsSection addNotification={addNotification} />

      {/* ── MEDICAL REPORTS ── */}
      <MedicalReportsSection addNotification={addNotification} />
    </PageFrame>
  );
}
