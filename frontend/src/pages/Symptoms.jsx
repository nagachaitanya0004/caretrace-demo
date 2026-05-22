import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppContext } from '../AppContext';
import PageFrame from '../components/PageFrame';
import Button from '../components/Button';
import { FieldWrapper } from '../components/FieldWrapper';

const COMMON_SYMPTOMS = [
  'headache', 'fatigue', 'nausea', 'pain', 'anxiety', 'shortness of breath', 'fever'
];

const symptomSchema = z.object({
  symptom: z.string().min(1, 'Please select a symptom'),
  severity: z.number().int().min(1).max(10),
  duration: z.number().int().min(0),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
  frequency: z.enum(['constant', 'occasional', 'rare']).optional(),
});

const springTransition = { type: 'spring', stiffness: 280, damping: 24 };



function Symptoms() {
  const navigate = useNavigate();
  const { addSymptom, symptoms = [] } = useContext(AppContext);



  const { t } = useTranslation();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [pendingData, setPendingData] = useState(null);

  const { control, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(symptomSchema),
    defaultValues: {
      symptom: '',
      severity: 5,
      duration: 1,
      date: new Date().toISOString().split('T')[0],
      notes: '',
      frequency: 'occasional'
    }
  });

  const selectedSymptom = useWatch({ control, name: 'symptom' });
  const severity = useWatch({ control, name: 'severity' });

  const getSeverityColor = (val) => {
    if (val <= 3) return 'var(--app-success, #10b981)';
    if (val <= 6) return 'var(--app-warning, #f59e0b)';
    return 'var(--app-danger, #ef4444)';
  };

  const onSubmit = async (data) => {
    // Duplicate detection
    const todayStr = new Date().toDateString();
    const todayAlreadyLogged = symptoms.some(s =>
      s.symptom === data.symptom &&
      new Date(s.date).toDateString() === todayStr
    );

    if (todayAlreadyLogged && !showDuplicateWarning) {
      setPendingData(data);
      setShowDuplicateWarning(true);
      return;
    }

    await performLog(data);
  };

  const performLog = async (data) => {
    setIsSubmitting(true);
    setShowDuplicateWarning(false);
    
    if (window.navigator.vibrate) window.navigator.vibrate([10, 30, 10]);

    try {
      await addSymptom({
        ...data,
        date: new Date().toISOString(), // Ensure high precision timestamp
      });
      
      setIsSuccess(true);
      setTimeout(() => {
        setShowConfirmation(true);
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
      <form onSubmit={handleSubmit(onSubmit)} className="py-8">
        {/* Step 1: Symptom Selector */}
        <section className="mb-12">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--app-text-disabled)] mb-6 text-center">
            {t('symptoms.step1_label', 'Select Symptom')}
          </h3>
          
          <FieldWrapper error={errors.symptom?.message}>
            <div className="flex flex-wrap justify-center gap-3">
              {COMMON_SYMPTOMS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setValue('symptom', s, { shouldValidate: true });
                    if (window.navigator.vibrate) window.navigator.vibrate(10);
                  }}
                  aria-pressed={selectedSymptom === s}
                  className={`min-h-[44px] px-6 rounded-full text-sm font-semibold transition-all duration-200 border-2 outline-none ${
                    selectedSymptom === s
                      ? 'bg-[var(--app-accent)] border-[var(--app-accent)] text-[var(--brand-accent-on)] shadow-md ring-2 ring-offset-2 ring-offset-[var(--app-bg)] ring-[var(--app-accent)] scale-[1.02]'
                      : 'bg-[var(--app-surface-elevated)] border-[var(--app-border)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface-soft)] hover:border-[var(--app-border-hover)] focus:ring-2 focus:ring-[var(--app-border-hover)] focus:ring-offset-2 focus:ring-offset-[var(--app-bg)]'
                  }`}
                >
                  {t(`symptoms.options.${s}`, s.charAt(0).toUpperCase() + s.slice(1))}
                </button>
              ))}
            </div>
          </FieldWrapper>
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
                <span 
                  className="text-7xl font-bold tracking-tight tabular-nums transition-colors duration-300"
                  style={{ color: getSeverityColor(severity) }}
                >
                  {severity}
                </span>
              </div>

              <div className="relative px-4">
                <Controller
                  name="severity"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      aria-label={t('symptoms.form.severity_label', 'Symptom Severity')}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      className="w-full h-2 bg-[var(--app-border)] rounded-full appearance-none cursor-pointer severity-slider"
                      style={{
                        background: `linear-gradient(to right, ${getSeverityColor(severity)} ${(severity - 1) / 9 * 100}%, var(--app-border) 0%)`
                      }}
                    />
                  )}
                />
              </div>
              
              <div className="flex justify-between px-4 mt-4 text-[10px] font-bold text-[var(--app-text-disabled)] uppercase tracking-widest">
                <span>{t('symptoms.mild', 'Mild')}</span>
                <span>{t('symptoms.severe', 'Severe')}</span>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Step 3: Context */}
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
              
              <FieldWrapper error={errors.notes?.message}>
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <textarea
                      {...field}
                      placeholder={t('symptoms.notes_placeholder', 'What else changed today?')}
                      rows={3}
                      className="w-full bg-[var(--app-surface-elevated)] border border-[var(--app-border)] rounded-2xl p-4 text-sm text-[var(--app-text)] placeholder:text-[var(--app-text-disabled)] focus:outline-none focus:border-[var(--app-accent)] transition-colors resize-none"
                    />
                  )}
                />
              </FieldWrapper>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Submit Button */}
        <AnimatePresence>
          {selectedSymptom && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springTransition, delay: 0.2 }}
              className="mt-12 max-w-sm mx-auto"
            >
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={!isSubmitting ? { y: -2, scale: 1.02 } : {}}
                whileTap={!isSubmitting ? { scale: 0.96 } : {}}
                className={`relative w-full h-16 rounded-full font-bold text-lg overflow-hidden transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[var(--app-ring)] focus:ring-offset-2 focus:ring-offset-[var(--app-bg)] ${
                  isSuccess 
                    ? 'bg-[var(--app-success)] text-[var(--app-success-text)]'
                    : 'bg-[var(--app-accent)] text-[var(--brand-accent-on)] shadow-[0_16px_40px_var(--app-accent-shadow)] hover:shadow-[0_24px_50px_var(--app-accent-shadow)]'
                }`}
              >
                <AnimatePresence mode="wait">
                  {isSuccess ? (
                    <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex justify-center">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                  ) : (
                    <motion.span key="text">
                      {isSubmitting ? t('auth.constructing', 'Loading...') : t('symptoms.submit_btn', 'Log now')}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {/* Duplicate Warning Dialog */}
      <AnimatePresence>
        {showDuplicateWarning && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowDuplicateWarning(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-[32px] p-8 max-w-sm w-full relative z-10 text-center"
            >
              <div className="w-16 h-16 bg-[var(--app-warning-bg)] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-[var(--app-warning)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[var(--app-text)] mb-2">
                {t('symptoms.duplicate_title', 'Already Logged')}
              </h3>
              <p className="text-[var(--app-text-muted)] mb-8 text-sm leading-relaxed">
                {t('symptoms.duplicate_body', 'You already logged this symptom today. Would you like to add another entry?')}
              </p>
              <div className="flex flex-col gap-3">
                <Button intent="cta" onClick={() => performLog(pendingData)}>
                  {t('symptoms.duplicate_confirm', 'Yes, log again')}
                </Button>
                <Button intent="secondary" onClick={() => setShowDuplicateWarning(false)}>
                  {t('common.cancel', 'Cancel')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Final Success Overlay */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 z-[400] bg-[var(--app-bg)] flex flex-col items-center justify-center text-center"
          >
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mb-8">
              <div className="w-24 h-24 rounded-full bg-[var(--app-accent)] flex items-center justify-center shadow-[0_0_60px_var(--app-accent-shadow)]">
                <svg className="w-12 h-12 text-[var(--brand-accent-on)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </motion.div>
            <h2 className="text-6xl font-bold tracking-tighter text-[var(--app-text)] mb-4">
              {t('symptoms.logged_confirm', 'Logged.')}
            </h2>
            <p className="text-lg text-[var(--app-text-tertiary)]">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
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
