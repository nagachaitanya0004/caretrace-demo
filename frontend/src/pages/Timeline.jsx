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
        <Card className="border-slate-200/80">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">{t('timeline.list_title')}</h2>
            {symptoms.length > 1 && (
               <Badge variant="warning" className="animate-pulse shadow-sm">
                 {t('timeline.multiple_entries')}
               </Badge>
            )}
          </div>

          {symptoms.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                 <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              </div>
              <p className="text-gray-500 mb-2 font-medium">{t('timeline.empty.title')}</p>
              <p className="text-sm text-gray-400">{t('timeline.empty.body')}</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-gray-100 ml-4 pl-6 space-y-6">
              {[...symptoms].sort((a,b) => new Date(b.date) - new Date(a.date)).map((item, index, array) => {
                // Calculate simulated trend delta
                const nextItem = array[index + 1];
                let trend = 'stable';
                if (nextItem && item.symptom === nextItem.symptom) {
                   if (item.severity > nextItem.severity) trend = 'up';
                   else if (item.severity < nextItem.severity) trend = 'down';
                }

                return (
                  <div key={item.id} className="relative bg-white border border-gray-100 shadow-sm rounded-xl p-5 hover:shadow-md transition-shadow">
                    
                    {/* Timeline Node */}
                    <div className="absolute -left-[35px] top-5 w-4 h-4 rounded-full border-4 border-white bg-zinc-600 shadow-sm"></div>
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      
                      <div className="flex items-start md:items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-50 rounded-xl flex items-center justify-center shrink-0 border border-zinc-100">
                          <span className="text-zinc-800 font-bold text-lg">{new Date(item.date).getDate()}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <p className="font-bold text-gray-800 text-lg">
                              {t(`symptoms.options.${item.symptom}`, { defaultValue: item.symptom })}
                            </p>
                            {trend === 'up' && (
                              <span className="flex items-center text-xs font-bold text-red-600 gap-1 bg-red-50 px-2 py-0.5 rounded border border-red-100" title={t('timeline.trends.increasing_title')}>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                                {t('timeline.trends.increasing')}
                              </span>
                            )}
                            {trend === 'down' && (
                              <span className="flex items-center text-xs font-bold text-green-600 gap-1 bg-green-50 px-2 py-0.5 rounded border border-green-100" title={t('timeline.trends.decreasing_title')}>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                                {t('timeline.trends.decreasing')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-500 font-medium">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              {new Date(item.date).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              {item.context?.duration_text || t('timeline.days_tracking', { count: item.duration })}
                            </span>
                            {item.context?.frequency && (
                              <>
                                <span>•</span>
                                <span className="capitalize text-teal-600 font-semibold">{item.context.frequency}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end shrink-0">
                         <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">{t('timeline.severity_weight')}</span>
                         <Badge variant={getSeverityLabel(item.severity).toLowerCase()} className="shadow-sm">
                           {getSeverityLabel(item.severity, t)} • {item.severity}/10
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
            <Button
              onClick={() => navigate('/symptoms')}
              className="bg-gradient-to-r from-teal-600 to-cyan-700 hover:from-teal-700 hover:to-cyan-800"
            >
              {t('symptoms.submit_btn')}
            </Button>
          ) : (
            <Button
              onClick={() => navigate('/analysis')}
              className="bg-gradient-to-r from-teal-600 to-cyan-700 hover:from-teal-700 hover:to-cyan-800"
            >
              {t('timeline.get_analysis')}
            </Button>
          )}
        </div>
    </PageFrame>
  );
}

export default Timeline;