import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppContext } from '../AppContext';
import { useNotification } from '../NotificationContext';
import { api } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import PageFrame from '../components/PageFrame';
import { symptomOptions } from '../data/symptoms';
import { getSeverityLabel, formattedDate } from '../utils/health';

const FREQUENCY_OPTIONS = ['constant', 'occasional', 'rare'];
const STRUCTURED_SYMPTOM_OPTIONS = [
  ...symptomOptions.map(o => o.value),
  'back pain', 'joint pain', 'sore throat', 'runny nose', 'vomiting', 'anxiety', 'insomnia',
];

const EMPTY_ENTRY = () => ({ symptom_name: '', severity: 5, duration: '', frequency: '', notes: '' });

function StructuredSymptomLog({ onSaved }) {
  const { addNotification } = useNotification();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState([EMPTY_ENTRY()]);
  const [saving, setSaving] = useState(false);

  const update = (i, field, value) =>
    setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e));
  const addEntry    = () => setEntries(prev => [...prev, EMPTY_ENTRY()]);
  const removeEntry = (i) => setEntries(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    const valid = entries.filter(e => e.symptom_name.trim());
    if (!valid.length) {
      addNotification('Enter at least one symptom name', 'error');
      return;
    }
    setSaving(true);
    try {
      await Promise.all(valid.map(e => {
        const payload = { symptom_name: e.symptom_name.trim() };
        if (e.severity)  payload.severity  = Number(e.severity);
        if (e.duration.trim())  payload.duration  = e.duration.trim();
        if (e.frequency) payload.frequency = e.frequency;
        if (e.notes.trim())     payload.notes     = e.notes.trim();
        return api.post('/api/structured-symptoms', payload);
      }));
      addNotification(`${valid.length} structured symptom(s) saved`, 'success');
      setEntries([EMPTY_ENTRY()]);
      if (onSaved) onSaved();
    } catch (e) {
      addNotification(e.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600';
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1';

  return (
    <Card className="border-slate-200/80">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="text-base font-semibold text-gray-800">Structured Symptom Log</span>
          <span className="text-xs text-gray-400 font-normal">— detailed entry for AI analysis</span>
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="mt-5 space-y-5">
          {entries.map((entry, i) => (
            <div key={i} className="p-4 border border-slate-100 rounded-xl bg-slate-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Entry {i + 1}</span>
                {entries.length > 1 && (
                  <button type="button" onClick={() => removeEntry(i)}
                    className="text-xs text-rose-400 hover:text-rose-600 transition-colors">
                    Remove
                  </button>
                )}
              </div>

              {/* Symptom name + frequency */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Symptom Name *</label>
                  <select value={entry.symptom_name} onChange={e => update(i, 'symptom_name', e.target.value)} className={inputCls}>
                    <option value="">Select or type below</option>
                    {STRUCTURED_SYMPTOM_OPTIONS.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                  <input type="text" placeholder="Or type custom symptom"
                    value={STRUCTURED_SYMPTOM_OPTIONS.includes(entry.symptom_name) ? '' : entry.symptom_name}
                    onChange={e => update(i, 'symptom_name', e.target.value)}
                    className={`${inputCls} mt-1.5`} />
                </div>
                <div>
                  <label className={labelCls}>Frequency</label>
                  <select value={entry.frequency} onChange={e => update(i, 'frequency', e.target.value)} className={inputCls}>
                    <option value="">Select</option>
                    {FREQUENCY_OPTIONS.map(f => (
                      <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Severity slider + duration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>
                    Severity <span className="font-semibold text-gray-800">{entry.severity}</span><span className="text-gray-400">/10</span>
                  </label>
                  <input type="range" min="1" max="10" step="1" value={entry.severity}
                    onChange={e => update(i, 'severity', e.target.value)}
                    className="w-full accent-teal-600" />
                  <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                    <span>Mild</span><span>Severe</span>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Duration</label>
                  <input type="text" placeholder="e.g. 3 days, 1 week"
                    value={entry.duration} onChange={e => update(i, 'duration', e.target.value)}
                    className={inputCls} />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={labelCls}>Notes (optional)</label>
                <textarea rows={2} placeholder="Any additional context..."
                  value={entry.notes} onChange={e => update(i, 'notes', e.target.value)}
                  className={`${inputCls} resize-none`} />
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between pt-1">
            <button type="button" onClick={addEntry} disabled={saving}
              className="text-sm text-teal-600 hover:text-teal-700 border border-dashed border-teal-300 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50">
              + Add another symptom
            </button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Structured Log'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function Symptoms() {
  const navigate = useNavigate();
  const { symptoms, addSymptom } = useContext(AppContext);
  const { t, i18n } = useTranslation();
  const { addNotification } = useNotification();
  
  const [currentSymptom, setCurrentSymptom] = useState({
    symptom: '',
    duration: '',
    severity: 4,
    date: new Date().toISOString().split('T')[0],
  });
  
  const [error, setError] = useState('');
  const [isListening, setIsListening] = useState(false);

  // Simulated Voice Input logic
  const handleVoiceInput = () => {
    setIsListening(true);
    addNotification(t('symptoms.notifications.voice_active'), "info");
    
    // Simulate speech-to-text processing bounds over 3 seconds
    setTimeout(() => {
       setCurrentSymptom(prev => ({
         ...prev,
         symptom: 'fever',
         duration: '3',
         severity: 7
       }));
       setIsListening(false);
       addNotification(t('symptoms.notifications.voice_success'), "success");
    }, 3000);
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCurrentSymptom((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const addSymptomHandler = () => {
    if (!currentSymptom.symptom || !currentSymptom.duration || !currentSymptom.date) {
      setError(t('symptoms.errors.incomplete'));
      return;
    }
    if (Number(currentSymptom.duration) <= 0) {
      setError(t('symptoms.errors.duration_min'));
      return;
    }
    addSymptom(currentSymptom)
      .then(() => {
        addNotification(t('symptoms.notifications.log_success', { symptom: currentSymptom.symptom }), 'success');
        setCurrentSymptom({ symptom: '', duration: '', severity: 4, date: new Date().toISOString().split('T')[0] });
      })
      .catch((e) => setError(e.message || t('symptoms.errors.failed')));
  };

  return (
    <PageFrame title={t('symptoms.title')} subtitle={t('symptoms.subtitle')} headAlign="center" maxWidthClass="max-w-4xl">
        <Card className="relative overflow-hidden border-slate-200/80">
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-xl font-semibold">{t('symptoms.add_title')}</h2>
             <button 
                onClick={handleVoiceInput} 
                disabled={isListening}
                className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                  isListening ? 'border-red-500 bg-red-50 text-red-600' : 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50'
                }`}
             >
                {isListening ? (
                  <>
                     <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping"></span>
                     {t('symptoms.listening')}
                  </>
                ) : (
                  <>
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                     {t('symptoms.voice_input')}
                  </>
                )}
             </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('symptoms.type_label')}</label>
              <select
                name="symptom"
                value={currentSymptom.symptom}
                onChange={handleChange}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600"
                disabled={isListening}
              >
                <option value="">{t('symptoms.type_placeholder')}</option>
                {symptomOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {t(`symptoms.options.${item.value}`)}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label={t('symptoms.duration_label')}
              type="number"
              name="duration"
              placeholder={t('symptoms.duration_placeholder')}
              value={currentSymptom.duration}
              onChange={handleChange}
            />
            <Input
              label={t('symptoms.date_label')}
              type="date"
              name="date"
              value={currentSymptom.date}
              onChange={handleChange}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('symptoms.severity_label', { score: currentSymptom.severity, label: getSeverityLabel(currentSymptom.severity, t) })}
              </label>
              <input
                type="range"
                name="severity"
                min="1"
                max="10"
                value={currentSymptom.severity}
                onChange={handleChange}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">{t('symptoms.severity_help')}</p>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button onClick={addSymptomHandler} className="w-full md:w-auto">
                {t('symptoms.submit_btn')}
              </Button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </Card>

        <StructuredSymptomLog />

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
                    <p className="text-sm text-gray-500">{t('symptoms.logged_on', { date: formattedDate(symptom.date, i18n.language) })}</p>
                  </div>
                  <div className="text-gray-600">{t('symptoms.duration_display', { count: symptom.duration })}</div>
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