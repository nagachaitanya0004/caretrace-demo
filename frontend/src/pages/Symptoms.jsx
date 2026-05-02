import { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../AppContext';
import { useAuth } from '../AuthContext';
import PageFrame from '../components/PageFrame';
import Button from '../components/Button';

const COMMON_SYMPTOMS = [
  'headache', 'fatigue', 'nausea', 'pain', 'anxiety', 'shortness of breath', 'fever'
];

const springTransition = { type: 'spring', stiffness: 280, damping: 24 };

function Symptoms() {
  const navigate = useNavigate();
  const { addSymptom } = useContext(AppContext);
  const { t } = useTranslation();
  
  const [selectedSymptom, setSelectedSymptom] = useState(null);
  const [severity, setSeverity] = useState(5);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const notesRef = useRef(null);

  const handleSymptomSelect = (symptom) => {
    setSelectedSymptom(symptom);
    // Vibrate if supported (Duolingo style haptics)
    if (window.navigator.vibrate) window.navigator.vibrate(10);
  };

  const handleLog = async () => {
    if (!selectedSymptom) return;
    
    setIsSubmitting(true);
    if (window.navigator.vibrate) window.navigator.vibrate([10, 30, 10]);

    try {
      await addSymptom({
        symptom: selectedSymptom,
        severity: Number(severity),
        notes: notes.trim() || undefined,
        date: new Date().toISOString(),
      });
      
      setIsSuccess(true);
      // Wait for button animation
      setTimeout(() => {
        setShowConfirmation(true);
        // Final transition to dashboard after 1.2s
        setTimeout(() => {
          navigate('/dashboard');
        }, 1200);
      }, 400);
    } catch (error) {
      console.error('Logging failed', error);
      setIsSubmitting(false);
    }
  };

  return (
    <PageFrame 
      title={t('symptoms.title', 'How are you feeling?')} 
      subtitle={t('symptoms.subtitle', 'Log today’s data in seconds.')} 
      headAlign="center" 
      maxWidthClass="max-w-2xl"
    >
      <div className="pb-32 pt-4">
        {/* Step 1: Symptom Selector */}
        <section className="mb-12">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--app-text-disabled)] mb-6 text-center">
            {t('symptoms.step1_label', 'Select Symptom')}
          </h3>
          <div className="flex overflow-x-auto gap-3 pb-4 no-scrollbar -mx-6 px-6">
            {COMMON_SYMPTOMS.map((s) => (
              <button
                key={s}
                onClick={() => handleSymptomSelect(s)}
                aria-pressed={selectedSymptom === s}
                aria-label={`Log ${s}`}
                className={`flex-shrink-0 min-h-[44px] px-6 rounded-full text-sm font-semibold transition-all duration-200 border-2 ${
                  selectedSymptom === s
                    ? 'bg-[#080f1c] border-[var(--app-accent)] text-[var(--app-accent)] shadow-[0_0_20px_rgba(226,255,50,0.15)]'
                    : 'bg-[#080f1c] border-[rgba(255,255,255,0.08)] text-[var(--app-text-muted)] hover:border-[rgba(255,255,255,0.16)]'
                }`}
              >
                {t(`symptoms.options.${s}`, s.charAt(0).toUpperCase() + s.slice(1))}
              </button>
            ))}
          </div>
        </section>

        {/* Step 2: Severity Slider */}
        <AnimatePresence>
          {selectedSymptom && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springTransition}
              className="mb-12 text-center"
            >
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--app-text-disabled)] mb-4">
                {t('symptoms.step2_label', 'Intensity')}
              </h3>
              <div className="mb-6">
                <span className="text-7xl font-bold tracking-tight text-[var(--app-accent)] tabular-nums">
                  {severity}
                </span>
              </div>
              <div className="relative px-4">
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  aria-label="Severity level"
                  aria-valuemin="1"
                  aria-valuemax="10"
                  aria-valuenow={severity}
                  className="w-full h-2 bg-[rgba(255,255,255,0.08)] rounded-full appearance-none cursor-pointer accent-[var(--app-accent)] severity-slider"
                  style={{
                    background: `linear-gradient(to right, var(--app-accent) ${((severity - 1) / 9) * 100}%, rgba(255,255,255,0.08) 0%)`
                  }}
                />
              </div>
              <div className="flex justify-between px-4 mt-4 text-[10px] font-bold text-[var(--app-text-disabled)] uppercase tracking-widest">
                <span>{t('symptoms.mild', 'Mild')}</span>
                <span>{t('symptoms.severe', 'Severe')}</span>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Step 3: Notes */}
        <AnimatePresence>
          {selectedSymptom && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springTransition, delay: 0.1 }}
              className="mb-8"
            >
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--app-text-disabled)] mb-4 text-center">
                {t('symptoms.step3_label', 'Context (Optional)')}
              </h3>
              <textarea
                ref={notesRef}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('symptoms.notes_placeholder', 'What else changed today?')}
                rows={3}
                className="w-full bg-[#080f1c] border border-[rgba(255,255,255,0.08)] rounded-2xl p-4 text-sm text-[var(--app-text)] placeholder:text-[var(--app-text-disabled)] focus:outline-none focus:border-[var(--app-accent)] transition-colors resize-none"
              />
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {/* Step 4: Submit Button (Sticky) */}
      <div className="fixed bottom-0 left-0 right-0 p-6 z-[60] bg-gradient-to-t from-[var(--app-bg)] via-[var(--app-bg)] to-transparent pointer-events-none">
        <div className="max-w-2xl mx-auto pointer-events-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
          <motion.button
            disabled={!selectedSymptom || isSubmitting}
            onClick={handleLog}
            aria-busy={isSubmitting}
            whileHover={selectedSymptom && !isSubmitting ? { y: -2, scale: 1.01 } : {}}
            whileTap={selectedSymptom && !isSubmitting ? { scale: 0.96 } : {}}
            className={`relative w-full h-16 rounded-full font-bold text-lg overflow-hidden transition-all duration-300 ${
              !selectedSymptom 
                ? 'bg-[rgba(255,255,255,0.04)] text-[var(--app-text-disabled)]' 
                : isSuccess 
                  ? 'bg-[var(--app-accent)] text-black'
                  : 'bg-[var(--app-accent)] text-black shadow-[0_28px_80px_rgba(226,255,50,0.25)]'
            }`}
          >
            <AnimatePresence mode="wait">
              {isSuccess ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0.8, 1.1, 1], opacity: 1 }}
                  className="flex items-center justify-center"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              ) : (
                <motion.span key="text" exit={{ opacity: 0, y: -20 }}>
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 bg-black rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-black rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-2 h-2 bg-black rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  ) : (
                    t('symptoms.submit_btn', 'Log now')
                  )}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* Confirmation Overlay */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-[var(--app-bg)] flex flex-col items-center justify-center text-center"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="mb-8"
            >
              <div className="w-24 h-24 rounded-full bg-[var(--app-accent)] flex items-center justify-center shadow-[0_0_60px_rgba(226,255,50,0.3)]">
                <svg className="w-12 h-12 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </motion.div>
            <motion.h2 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-6xl font-bold tracking-tighter text-[var(--app-text)] mb-4"
            >
              {t('symptoms.logged_confirm', 'Logged.')}
            </motion.h2>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-lg text-[var(--app-text-tertiary)]"
            >
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        .severity-slider::-webkit-slider-thumb {
          appearance: none;
          width: 28px;
          height: 28px;
          background: #ffffff;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          border: none;
          transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        
        .severity-slider:active::-webkit-slider-thumb {
          transform: scale(1.2);
        }

        .severity-slider::-moz-range-thumb {
          width: 28px;
          height: 28px;
          background: #ffffff;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          border: none;
          transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
      `}} />
    </PageFrame>
  );
}

export default Symptoms;
