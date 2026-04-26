import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { AppContext } from '../AppContext';
import Card from '../components/Card';
import Button from '../components/Button';
import PageFrame from '../components/PageFrame';

function Alerts() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { alerts, hasAlert } = useContext(AppContext);

  return (
    <PageFrame title={t('alerts.title')} subtitle={t('alerts.subtitle')} headAlign="center" maxWidthClass="max-w-4xl">
      {hasAlert() ? (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <Card
              key={alert.id}
              elevation={1}
              className="border-l-4 border-l-amber-500"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-[var(--radius-lg)] bg-amber-500/10 flex items-center justify-center">
                  <svg className="h-5 w-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-[var(--app-text)]">
                    {alert.symptom
                      ? t(`symptoms.options.${alert.symptom}`, { defaultValue: alert.symptom })
                      : t('alerts.health_alert')}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--app-text-muted)] leading-relaxed">{alert.message}</p>
                  <p className="mt-3 text-xs text-[var(--app-text-disabled)] font-medium">{t('alerts.consult_reminder')}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card elevation={1} className="text-center">
          <div className="py-12 px-4">
            <div className="mx-auto w-14 h-14 rounded-[var(--radius-xl)] bg-emerald-500/10 flex items-center justify-center mb-4">
              <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--app-text)]">{t('alerts.empty.title')}</h3>
            <p className="mt-2 text-sm text-[var(--app-text-muted)] max-w-md mx-auto">{t('alerts.empty.body')}</p>
          </div>
        </Card>
      )}

      <div className="pt-4 text-center space-y-4">
        <p className="text-sm text-[var(--app-text-muted)] max-w-xl mx-auto leading-relaxed">
          {t('alerts.footer_disclaimer')}
        </p>
        <Button intent="cta" onClick={() => navigate('/recommendations')}>
          {t('alerts.view_recommendations')}
        </Button>
      </div>
    </PageFrame>
  );
}

export default Alerts;
