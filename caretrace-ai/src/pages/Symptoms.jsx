import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../AppContext';
import { useLanguage } from '../LanguageContext';
import { useNotification } from '../NotificationContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import { symptomOptions } from '../data/symptoms';
import { getSeverityLabel, formattedDate } from '../utils/health';

function Symptoms() {
  const navigate = useNavigate();
  const { symptoms, addSymptom, isLoading } = useContext(AppContext);
  const { t } = useLanguage();
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
    addNotification("Microphone active... please speak clearly", "info");
    
    // Simulate speech-to-text processing bounds over 3 seconds
    setTimeout(() => {
       setCurrentSymptom(prev => ({
         ...prev,
         symptom: 'fever',
         duration: '3',
         severity: 7
       }));
       setIsListening(false);
       addNotification("Voice successfully transcribed: 'I had a strong fever for 3 days'", "success");
    }, 3000);
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCurrentSymptom((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const addSymptomHandler = () => {
    if (!currentSymptom.symptom || !currentSymptom.duration || !currentSymptom.date) {
      setError('Please complete all fields to log your symptom.');
      return;
    }
    if (Number(currentSymptom.duration) <= 0) {
      setError('Duration must be at least 1 day.');
      return;
    }
    addSymptom(currentSymptom)
      .then(() => {
        addNotification(`Logged ${currentSymptom.symptom} successfully!`, 'success');
        setCurrentSymptom({ symptom: '', duration: '', severity: 4, date: new Date().toISOString().split('T')[0] });
      })
      .catch((e) => setError(e.message || "Failed tracking."));
  };

  return (
    <div className="min-h-screen bg-blue-50 p-4 fade-in">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">Track Your Symptoms</h1>
        <p className="text-gray-600 mb-8 text-center">Help us understand how you're feeling by logging your symptoms.</p>
        <Card className="mb-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-xl font-semibold">Add a Symptom</h2>
             <button 
                onClick={handleVoiceInput} 
                disabled={isListening}
                className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                  isListening ? 'border-red-500 bg-red-50 text-red-600' : 'border-blue-200 bg-white text-blue-600 hover:bg-blue-50'
                }`}
             >
                {isListening ? (
                  <>
                     <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping"></span>
                     Listening...
                  </>
                ) : (
                  <>
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                     Voice Input
                  </>
                )}
             </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Symptom Type</label>
              <select
                name="symptom"
                value={currentSymptom.symptom}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isListening}
              >
                <option value="">Choose a symptom</option>
                {symptomOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Duration (days)"
              type="number"
              name="duration"
              placeholder="Enter duration"
              value={currentSymptom.duration}
              onChange={handleChange}
            />
            <Input
              label="Date"
              type="date"
              name="date"
              value={currentSymptom.date}
              onChange={handleChange}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Severity: {currentSymptom.severity} ({getSeverityLabel(currentSymptom.severity)})
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
              <p className="text-xs text-gray-500 mt-1">1 = Mild, 10 = Severe</p>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button onClick={addSymptomHandler} className="w-full md:w-auto">
                Add Symptom
              </Button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </Card>

        {symptoms.length > 0 && (
          <Card>
            <h2 className="text-xl font-semibold mb-4">Your Recorded Symptoms</h2>
            <div className="space-y-3">
              {symptoms.map((symptom) => (
                <div key={symptom.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold capitalize text-gray-800">{symptom.symptom}</p>
                    <p className="text-sm text-gray-500">Logged on {formattedDate(symptom.date)}</p>
                  </div>
                  <div className="text-gray-600">Duration: {symptom.duration} day(s)</div>
                  <div className="flex justify-start md:justify-end">
                    <Badge variant={getSeverityLabel(symptom.severity).toLowerCase()}>
                      {getSeverityLabel(symptom.severity)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="mt-8 text-center">
          {symptoms.length === 0 ? (
            <p className="text-gray-500 mb-4">Please add at least one symptom to continue.</p>
          ) : (
            <Button onClick={() => navigate('/timeline')}>View Timeline</Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Symptoms;