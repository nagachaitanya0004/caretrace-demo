import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AppContext } from '../AppContext';
import { useLanguage } from '../LanguageContext';
import { useNotification } from '../NotificationContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';

function Analysis() {
  const navigate = useNavigate();
  const { performAnalysis, analysisResult } = useContext(AppContext);
  const { t } = useLanguage();
  const { addNotification } = useNotification();
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    setIsLoading(true);
    addNotification("Generating recursive intelligence vectors...", "info");
    try {
      await performAnalysis();
      addNotification("Analysis mapping generated successfully!", "success");
    } catch (e) {
      addNotification("Error binding intelligence parameters", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 p-4 fade-in">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">{t('analysis')}</h1>
        <p className="text-gray-600 mb-8 text-center text-lg max-w-2xl mx-auto">Deep recursive logic engines isolating patterns against clinical probability models to formulate actionable steps.</p>
        
        <Card className="shadow-xl border-t-4 border-blue-600 relative overflow-hidden">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Analyzing your structural baseline...</h3>
              <p className="text-sm text-gray-500 max-w-sm text-center">Processing historical symptoms, mapping multi-variate interactions, and generating severity deltas...</p>
            </div>
          ) : analysisResult ? (
            <div className="py-6 fade-in outline-none slide-up">
              <div className="flex items-center justify-between border-b border-gray-100 pb-6 mb-6">
                 <div>
                    <h2 className="text-2xl font-bold text-gray-800">Intelligence Report Compiled</h2>
                    <p className="text-sm text-gray-500 mt-1">Generated: {new Date().toLocaleString()}</p>
                 </div>
                 <div className="flex flex-col items-end">
                    <span className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Calculated Risk Delta</span>
                    <span className={`text-4xl font-extrabold flex items-center gap-2 ${
                        analysisResult.risk === 'Low' ? 'text-green-500' :
                        analysisResult.risk === 'Medium' ? 'text-yellow-600' :
                        'text-red-600'
                    }`}>
                      {analysisResult.risk}
                    </span>
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
                     Primary Reasoning
                   </h3>
                   <p className="text-gray-700 leading-relaxed font-medium">{analysisResult.reason}</p>
                   
                   <div className="mt-4 pt-4 border-t border-black/5">
                      <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-2 opacity-70">Granular Context</h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                         {analysisResult.reason.toLowerCase().includes('persisted') && (
                           <li className="flex items-start gap-2">
                             <svg className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                             Your symptoms have persisted longer than standard demographic limits.
                           </li>
                         )}
                         {analysisResult.reason.toLowerCase().includes('pattern') || analysisResult.risk !== 'Low' && (
                           <li className="flex items-start gap-2">
                             <svg className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                             Multiple compounding symptoms detected clustering geographically across identical temporal zones.
                           </li>
                         )}
                      </ul>
                   </div>
                </div>

                <div className="rounded-xl p-5 bg-gray-50 border border-gray-200 flex flex-col">
                   <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                     <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                     Action Plan
                   </h3>
                   <p className="text-gray-700 leading-relaxed mb-auto bg-white p-3 rounded-lg border border-gray-100 shadow-sm">{analysisResult.recommendation}</p>
                   <Button variant="outline" onClick={() => navigate('/alerts')} className="mt-4 w-full">View Isolated Health Alerts</Button>
                </div>
              </div>

              <div className="bg-orange-50 text-orange-800 p-4 rounded-lg flex items-start gap-3 border border-orange-200 shadow-sm">
                <svg className="w-6 h-6 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <p className="text-sm font-medium">This analysis is an AI simulation formulated via mock vectors. It explicitly does not replace professional clinical diagnosis. Always consult verified medical structures.</p>
              </div>
            </div>
          ) : (
            <div className="py-16 flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">System Ready for Processing</h2>
              <p className="text-gray-500 text-center max-w-md mx-auto mb-8 leading-relaxed">Initiate the intelligence scanner to isolate anomalies dynamically traversing your entire symptom timeline array.</p>
              <Button onClick={handleAnalyze} className="px-8 py-3 text-lg font-bold shadow-lg shadow-blue-500/30 hover:scale-105 transition-transform">Run Comprehensive Scan</Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default Analysis;
