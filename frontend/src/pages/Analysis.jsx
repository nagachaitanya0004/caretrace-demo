import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppContext } from '../AppContext';
import { useNotification } from '../NotificationContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import PageFrame from '../components/PageFrame';

function Analysis() {
  const navigate = useNavigate();
  const { performAnalysis, analysisResult, symptoms, userProfile } = useContext(AppContext);
  const { t, i18n } = useTranslation();
  const { addNotification } = useNotification();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  // Cycle through animation steps while loading
  useEffect(() => {
    let interval;
    if (isLoading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < 4 ? prev + 1 : prev));
      }, 700);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleAnalyze = async () => {
    setIsLoading(true);
    addNotification(t('analysis.notifications.generating'), "info");
    
    // Ensure the terminal animation has time to run (5 steps * 700ms = 3500ms)
    const animationDelay = new Promise((resolve) => setTimeout(resolve, 3500));
    
    try {
      await Promise.all([performAnalysis(), animationDelay]);
      addNotification(t('analysis.notifications.success'), "success");
    } catch {
      addNotification(t('analysis.notifications.error'), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskLabel = (risk) => {
    if (!risk) return '';
    const key = risk.toLowerCase();
    if (key === 'low') return t('dashboard.risk.low');
    if (key === 'medium') return t('dashboard.risk.medium');
    if (key === 'high') return t('dashboard.risk.high');
    return risk;
  };

  return (
    <PageFrame title={t('analysis.title')} subtitle={t('analysis.subtitle')} headAlign="center" maxWidthClass="max-w-4xl">
        <Card className="shadow-lg border border-slate-200/80 border-t-4 border-t-teal-600 relative overflow-hidden">
          {analysisResult ? (
            <div className="py-6 fade-in outline-none slide-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-6 mb-6 gap-4">
                 <div>
                    <h2 className="text-2xl font-bold text-gray-800">{t('analysis.report.compiled', 'AI Health Report Compiled')}</h2>
                    <p className="text-sm text-gray-500 mt-1">{t('analysis.report.generated', { date: new Date().toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }) }, 'Generated ' + new Date().toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }))}</p>
                 </div>
                 <div className="flex items-center gap-6">
                    <Button
                      onClick={handleAnalyze}
                      className="whitespace-nowrap px-4 py-2 bg-zinc-800 hover:bg-zinc-900 text-white font-semibold text-sm shadow-sm flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      {t('analysis.re_run_btn', 'Update Analysis')}
                    </Button>
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">{t('analysis.report.risk_delta')}</span>
                      <span className={`text-4xl font-extrabold flex items-center gap-2 ${
                        analysisResult.risk === 'Low' ? 'text-green-500' :
                        analysisResult.risk === 'Medium' ? 'text-yellow-600' :
                        'text-red-600'
                    }`}>
                        {getRiskLabel(analysisResult.risk)}
                      </span>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className={`rounded-xl p-5 border shadow-sm ${
                  analysisResult.risk === 'Low' ? 'border-green-200 bg-green-50/50' :
                  analysisResult.risk === 'Medium' ? 'border-yellow-200 bg-yellow-50/50' :
                  'border-red-200 bg-red-50/50'
                }`}>
                   <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     {t('analysis.report.reasoning')}
                   </h3>
                   <p className="text-gray-700 leading-relaxed font-medium">{analysisResult.reason}</p>
                   
                   <div className="mt-4 pt-4 border-t border-black/5">
                      <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-2 opacity-70">{t('analysis.report.context')}</h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                         {analysisResult.reason.toLowerCase().includes('persisted') && (
                           <li className="flex items-start gap-2">
                             <svg className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                             {t('analysis.report.persisted_msg')}
                           </li>
                         )}
                         {(analysisResult.reason.toLowerCase().includes('pattern') || analysisResult.risk !== 'Low') && (
                           <li className="flex items-start gap-2">
                             <svg className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                             {t('analysis.report.clustering_msg')}
                           </li>
                         )}
                      </ul>
                   </div>
                </div>

                <div className="rounded-xl p-5 bg-gray-50 border border-gray-200 flex flex-col">
                   <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                     <svg className="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                     {t('analysis.report.action_plan')}
                   </h3>
                   <p className="text-gray-700 leading-relaxed mb-auto bg-white p-3 rounded-lg border border-gray-100 shadow-sm whitespace-pre-line">
                     {analysisResult.recommendation || analysisResult.summary || '—'}
                   </p>
                   <Button variant="outline" onClick={() => navigate('/alerts')} className="mt-4 w-full">{t('analysis.report.view_alerts')}</Button>
                </div>
              </div>

              <div className="bg-orange-50 text-orange-800 p-4 rounded-lg flex items-start gap-3 border border-orange-200 shadow-sm">
                <svg className="w-6 h-6 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <p className="text-sm font-medium">{t('analysis.disclaimer')}</p>
              </div>
            </div>
          ) : (
            <div className="py-16 flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">{t('analysis.ready.title')}</h2>
              <p className="text-gray-500 text-center max-w-md mx-auto mb-8 leading-relaxed">{t('analysis.ready.body')}</p>
              <Button
                onClick={handleAnalyze}
                className="px-8 py-3 text-base font-bold bg-gradient-to-r from-teal-600 to-cyan-700 hover:from-teal-700 hover:to-cyan-800 shadow-lg shadow-teal-900/15"
              >
                {t('analysis.ready.run_btn')}
              </Button>
            </div>
          )}

          {/* Fullscreen Analyzing Popup Modal */}
          {isLoading && (
            <div className="fixed inset-0 z-[100] bg-zinc-900/60 backdrop-blur-md flex items-center justify-center p-4 fade-in">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative overflow-hidden slide-up border border-teal-500/20">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-cyan-500 animate-pulse"></div>
                
                <div className="flex flex-col items-center">
                  <div className="relative w-24 h-24 mb-8">
                    {/* Advanced Scanner ring */}
                    <div className="absolute inset-0 rounded-full border-4 border-teal-100/20"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-teal-500 border-l-transparent animate-[spin_1.5s_linear_infinite]"></div>
                    <div className="absolute inset-2 rounded-full border-4 border-cyan-500 border-r-transparent animate-[spin_1s_linear_infinite_reverse]"></div>
                    <div className="absolute inset-4 rounded-full border-4 border-emerald-400 border-b-transparent animate-[spin_2s_linear_infinite]"></div>
                    {/* Inner scanner dot */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(20,184,166,1)]"></div>
                    </div>
                  </div>
                  
                  <div className="w-full">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">{t('analysis.loading.title', 'Processing Data')}</h3>
                    
                    {/* Terminal-like text readout */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 font-mono text-xs text-left shadow-inner h-36 overflow-hidden flex flex-col justify-end relative">
                      <div className="absolute top-0 right-0 left-0 h-4 bg-gradient-to-b from-zinc-900 to-transparent z-10 block pointer-events-none"></div>
                      
                      {[0, 1, 2, 3, 4].slice(0, loadingStep + 1).map((step, idx) => {
                        const isLast = idx === loadingStep;
                        const texts = [
                          t('analysis.steps.init', '> Initializing CareTrace AI grid... OK'),
                          t('analysis.steps.loading_profile', `> Loading biometrics for ${userProfile?.name || 'Patient'}... OK`),
                          symptoms?.length > 0
                            ? t('analysis.steps.analyzing_symptoms', `> Vectorizing ${symptoms.length} symptom records... OK`)
                            : t('analysis.steps.analyzing_baseline', '> Extrapolating baseline differentials... OK'),
                          t('analysis.steps.correlating', '> Cross-referencing risk taxonomies... RUNNING'),
                          t('analysis.steps.finalizing', '> Compiling predictive intelligence...')
                        ];
                        return (
                          <div key={idx} className={`mb-1.5 transition-all duration-300 ${isLast ? 'text-teal-400 font-bold opacity-100' : 'text-zinc-500 opacity-60'}`}>
                            {texts[idx]}
                            {isLast && <span className="inline-block w-1.5 h-3.5 bg-teal-400 ml-1.5 align-middle animate-pulse"></span>}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Progress bar */}
                    <div className="mt-5 w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-gradient-to-r from-teal-500 to-cyan-500 h-1.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${((loadingStep + 1) / 5) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
    </PageFrame>
  );
}

export default Analysis;
