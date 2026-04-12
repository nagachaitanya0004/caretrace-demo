import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppContext } from '../AppContext';
import { useNotification } from '../NotificationContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import PageFrame from '../components/PageFrame';
import { symptomOptions } from '../data/symptoms';
import { getSeverityLabel, formattedDate } from '../utils/health';

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