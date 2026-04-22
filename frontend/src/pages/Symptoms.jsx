import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppContext } from '../AppContext';
import { useNotification } from '../NotificationContext';
import { useAuth } from '../AuthContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import PageFrame from '../components/PageFrame';
import HealthGoalSelector from '../components/HealthGoalSelector';
import { symptomOptions } from '../data/symptoms';
import { getSeverityLabel, formattedDate } from '../utils/health';
import { api, unwrapApiPayload } from '../services/api';

const FREQUENCY_OPTIONS = ['constant', 'occasional', 'rare'];
const ALL_SYMPTOM_OPTIONS = [
  ...symptomOptions.map(o => o.value),
  'back pain', 'joint pain', 'sore throat', 'runny nose', 'vomiting', 'anxiety', 'insomnia',
];

const EMPTY_FORM = () => ({
  symptom_name:  '',
  severity:      5,
  duration_days: '',
  duration_text: '',
  frequency:     '',
  notes:         '',
  date:          new Date().toISOString().split('T')[0],
});

function Symptoms() {
  const navigate = useNavigate();
  const { symptoms, addSymptom } = useContext(AppContext);
  const { user, setUser } = useAuth();
  const { t, i18n } = useTranslation();
  const { addNotification } = useNotification();

  const [form, setForm]         = useState(EMPTY_FORM());
  const [error, setError]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [healthGoal, setHealthGoal] = useState(user?.health_goal || '');
  const [goalSaving, setGoalSaving] = useState(false);

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleHealthGoalChange = async (goal) => {
    setHealthGoal(goal);
    setGoalSaving(true);
    try {
      const response = await api.put('/api/users/me', { health_goal: goal });
      const updated = unwrapApiPayload(response);
      setUser(updated);
    } catch (e) {
      console.error('Failed to update health goal:', e);
    } finally {
      setGoalSaving(false);
    }
  };

  // Simulated voice input — fills the quick fields
  const handleVoiceInput = () => {
    setIsListening(true);
    addNotification(t('symptoms.notifications.voice_active'), 'info');
    setTimeout(() => {
      setForm(prev => ({ ...prev, symptom_name: 'fever', duration_days: '3', severity: 7 }));
      setIsListening(false);
      addNotification(t('symptoms.notifications.voice_success'), 'success');
    }, 3000);
  };

  const handleSubmit = async () => {
    if (!form.symptom_name.trim()) {
      setError(t('symptoms.errors.incomplete'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await addSymptom({
        symptom:       form.symptom_name.trim(),
        severity:      Number(form.severity),
        duration:      Number(form.duration_days) || 0,
        notes:         form.notes.trim() || undefined,
        frequency:     form.frequency || undefined,
        duration_text: form.duration_text.trim() || undefined,
        date:          form.date || new Date().toISOString(),
      });
      addNotification(t('symptoms.notifications.log_success', { symptom: form.symptom_name }), 'success');
      setForm(EMPTY_FORM());
    } catch (e) {
      setError(e.message || t('symptoms.errors.failed'));
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <PageFrame title={t('symptoms.title')} subtitle={t('symptoms.subtitle')} headAlign="center" maxWidthClass="max-w-4xl">

      {/* ── Health Goal Selector ── */}
      <Card className="border-slate-200/80">
        <HealthGoalSelector value={healthGoal} onChange={handleHealthGoalChange} />
      </Card>

      {/* ── Single unified symptom log form ── */}
      <Card className="relative overflow-hidden border-slate-200/80">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold">{t('symptoms.add_title')}</h2>
          <button
            onClick={handleVoiceInput}
            disabled={isListening}
            className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
              isListening
                ? 'border-red-500 bg-red-50 text-red-600'
                : 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50'
            }`}
          >
            {isListening ? (
              <>
                <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping" />
                {t('symptoms.listening')}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                {t('symptoms.voice_input')}
              </>
            )}
          </button>
        </div>

        {/* Row 1 — Symptom + Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelCls}>{t('symptoms.type_label')} *</label>
            <select
              value={ALL_SYMPTOM_OPTIONS.includes(form.symptom_name) ? form.symptom_name : '__custom__'}
              onChange={e => update('symptom_name', e.target.value === '__custom__' ? '' : e.target.value)}
              disabled={isListening}
              className={inputCls}
            >
              <option value="__custom__">{t('symptoms.type_placeholder')}</option>
              {ALL_SYMPTOM_OPTIONS.map(s => (
                <option key={s} value={s}>{t(`symptoms.options.${s}`, { defaultValue: s.charAt(0).toUpperCase() + s.slice(1) })}</option>
              ))}
            </select>
            {!ALL_SYMPTOM_OPTIONS.includes(form.symptom_name) && (
              <input
                type="text"
                placeholder="Or type a custom symptom…"
                value={form.symptom_name}
                onChange={e => update('symptom_name', e.target.value)}
                disabled={isListening}
                className={`${inputCls} mt-1.5`}
              />
            )}
          </div>
          <div>
            <label className={labelCls}>{t('symptoms.date_label')}</label>
            <input
              type="date"
              value={form.date}
              onChange={e => update('date', e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* Row 2 — Severity + Frequency */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelCls}>
              {t('symptoms.severity_label', { score: form.severity, label: getSeverityLabel(form.severity, t) })}
            </label>
            <input
              type="range"
              min="1" max="10"
              value={form.severity}
              onChange={e => update('severity', e.target.value)}
              className="w-full accent-teal-600 mt-1"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>Mild</span><span>Severe</span>
            </div>
          </div>
          <div>
            <label className={labelCls}>Frequency</label>
            <select
              value={form.frequency}
              onChange={e => update('frequency', e.target.value)}
              className={inputCls}
            >
              <option value="">Select (optional)</option>
              {FREQUENCY_OPTIONS.map(f => (
                <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3 — Duration days + Duration description */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelCls}>{t('symptoms.duration_label')}</label>
            <input
              type="number"
              min="0"
              placeholder={t('symptoms.duration_placeholder')}
              value={form.duration_days}
              onChange={e => update('duration_days', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Duration description</label>
            <input
              type="text"
              placeholder="e.g. since last Monday"
              value={form.duration_text}
              onChange={e => update('duration_text', e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* Row 4 — Notes */}
        <div className="mb-4">
          <label className={labelCls}>Notes (optional)</label>
          <textarea
            rows={2}
            placeholder="Any additional context…"
            value={form.notes}
            onChange={e => update('notes', e.target.value)}
            className={`${inputCls} resize-none`}
          />
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? t('common.saving') : t('symptoms.submit_btn')}
          </Button>
        </div>
      </Card>

      {/* ── Recorded symptoms list ── */}
      {symptoms.length > 0 && (
        <Card>
          <h2 className="text-xl font-semibold mb-4">{t('symptoms.recorded_title')}</h2>
          <div className="space-y-3">
            {symptoms.map((symptom) => (
              <div key={symptom.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-800">
                    {t(`symptoms.options.${symptom.symptom}`, { defaultValue: symptom.symptom })}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-sm text-gray-500">{t('symptoms.logged_on', { date: formattedDate(symptom.date, i18n.language) })}</p>
                    {symptom.context?.frequency && (
                      <span className="text-xs text-teal-700 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded-full capitalize">
                        {symptom.context.frequency}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-gray-600">
                  {symptom.context?.duration_text || t('symptoms.duration_display', { count: symptom.duration })}
                </div>
                <div className="flex justify-start md:justify-end">
                  <Badge variant={getSeverityLabel(symptom.severity).toLowerCase()}>
                    {getSeverityLabel(symptom.severity, t)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="pt-2 text-center">
        {symptoms.length === 0 ? (
          <p className="text-slate-500 text-sm">{t('symptoms.empty_state')}</p>
        ) : (
          <Button onClick={() => navigate('/timeline')} className="bg-gradient-to-r from-teal-600 to-cyan-700 hover:from-teal-700 hover:to-cyan-800">
            {t('dashboard.view_timeline')}
          </Button>
        )}
      </div>
    </PageFrame>
  );
}

export default Symptoms;
