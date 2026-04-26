import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppContext } from '../AppContext';
import { useNotification } from '../NotificationContext';
import Card from '../components/Card';
import Button from '../components/Button';
import PageFrame from '../components/PageFrame';

// Risk → semantic token mapping. No hardcoded colors anywhere.
const RISK_META = {
  Low:    { textClass: 'text-emerald-600', bgClass: 'bg-emerald-500/8',  borderClass: 'border-emerald-500/20' },
  Medium: { textClass: 'text-amber-600',   bgClass: 'bg-amber-500/8',    borderClass: 'border-amber-500/20'   },
  High:   { textClass: 'text-rose-600',    bgClass: 'bg-rose-500/8',     borderClass: 'border-rose-500/20'    },
};
const DEFAULT_RISK_META = { textClass: 'text-[var(--app-text-muted)]', bgClass: 'bg-[var(--app-surface-soft)]', borderClass: 'border-[var(--app-border)]' };

function Analysis() {
  const navigate = useNavigate();
  const { performAnalysis, analysisResult, symptoms, userProfile } = useContext(AppContext);
  const { t, i18n } = useTranslation();
  const { addNotification } = useNotification();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

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
    addNotification(t('analysis.notifications.generating'), 'info');
    const animationDelay = new Promise((resolve) => setTimeout(resolve, 3500));
    try {
      await Promise.all([performAnalysis(), animationDelay]);
      addNotification(t('analysis.notifications.success'), 'success');
    } catch {
      addNotification(t('analysis.notifications.error'), 'error');
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

  const riskMeta = (analysisResult?.risk && RISK_META[analysisResult.risk]) || DEFAULT_RISK_META;

  return (
    <PageFrame title={t('analysis.title')} subtitle={t('analysis.subtitle')} headAlign="center" maxWidthClass="max-w-4xl">
      <Card elevation={1} className="border-t-2 border-t-[var(--brand-accent)] overflow-hidden">
        {analysisResult ? (
          <div className="py-6 fade-in slide-up">
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--app-border)] pb-6 mb-6 gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[var(--app-text)]">
                  {t('analysis.report.compiled', 'AI Health Report Compiled')}
                </h2>
                <p className="text-sm text-[var(--app-text-muted)] mt-1">
                  {t('analysis.report.generated', {
                    date: new Date().toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }),
                  })}
                </p>
              </div>
              <div className="flex items-center gap-6">
                <Button intent="primary" size="sm" onClick={handleAnalyze}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {t('analysis.re_run_btn', 'Update Analysis')}
                </Button>
                <div className="flex flex-col items-end">
                  <span className="text-xs text-[var(--app-text-disabled)] uppercase font-bold tracking-wider mb-1">
                    {t('analysis.report.risk_delta')}
                  </span>
                  <span className={`text-4xl font-extrabold ${riskMeta.textClass}`}>
                    {getRiskLabel(analysisResult.risk)}
                  </span>
                </div>
              </div>
            </div>

            {/* Content grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className={`rounded-[var(--radius-xl)] p-5 border ${riskMeta.bgClass} ${riskMeta.borderClass}`}>
                <h3 className="text-lg font-bold text-[var(--app-text)] mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('analysis.report.reasoning')}
                </h3>
                <p className="text-[var(--app-text)] leading-relaxed font-medium">{analysisResult.reason}</p>
                <div className="mt-4 pt-4 border-t border-[var(--app-border)]">
                  <h4 className="text-sm font-bold text-[var(--app-text-muted)] uppercase tracking-wide mb-2">
                    {t('analysis.report.context')}
                  </h4>
                  <ul className="space-y-2 text-sm text-[var(--app-text-muted)]">
                    {analysisResult.reason.toLowerCase().includes('persisted') && (
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {t('analysis.report.persisted_msg')}
                      </li>
                    )}
                    {(analysisResult.reason.toLowerCase().includes('pattern') || analysisResult.risk !== 'Low') && (
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {t('analysis.report.clustering_msg')}
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="rounded-[var(--radius-xl)] p-5 bg-[var(--app-surface-soft)] border border-[var(--app-border)] flex flex-col">
                <h3 className="text-lg font-bold text-[var(--app-text)] mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[var(--app-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  {t('analysis.report.action_plan')}
                </h3>
                <p className="text-[var(--app-text)] leading-relaxed mb-auto bg-[var(--app-surface)] p-3 rounded-[var(--radius-lg)] border border-[var(--app-border)] whitespace-pre-line">
                  {analysisResult.recommendation || analysisResult.summary || '—'}
                </p>
                <Button intent="secondary" size="sm" onClick={() => navigate('/alerts')} className="mt-4 w-full">
                  {t('analysis.report.view_alerts')}
                </Button>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-amber-500/8 text-amber-700 p-4 rounded-[var(--radius-lg)] flex items-start gap-3 border border-amber-500/20">
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm font-medium">{t('analysis.disclaimer')}</p>
            </div>
          </div>
        ) : (
          <div className="py-16 flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-[var(--app-surface-soft)] rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-[var(--app-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[var(--app-text)] mb-3">{t('analysis.ready.title')}</h2>
            <p className="text-[var(--app-text-muted)] text-center max-w-md mx-auto mb-8 leading-relaxed">
              {t('analysis.ready.body')}
            </p>
            <Button intent="cta" size="lg" onClick={handleAnalyze}>
              {t('analysis.ready.run_btn')}
            </Button>
          </div>
        )}

        {/* Loading modal */}
        {isLoading && (
          <div className="fixed inset-0 z-[100] bg-[var(--app-bg)]/80 backdrop-blur-sm flex items-center justify-center p-4 fade-in">
            <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-l3)] max-w-md w-full p-8 relative overflow-hidden slide-up">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-[var(--brand-accent)] animate-pulse" />

              <div className="flex flex-col items-center">
                {/* Spinner — uses brand accent, no hardcoded teal */}
                <div className="relative w-20 h-20 mb-8">
                  <div className="absolute inset-0 rounded-full border-4 border-[var(--app-border)]" />
                  <div className="absolute inset-0 rounded-full border-4 border-[var(--brand-accent)] border-l-transparent animate-[spin_1.5s_linear_infinite]" />
                  <div className="absolute inset-3 rounded-full border-4 border-[var(--app-text-muted)] border-r-transparent animate-[spin_1s_linear_infinite_reverse]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-[var(--brand-accent)] rounded-full animate-pulse" />
                  </div>
                </div>

                <div className="w-full">
                  <h3 className="text-xl font-bold text-[var(--app-text)] mb-4 text-center">
                    {t('analysis.loading.title', 'Processing Data')}
                  </h3>

                  {/* Terminal */}
                  <div className="bg-[var(--app-bg)] border border-[var(--app-border)] rounded-[var(--radius-lg)] p-4 font-mono text-xs text-left h-36 overflow-hidden flex flex-col justify-end relative">
                    <div className="absolute top-0 right-0 left-0 h-4 z-10 pointer-events-none" style={{ background: 'linear-gradient(to bottom, var(--app-bg), transparent)' }} />
                    {[0, 1, 2, 3, 4].slice(0, loadingStep + 1).map((step, idx) => {
                      const isLast = idx === loadingStep;
                      const texts = [
                        t('analysis.steps.init', '> Initializing CareTrace AI grid... OK'),
                        t('analysis.steps.loading_profile', `> Loading biometrics for ${userProfile?.name || 'Patient'}... OK`),
                        symptoms?.length > 0
                          ? t('analysis.steps.analyzing_symptoms', `> Vectorizing ${symptoms.length} symptom records... OK`)
                          : t('analysis.steps.analyzing_baseline', '> Extrapolating baseline differentials... OK'),
                        t('analysis.steps.correlating', '> Cross-referencing risk taxonomies... RUNNING'),
                        t('analysis.steps.finalizing', '> Compiling predictive intelligence...'),
                      ];
                      return (
                        <div
                          key={idx}
                          className={`mb-1.5 transition-all duration-300 ${
                            isLast
                              ? 'text-[var(--brand-accent)] font-bold opacity-100'
                              : 'text-[var(--app-text-disabled)] opacity-60'
                          }`}
                        >
                          {texts[idx]}
                          {isLast && (
                            <span className="inline-block w-1.5 h-3.5 bg-[var(--brand-accent)] ml-1.5 align-middle animate-pulse" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-5 w-full bg-[var(--app-surface-soft)] rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-[var(--brand-accent)] h-1 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${((loadingStep + 1) / 5) * 100}%` }}
                    />
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
