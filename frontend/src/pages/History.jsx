import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { AppContext } from '../AppContext';
import Card from '../components/Card';
import Badge from '../components/Badge';
import PageFrame from '../components/PageFrame';
import { getSeverityLabel } from '../utils/health';

function History() {
  const { t, i18n } = useTranslation();
  const { symptoms } = useContext(AppContext);

  return (
    <PageFrame title={t('history.title')} subtitle={t('history.subtitle')} maxWidthClass="max-w-5xl">
      <Card elevation={1} className="overflow-hidden p-0">
        {symptoms.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--app-surface-soft)] border-b border-[var(--app-border)]">
                  {[
                    t('history.table.date'),
                    t('history.table.symptom'),
                    t('history.table.duration'),
                    t('history.table.severity'),
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-6 py-4 text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--app-border)]">
                {symptoms
                  .slice()
                  .reverse()
                  .map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-[var(--app-surface-soft)] transition-colors duration-150"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--app-text-muted)]">
                        {s.date
                          ? new Date(s.date).toLocaleDateString(i18n.language)
                          : new Date(s.id).toLocaleDateString(i18n.language)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-[var(--app-text)]">
                          {t(`symptoms.options.${s.symptom}`, { defaultValue: s.symptom })}
                        </span>
                        {s.context?.frequency && (
                          <span className="ml-2 text-xs text-[var(--app-accent)] bg-[var(--app-accent)]/10 border border-[var(--app-accent)]/20 px-1.5 py-0.5 rounded-full capitalize">
                            {s.context.frequency}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--app-text-muted)]">
                        {t('timeline.days_tracking', { count: s.duration })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getSeverityLabel(s.severity).toLowerCase()}>
                          {s.severity}/10 ({getSeverityLabel(s.severity)})
                        </Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-[var(--app-surface-soft)] rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-[var(--app-text-disabled)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-[var(--app-text)] mb-1">{t('history.empty.title')}</h3>
            <p className="text-[var(--app-text-muted)]">{t('history.empty.body')}</p>
          </div>
        )}
      </Card>
    </PageFrame>
  );
}

export default History;
