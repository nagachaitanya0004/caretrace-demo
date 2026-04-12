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
    <PageFrame
      title={t('alerts.title')}
      subtitle={t('alerts.subtitle')}
      headAlign="center"
      maxWidthClass="max-w-4xl"
    >
        {hasAlert() ? (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <Card
                key={alert.id}
                className="border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50/90 to-white border-slate-200/80"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <svg className="h-5 w-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-amber-950">
                      {alert.symptom
                        ? t(`symptoms.options.${alert.symptom}`, { defaultValue: alert.symptom })
                        : t('alerts.health_alert')}
                    </h3>
                    <p className="mt-2 text-sm text-amber-900/90 leading-relaxed">{alert.message}</p>
                    <p className="mt-3 text-xs text-amber-800/80 font-medium">{t('alerts.consult_reminder')}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center border-slate-200/80 bg-gradient-to-b from-teal-50/40 to-white">
            <div className="py-12 px-4">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-teal-100 flex items-center justify-center mb-4">
                <svg className="h-7 w-7 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{t('alerts.empty.title')}</h3>
              <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">{t('alerts.empty.body')}</p>
            </div>
          </Card>
        )}

        <div className="pt-4 text-center space-y-4">
          <p className="text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">{t('alerts.footer_disclaimer')}</p>
          <Button
            onClick={() => navigate('/recommendations')}
            className="bg-gradient-to-r from-teal-600 to-cyan-700 hover:from-teal-700 hover:to-cyan-800"
          >
            {t('alerts.view_recommendations')}
          </Button>
        </div>
    </PageFrame>
  );
}

export default Alerts;