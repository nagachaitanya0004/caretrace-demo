import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { useNotification } from '../NotificationContext';
import { api, unwrapApiPayload } from '../services/api';
import PageFrame from '../components/PageFrame';
import Card from '../components/Card';
import Button from '../components/Button';
import HealthMetricsSection from '../components/HealthMetricsSection';
import MedicalReportsSection from '../components/MedicalReportsSection';
import Badge from '../components/Badge';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const CONDITION_OPTIONS = ['Diabetes', 'Heart Disease', 'Hypertension', 'Cancer', 'Stroke', 'Asthma', 'Other'];
const RELATION_OPTIONS  = ['Father', 'Mother', 'Sibling', 'Grandparent', 'Other'];

// ── helpers ──────────────────────────────────────────────────────────────────

function val(v) {
  return v !== null && v !== undefined && v !== '' ? v : null;
}

function parseList(str) {
  return (str || '').split(',').map((s) => s.trim()).filter(Boolean);
}

function getBMICategory(bmiValue) {
  const v = parseFloat(bmiValue);
  if (!v || isNaN(v)) return null;
  if (v < 18.5) return { label: 'Underweight', intent: 'info' };
  if (v < 25)   return { label: 'Normal',      intent: 'success' };
  if (v < 30)   return { label: 'Overweight',  intent: 'warning' };
  return { label: 'Obese', intent: 'danger' };
}

// ── icons ────────────────────────────────────────────────────────────────────

const icons = {
  user: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  clipboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  family: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  bolt: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  edit: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
    </svg>
  ),
  plus: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  age: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  gender: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  height: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7v12m0 0l-3-3m3 3l3-3m8-9v12m0 0l-3-3m3 3l3-3M3 12h18" />
    </svg>
  ),
  weight: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    </svg>
  ),
  blood: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 2C12 2 6 10 6 14a6 6 0 1012 0c0-4-6-12-6-12z" />
    </svg>
  ),
  bmi: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  sleep: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  ),
  diet: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  water: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  ),
  activity: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  smoking: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M18 12h2.25m-16.5 0h12m1.5-6v12M3 18h18" />
    </svg>
  ),
  alcohol: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 21a9.003 9.003 0 008.354-5.646 9.003 9.003 0 00-16.708 0A9.003 9.003 0 0012 21zM6 3h12" />
    </svg>
  ),
};

// ── sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title, icon, iconColor = 'text-[var(--app-text-muted)]', editing, onEdit, onCancel, onSave, saving }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--app-surface-soft)] ${iconColor} transition-colors duration-200`}>
          {icon}
        </div>
        <h2 className="text-base font-semibold text-[var(--app-text)] tracking-[-0.01em]">{title}</h2>
      </div>
      {!editing ? (
        <Button intent="ghost" size="sm" onClick={onEdit} className="gap-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-text)]">
          {icons.edit}
          Edit
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button intent="ghost" size="sm" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button intent="primary" size="sm" onClick={onSave} loading={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      )}
    </div>
  );
}

function DemographicsTile({ label, value, suffix = '', icon, isEmpty, children }) {
  const display = children || (isEmpty ? null : `${value}${suffix}`);
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--app-surface-soft)] border border-[var(--app-border-soft)] transition-all duration-150 hover:border-[var(--app-border)] hover:bg-[var(--app-surface-elevated)] group">
      <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--app-input-bg)] text-[var(--app-text-muted)] group-hover:text-[var(--brand-accent)] shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-colors duration-150">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <span className="block text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--app-text-disabled)] mb-0.5">
          {label}
        </span>
        {isEmpty ? (
          <span className="text-sm font-medium text-[var(--app-text-disabled)] italic">—</span>
        ) : (
          <span className="text-sm font-semibold text-[var(--app-text)] truncate block">{display}</span>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon, text, onAction, actionLabel = 'Add' }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 gap-3">
      <div className="w-10 h-10 rounded-xl bg-[var(--app-surface-soft)] flex items-center justify-center text-[var(--app-text-disabled)]">
        {icon}
      </div>
      <p className="text-sm text-[var(--app-text-disabled)] text-center max-w-xs">{text}</p>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[var(--app-text-muted)] border border-dashed border-[var(--app-border)] rounded-xl hover:border-[var(--brand-accent)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-soft)] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]"
        >
          {icons.plus}
          {actionLabel}
        </button>
      )}
    </div>
  );
}

const fieldCls =
  'w-full px-3 py-2.5 bg-[var(--app-input-bg)] text-[var(--app-text)] ' +
  'border border-[var(--app-input-border)] rounded-xl text-sm ' +
  'transition-all duration-150 ' +
  'hover:border-[var(--app-border-hover)] ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:border-[var(--brand-accent)]';
const labelCls = 'block text-[10px] font-semibold text-[var(--app-text-disabled)] uppercase tracking-[0.08em] mb-1.5';

// ── main page ─────────────────────────────────────────────────────────────────

export default function HealthProfile() {
  const { user } = useAuth();
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
  const [basicForm,     setBasicForm]     = useState({ age: '', gender: '', height_cm: '', weight_kg: '', blood_group: '' });
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
    });
    setEditingBasic(true);
  };

  const startEditMed = () => {
    setMedForm({
      conditions:  (medHist?.conditions  || []).join(', '),
      medications: (medHist?.medications || []).join(', '),
      allergies:   (medHist?.allergies   || []).join(', '),
      surgeries:   (medHist?.surgeries   || []).join(', '),
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
      payload.conditions  = parseList(medForm.conditions);
      payload.medications = parseList(medForm.medications);
      payload.allergies   = parseList(medForm.allergies);
      payload.surgeries   = parseList(medForm.surgeries);
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
      
      // Auto-sync User Profile lifestyle field to prevent visual duplication
      let userLifestyle = 'sedentary';
      if (payload.smoking) {
        userLifestyle = 'smoker';
      } else if (payload.exercise_frequency === 'regular' || payload.exercise_frequency === 'weekly') {
        userLifestyle = 'active';
      }
      
      const userRes = await api.put('/api/users/me', { lifestyle: userLifestyle });
      setProfile(unwrapApiPayload(userRes) || profile);

      setEditingLifestyle(false);
      addNotification('Lifestyle data updated', 'success');
    } catch (e) {
      addNotification(e.message || 'Failed to save', 'error');
    } finally {
      setSavingLifestyle(false);
    }
  };

  // ── derived BMI ──
  const bmi = (() => {
    const h = parseFloat(editingBasic ? basicForm.height_cm : profile?.height_cm);
    const w = parseFloat(editingBasic ? basicForm.weight_kg : profile?.weight_kg);
    if (h > 0 && w > 0) return (w / (h / 100) ** 2).toFixed(1);
    return profile?.bmi ? String(profile.bmi) : null;
  })();

  const bmiCategory = getBMICategory(bmi);

  // ── derived lifestyle helpers ──

  // ── loading state ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-[var(--app-border)] border-t-[var(--brand-accent)] rounded-full animate-spin" />
          <p className="text-xs text-[var(--app-text-disabled)] font-medium">Loading profile…</p>
        </div>
      </div>
    );
  }

  // ── user display info ──
  const userName = user?.name || user?.email?.split('@')[0] || 'User';
  const userInitials = userName.slice(0, 2).toUpperCase();

  return (
    <PageFrame
      title="Health Profile"
      subtitle="Your comprehensive health record — view and update anytime"
      maxWidthClass="max-w-5xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT COLUMN: Profile & Demographics (Unified Card) */}
        <div className="lg:col-span-1 space-y-6">
          {/* UNIFIED PROFILE & BASIC INFO CARD */}
          <Card elevation={1} className="relative overflow-hidden">
            {/* Ambient theme background glow at top of card */}
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[var(--app-accent-soft)] to-transparent pointer-events-none" />

            <div className="relative flex flex-col items-center text-center pb-6 border-b border-[var(--app-border-soft)]">
              {/* Clean, clinical Avatar container */}
              <div className="relative mb-3.5">
                <div className="w-20 h-20 rounded-full bg-[var(--app-surface-soft)] text-[var(--brand-accent)] border border-[var(--app-border)] flex items-center justify-center text-2xl font-bold shadow-[var(--shadow-l1)]">
                  {userInitials}
                </div>
              </div>

              {/* Name & Email */}
              <h2 className="text-lg font-extrabold text-[var(--app-text)] tracking-[-0.03em] leading-tight truncate max-w-full">{userName}</h2>
              <p className="text-xs text-[var(--app-text-muted)] font-medium truncate max-w-full mt-1">{user?.email || ''}</p>
            </div>

            <div className="pt-6">
              {/* Card Header for Demographics */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-[var(--app-text-disabled)] uppercase tracking-[0.08em]">Demographics</h3>
                {!editingBasic ? (
                  <Button intent="ghost" size="sm" onClick={startEditBasic} className="gap-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-text)]">
                    {icons.edit}
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button intent="ghost" size="sm" onClick={() => setEditingBasic(false)} disabled={savingBasic}>Cancel</Button>
                    <Button intent="primary" size="sm" onClick={saveBasic} loading={savingBasic}>
                      {savingBasic ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                )}
              </div>

              {!editingBasic ? (
                <div className="grid grid-cols-1 gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <DemographicsTile label="Age" value={profile?.age} suffix=" yrs" icon={icons.age} isEmpty={val(profile?.age) == null} />
                    <DemographicsTile label="Gender" value={profile?.gender} icon={icons.gender} isEmpty={val(profile?.gender) == null} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <DemographicsTile label="Height" value={profile?.height_cm} suffix=" cm" icon={icons.height} isEmpty={val(profile?.height_cm) == null} />
                    <DemographicsTile label="Weight" value={profile?.weight_kg} suffix=" kg" icon={icons.weight} isEmpty={val(profile?.weight_kg) == null} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <DemographicsTile label="Blood Group" value={profile?.blood_group} icon={icons.blood} isEmpty={val(profile?.blood_group) == null} />
                    <DemographicsTile label="BMI" icon={icons.bmi} isEmpty={!bmi}>
                      {bmi && (
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-bold text-[var(--app-text)] shrink-0">{bmi}</span>
                          {bmiCategory && (
                            <Badge
                              variant={bmiCategory.intent}
                              className={bmiCategory.intent === 'success' ? 'border border-green-200/60 dark:border-green-900/30 text-[10px]' : 'text-[10px]'}
                            >
                              {bmiCategory.label}
                            </Badge>
                          )}
                        </div>
                      )}
                    </DemographicsTile>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-[fadeIn_0.15s_ease-out]">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="basic-age" className={labelCls}>Age</label>
                      <input id="basic-age" type="number" min="1" max="120" className={fieldCls}
                        placeholder="e.g. 28"
                        value={basicForm.age} onChange={(e) => setBasicForm(p => ({ ...p, age: e.target.value }))} />
                    </div>
                    <div>
                      <label htmlFor="basic-gender" className={labelCls}>Gender</label>
                      <select id="basic-gender" className={fieldCls}
                        value={basicForm.gender} onChange={(e) => setBasicForm(p => ({ ...p, gender: e.target.value }))}>
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="basic-height" className={labelCls}>Height (cm)</label>
                      <input id="basic-height" type="number" min="1" step="0.1" className={fieldCls}
                        placeholder="e.g. 175"
                        value={basicForm.height_cm} onChange={(e) => setBasicForm(p => ({ ...p, height_cm: e.target.value }))} />
                    </div>
                    <div>
                      <label htmlFor="basic-weight" className={labelCls}>Weight (kg)</label>
                      <input id="basic-weight" type="number" min="1" step="0.1" className={fieldCls}
                        placeholder="e.g. 70"
                        value={basicForm.weight_kg} onChange={(e) => setBasicForm(p => ({ ...p, weight_kg: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                      <label htmlFor="basic-blood" className={labelCls}>Blood Group</label>
                      <select id="basic-blood" className={fieldCls}
                        value={basicForm.blood_group} onChange={(e) => setBasicForm(p => ({ ...p, blood_group: e.target.value }))}>
                        <option value="">Select</option>
                        {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                      </select>
                    </div>
                    {bmi && (
                      <div className="flex items-center justify-between px-3.5 h-[41px] rounded-xl bg-[var(--app-surface-soft)] border border-[var(--app-border-soft)]">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">BMI: <span className="text-sm font-bold text-[var(--app-text)] ml-1">{bmi}</span></span>
                        {bmiCategory && (
                          <Badge
                            variant={bmiCategory.intent}
                            className={bmiCategory.intent === 'success' ? 'border border-green-200/60 dark:border-green-900/30 text-[10px]' : 'text-[10px]'}
                          >
                            {bmiCategory.label}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* HEALTH METRICS (VITALS) */}
          <HealthMetricsSection />
        </div>

        {/* RIGHT COLUMN: Medical Info, Lifestyle, Reports (Unified Flow) */}
        <div className="lg:col-span-2 space-y-6">
          {/* ═══════════════ MEDICAL HISTORY ═══════════════ */}
          <Card elevation={1}>
            <SectionHeader
              title="Medical History"
              icon={icons.clipboard}
              iconColor="text-[var(--brand-accent)]"
              editing={editingMed}
              onEdit={startEditMed}
              onCancel={() => setEditingMed(false)}
              onSave={saveMed}
              saving={savingMed}
            />

            {!editingMed ? (
              <div className="space-y-6">
                {[
                  { 
                    label: 'Existing Conditions', 
                    items: medHist?.conditions, 
                    emptyText: 'No existing conditions recorded',
                    chipStyle: 'bg-[var(--app-surface-soft)] text-[var(--app-text)] border-[var(--app-border-soft)] hover:border-zinc-300 dark:hover:border-zinc-700',
                    icon: (
                      <svg className="w-3.5 h-3.5 text-[var(--app-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    )
                  },
                  { 
                    label: 'Current Medications', 
                    items: medHist?.medications, 
                    emptyText: 'No medications listed',
                    chipStyle: 'bg-[var(--app-surface-soft)] text-[var(--app-text)] border-[var(--app-border-soft)] hover:border-zinc-300 dark:hover:border-zinc-700',
                    icon: (
                      <svg className="w-3.5 h-3.5 text-[var(--app-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    )
                  },
                  { 
                    label: 'Allergies', 
                    items: medHist?.allergies, 
                    emptyText: 'No known allergies',
                    chipStyle: 'bg-[var(--app-danger-bg)] text-[var(--app-danger-text)] border-[var(--app-danger-border)] hover:border-rose-400',
                    icon: (
                      <svg className="w-3.5 h-3.5 text-[var(--app-danger)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    )
                  },
                  { 
                    label: 'Past Surgeries', 
                    items: medHist?.surgeries, 
                    emptyText: 'No surgeries recorded',
                    chipStyle: 'bg-[var(--app-surface-soft)] text-[var(--app-text)] border-[var(--app-border-soft)] hover:border-zinc-300 dark:hover:border-zinc-700',
                    icon: (
                      <svg className="w-3.5 h-3.5 text-[var(--app-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 11-4.243 4.243 3 3 0 014.243-4.243zm0-5.758a3 3 0 11-4.243-4.243 3 3 0 014.243 4.243z" />
                      </svg>
                    )
                  },
                ].map(({ label, items, emptyText, chipStyle, icon }) => (
                  <div key={label} className="border-b border-[var(--app-border-soft)] last:border-0 pb-4 last:pb-0">
                    <div className="flex items-center gap-2 mb-2">
                      {icon}
                      <span className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-[var(--app-text-muted)]">
                        {label}
                      </span>
                    </div>
                    {items && items.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {items.map((item, i) => (
                          <span
                            key={`${item}-${i}`}
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all duration-150 ${chipStyle}`}
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--app-text-disabled)] italic ml-5.5">{emptyText}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4 animate-[fadeIn_0.15s_ease-out]">
                <p className="text-xs text-[var(--app-text-disabled)] -mt-2 mb-1">Separate multiple entries with commas</p>
                {[
                  { key: 'conditions',  label: 'Existing Conditions', placeholder: 'e.g. Diabetes, Hypertension' },
                  { key: 'medications', label: 'Current Medications',  placeholder: 'e.g. Metformin, Aspirin' },
                  { key: 'allergies',   label: 'Allergies',            placeholder: 'e.g. Penicillin, Peanuts' },
                  { key: 'surgeries',   label: 'Past Surgeries',       placeholder: 'e.g. Appendectomy' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label htmlFor={`med-${key}`} className={labelCls}>{label}</label>
                    <input id={`med-${key}`} type="text" className={fieldCls} placeholder={placeholder}
                      value={medForm[key]}
                      onChange={(e) => setMedForm(p => ({ ...p, [key]: e.target.value }))} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* ═══════════════ FAMILY HEALTH HISTORY ═══════════════ */}
          <Card elevation={1}>
            <SectionHeader
              title="Family Health History"
              icon={icons.family}
              iconColor="text-[var(--app-danger)]"
              editing={editingFam}
              onEdit={startEditFam}
              onCancel={() => setEditingFam(false)}
              onSave={saveFam}
              saving={savingFam}
            />

            {!editingFam ? (
              famHist.length === 0 ? (
                <EmptyState
                  icon={icons.family}
                  text="No family health history recorded yet. Adding hereditary conditions helps us provide better insights."
                  onAction={startEditFam}
                  actionLabel="Add family history"
                />
              ) : (
                <div className="space-y-2.5">
                  {famHist.map((e, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--app-surface-soft)] border border-[var(--app-border-soft)] transition-colors duration-150 hover:border-[var(--app-border)]"
                    >
                      <span className="text-sm font-medium text-[var(--app-text)]">{e.condition_name}</span>
                      {e.relation && (
                        <Badge variant="default">{e.relation}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="space-y-3 animate-[fadeIn_0.15s_ease-out]">
                <p className="text-xs text-[var(--app-text-disabled)] -mt-2">Add hereditary conditions and the family member affected</p>
                {famRows.map((row, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                    <div>
                      {i === 0 && <label className={labelCls}>Condition</label>}
                      <select className={fieldCls}
                        value={row.condition} onChange={(e) => updateFamRow(i, 'condition', e.target.value)}>
                        <option value="">Select condition</option>
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
                      className="flex items-center justify-center w-10 h-10 text-[var(--app-text-muted)] hover:text-[var(--app-danger)] hover:bg-[var(--app-danger-bg)] border border-[var(--app-border)] rounded-xl text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
                      title="Remove"
                      aria-label="Remove row"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
                <button
                  onClick={addFamRow}
                  className="w-full text-sm font-medium text-[var(--app-text-muted)] border border-dashed border-[var(--app-border)] rounded-xl py-2.5 hover:border-[var(--brand-accent)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-soft)] transition-all duration-200"
                >
                  + Add another condition
                </button>
              </div>
            )}
          </Card>

          {/* ═══════════════ LIFESTYLE & HABITS ═══════════════ */}
          <Card elevation={1}>
            <SectionHeader
              title="Lifestyle & Habits"
              icon={icons.bolt}
              iconColor="text-[var(--app-warning)]"
              editing={editingLifestyle}
              onEdit={startEditLifestyle}
              onCancel={() => setEditingLifestyle(false)}
              onSave={saveLifestyle}
              saving={savingLifestyle}
            />

            {!editingLifestyle ? (
              <div className="space-y-6">
                {/* Data grid of tiles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DemographicsTile label="Sleep Duration" value={lifestyle?.sleep_hours} suffix=" hrs" icon={icons.sleep} isEmpty={val(lifestyle?.sleep_hours) == null} />
                  <DemographicsTile label="Sleep Quality" value={lifestyle?.sleep_quality} icon={icons.sleep} isEmpty={val(lifestyle?.sleep_quality) == null} />
                  <DemographicsTile label="Diet Type" value={lifestyle?.diet_type} icon={icons.diet} isEmpty={val(lifestyle?.diet_type) == null} />
                  <DemographicsTile label="Exercise" value={lifestyle?.exercise_frequency} icon={icons.activity} isEmpty={val(lifestyle?.exercise_frequency) == null} />
                  <DemographicsTile label="Water Intake" value={lifestyle?.water_intake_liters} suffix=" L/day" icon={icons.water} isEmpty={val(lifestyle?.water_intake_liters) == null} />
                  <DemographicsTile label="Stress Level" value={lifestyle?.stress_level ? `${lifestyle.stress_level}/10` : null} icon={icons.bolt} isEmpty={val(lifestyle?.stress_level) == null} />
                </div>

                {/* Smoking/Alcohol status cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { 
                      label: 'Smoking Status', 
                      value: lifestyle?.smoking, 
                      icon: icons.smoking,
                      activeColor: 'text-[var(--app-text)] bg-[var(--app-surface-soft)] border-[var(--app-border)] hover:bg-[var(--app-surface-elevated)]',
                      inactiveColor: 'text-[var(--app-text)] bg-[var(--app-surface-soft)] border-[var(--app-border-soft)] hover:bg-[var(--app-surface-elevated)]',
                      emptyColor: 'bg-[var(--app-surface-soft)] border-[var(--app-border-soft)] text-[var(--app-text-disabled)]'
                    },
                    { 
                      label: 'Alcohol Consumption', 
                      value: lifestyle?.alcohol, 
                      icon: icons.alcohol,
                      activeColor: 'text-[var(--app-text)] bg-[var(--app-surface-soft)] border-[var(--app-border)] hover:bg-[var(--app-surface-elevated)]',
                      inactiveColor: 'text-[var(--app-text)] bg-[var(--app-surface-soft)] border-[var(--app-border-soft)] hover:bg-[var(--app-surface-elevated)]',
                      emptyColor: 'bg-[var(--app-surface-soft)] border-[var(--app-border-soft)] text-[var(--app-text-disabled)]'
                    },
                  ].map(({ label, value: v, icon, activeColor, inactiveColor, emptyColor }) => {
                    const statusClass = v == null ? emptyColor : v ? activeColor : inactiveColor;
                    const text = v == null ? 'Not provided' : v ? 'Yes / Active' : 'No / None';
                    return (
                      <div key={label} className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border transition-all duration-150 ${statusClass}`}>
                        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--app-input-bg)] text-[var(--app-text-muted)] shadow-[0_1px_3px_rgba(0,0,0,0.02)] shrink-0">
                          {icon}
                        </div>
                        <div className="min-w-0">
                          <span className="block text-[9px] font-bold uppercase tracking-[0.1em] opacity-70 mb-0.5">{label}</span>
                          <span className="text-sm font-bold truncate">{text}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-[fadeIn_0.15s_ease-out]">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="lifestyle-sleep" className={labelCls}>Sleep Duration (hrs)</label>
                    <input id="lifestyle-sleep" type="number" name="sleep_hours" min="0" max="24" step="0.5" className={fieldCls}
                      placeholder="e.g. 7" value={lifestyleForm.sleep_hours} onChange={handleLifestyleChange} />
                  </div>
                  <div>
                    <label htmlFor="lifestyle-quality" className={labelCls}>Sleep Quality</label>
                    <select id="lifestyle-quality" name="sleep_quality" className={fieldCls}
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
                  <label htmlFor="lifestyle-water" className={labelCls}>Water Intake (L/day)</label>
                  <input id="lifestyle-water" type="number" name="water_intake_liters" min="0" step="0.1" className={fieldCls}
                    placeholder="e.g. 2.5" value={lifestyleForm.water_intake_liters} onChange={handleLifestyleChange} />
                </div>
                <div>
                  <label htmlFor="lifestyle-stress" className={labelCls}>
                    Stress Level{' '}
                    <span className="font-semibold text-[var(--app-text)]">{lifestyleForm.stress_level}</span>
                    <span className="text-[var(--app-text-disabled)]">/10</span>
                  </label>
                  <input id="lifestyle-stress" type="range" name="stress_level" min="1" max="10" step="1"
                    value={lifestyleForm.stress_level} onChange={handleLifestyleChange}
                    className="w-full accent-[var(--brand-accent)]" />
                  <div className="flex justify-between text-[10px] text-[var(--app-text-disabled)] mt-1 font-medium">
                    <span>Low</span><span>High</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[['smoking', 'Smoking'], ['alcohol', 'Alcohol']].map(([key, label]) => (
                    <label key={key} className="flex items-center justify-between px-4 py-3 border border-[var(--app-border)] rounded-xl text-sm text-[var(--app-text)] cursor-pointer hover:bg-[var(--app-surface-soft)] transition-all duration-150">
                      {label}
                      <input type="checkbox" name={key} checked={lifestyleForm[key]} onChange={handleLifestyleChange}
                        className="w-4 h-4 rounded accent-[var(--brand-accent)]" />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* ═══════════════ MEDICAL REPORTS ═══════════════ */}
          <MedicalReportsSection />
        </div>
      </div>
    </PageFrame>
  );
}
