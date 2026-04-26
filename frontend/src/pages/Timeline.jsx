import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { AppContext } from '../AppContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import PageFrame from '../components/PageFrame';
import { getSeverityLabel } from '../utils/health';

function Timeline() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { symptoms } = useContext(AppContext);

  return (
    <PageFrame title={t('timeline.title')} subtitle={t('timeline.subtitle')} headAlign="center" maxWidthClass="max-w-4xl">
      <Card elevation={1}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[var(--app-text)]">{t('timeline.list_title')}</h2>
          {symptoms.length > 1 && (
            <Badge variant="warning" className="animate-pulse">
              {t('timeline.multiple_entries')}
            </Badge>
          )}
        </div>

        {symptoms.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center">
            <div className="w-16 h-16 bg-[var(--app-surface-soft)] rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-[var(--app-text-disabled)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="text-[var(--app-text-muted)] mb-2 font-medium">{t('timeline.empty.title')}</p>
            <p className="text-sm text-[var(--app-text-disabled)]">{t('timeline.empty.body')}</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-[var(--app-border)] ml-4 pl-6 space-y-6">
            {[...symptoms]
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map((item, index, array) => {
                const nextItem = array[index + 1];
                let trend = 'stable';
                if (nextItem && item.symptom === nextItem.symptom) {
                  if (item.severity > nextItem.severity) trend = 'up';
                  else if (item.severity < nextItem.severity) trend = 'down';
                }

                return (
                  <div
                    key={item.id}
                    className="relative bg-[var(--app-surface)] border border-[var(--app-border)] shadow-[var(--shadow-l1)] rounded-[var(--radius-xl)] p-5 hover:shadow-[var(--shadow-l2)] transition-shadow duration-200"
                  >
                    {/* Timeline node */}
                    <div className="absolute -left-[35px] top-5 w-4 h-4 rounded-full border-4 border-[var(--app-surface)] bg-[var(--app-text-muted)]" />

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start md:items-center gap-4">
                        {/* Date tile */}
                        <div className="w-12 h-12 bg-[var(--app-surface-soft)] rounded-[var(--radius-lg)] flex items-center justify-center shrink-0 border border-[var(--app-border)]">
                          <span className="text-[var(--app-text)] font-bold text-lg">
                            {new Date(item.date).getDate()}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <p className="font-bold text-[var(--app-text)] text-lg">
                              {t(`symptoms.options.${item.symptom}`, { defaultValue: item.symptom })}
                            </p>
                            {trend === 'up' && (
                              <span className="flex items-center text-xs font-bold text-rose-600 gap-1 bg-rose-500/8 px-2 py-0.5 rounded border border-rose-500/20">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                </svg>
                                {t('timeline.trends.increasing')}
                              </span>
                            )}
                            {trend === 'down' && (
                              <span className="flex items-center text-xs font-bold text-emerald-600 gap-1 bg-emerald-500/8 px-2 py-0.5 rounded border border-emerald-500/20">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                                {t('timeline.trends.decreasing')}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mt-1.5 text-sm text-[var(--app-text-muted)] font-medium flex-wrap">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {new Date(item.date).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {item.context?.duration_text || t('timeline.days_tracking', { count: item.duration })}
                            </span>
                            {item.context?.frequency && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="capitalize text-[var(--app-accent)] font-semibold">
                                  {item.context.frequency}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-start md:items-end shrink-0">
                        <span className="text-xs text-[var(--app-text-disabled)] font-bold uppercase tracking-wider mb-1">
                          {t('timeline.severity_weight')}
                        </span>
                        <Badge variant={getSeverityLabel(item.severity).toLowerCase()}>
                          {getSeverityLabel(item.severity, t)} · {item.severity}/10
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </Card>

      <div className="pt-2 text-center">
        {symptoms.length === 0 ? (
          <Button intent="cta" onClick={() => navigate('/symptoms')}>
            {t('symptoms.submit_btn')}
          </Button>
        ) : (
          <Button intent="cta" onClick={() => navigate('/analysis')}>
            {t('timeline.get_analysis')}
          </Button>
        )}
      </div>
    </PageFrame>
  );
}

export default Timeline;
