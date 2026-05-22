import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { AppContext } from '../AppContext';
import Card from '../components/Card';
import Button from '../components/Button';
import PageFrame from '../components/PageFrame';

const SEVERITY_CONFIG = {
  critical: {
    border: 'border-l-[var(--app-danger)]',
    text: 'text-[var(--app-danger)]',
    bg: 'bg-[var(--app-danger-bg)]',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )
  },
  warning: {
    border: 'border-l-[var(--app-warning)]',
    text: 'text-[var(--app-warning)]',
    bg: 'bg-[var(--app-warning-bg)]',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  info: {
    border: 'border-l-[var(--app-info)]',
    text: 'text-[var(--app-info)]',
    bg: 'bg-[var(--app-info-bg)]',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
};

function Alerts() {
  const navigate = useNavigate();
  const { alerts, hasAlert, markAlertRead } = useContext(AppContext);
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();

  const motionFade = shouldReduceMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, ease: 'easeOut' } };

  const handleMarkRead = async (id) => {
    try {
      await markAlertRead(id);
    } catch (err) {
      console.error('Failed to mark alert as read', err);
    }
  };

  return (
    <PageFrame 
      title={t('alerts.title')} 
      subtitle={t('alerts.subtitle')} 
      headAlign="center" 
      maxWidthClass="max-w-3xl"
    >
      {hasAlert() ? (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {alerts.map((alert) => {
              const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
              const isRead = alert.is_read;

              return (
                <motion.div
                  key={alert.id}
                  layout
                  initial={motionFade.initial}
                  animate={{ 
                    ...motionFade.animate,
                    opacity: isRead ? 0.6 : (motionFade.animate?.opacity ?? 1) 
                  }}
                  transition={motionFade.transition}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card
                    elevation={isRead ? 0 : 1}
                    className={`relative overflow-hidden border-l-4 transition-all duration-300 ${config.border}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-[var(--radius-lg)] border border-transparent flex items-center justify-center ${config.bg} ${config.text}`}>
                        {config.icon}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className={`text-base font-semibold ${isRead ? 'text-[var(--app-text-muted)]' : 'text-[var(--app-text)]'}`}>
                            {alert.symptom
                              ? t(`symptoms.options.${alert.symptom}`, { defaultValue: alert.symptom.charAt(0).toUpperCase() + alert.symptom.slice(1) })
                              : t('alerts.health_alert')}
                          </h3>
                          <span className="text-[10px] font-medium text-[var(--app-text-disabled)] uppercase tracking-wider">
                            {new Date(alert.timestamp || alert.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <p className={`mt-2 text-sm leading-relaxed ${isRead ? 'text-[var(--app-text-tertiary)]' : 'text-[var(--app-text-muted)]'}`}>
                          {alert.message}
                        </p>
                        
                        {!isRead && (
                          <div className="mt-4 flex justify-end">
                            <Button
                              intent="ghost"
                              size="sm"
                              onClick={() => handleMarkRead(alert.id)}
                            >
                              {t('alerts.mark_read', 'Mark as read')}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <Card elevation={1} className="text-center">
          <div className="py-12 px-4">
            <div className="mx-auto w-14 h-14 rounded-[var(--radius-xl)] bg-[var(--app-success-bg)] border border-[var(--color-success-border)] flex items-center justify-center mb-4">
              <svg className="h-7 w-7 text-[var(--app-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--app-text)]">{t('alerts.empty.title')}</h3>
            <p className="mt-2 text-sm text-[var(--app-text-muted)] max-w-md mx-auto">{t('alerts.empty.body')}</p>
          </div>
        </Card>
      )}

      <div className="pt-8 text-center space-y-6">
        <p className="text-xs text-[var(--app-text-disabled)] max-w-xl mx-auto leading-relaxed">
          {t('alerts.footer_disclaimer')}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button intent="secondary" onClick={() => navigate('/dashboard')}>
            {t('common.back_to_dashboard', 'Dashboard')}
          </Button>
          <Button intent="cta" onClick={() => navigate('/recommendations')}>
            {t('alerts.view_recommendations')}
          </Button>
        </div>
      </div>
    </PageFrame>
  );
}

export default Alerts;
