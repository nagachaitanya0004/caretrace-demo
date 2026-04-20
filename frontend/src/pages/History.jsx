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
        <Card className="overflow-hidden p-0 border-slate-200/80">
          {symptoms.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('history.table.date')}</th>
                    <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('history.table.symptom')}</th>
                    <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('history.table.duration')}</th>
                    <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('history.table.severity')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {symptoms.slice().reverse().map((s) => (
                    <tr key={s.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {s.date ? new Date(s.date).toLocaleDateString(i18n.language) : new Date(s.id).toLocaleDateString(i18n.language)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-slate-900">
                          {t(`symptoms.options.${s.symptom}`, { defaultValue: s.symptom })}
                        </span>
                        {s.context?.frequency && (
                          <span className="ml-2 text-xs text-teal-700 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded-full capitalize">
                            {s.context.frequency}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
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
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">{t('history.empty.title')}</h3>
              <p className="text-gray-500">{t('history.empty.body')}</p>
            </div>
          )}
        </Card>
    </PageFrame>
  );
}

export default History;
