import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AppContext } from '../AppContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { formattedDate, getSeverityLabel } from '../utils/health';

function Timeline() {
  const navigate = useNavigate();
  const { symptoms } = useContext(AppContext);

  return (
    <div className="min-h-screen bg-blue-50 p-4 fade-in">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">Your Health Timeline</h1>
        <p className="text-gray-600 mb-8 text-center">Review your symptom history to track patterns and progress.</p>
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Symptom Timeline</h2>
            {symptoms.length > 1 && (
               <Badge variant="warning" className="animate-pulse shadow-sm">
                 Multiple Entries Detected
               </Badge>
            )}
          </div>

          {symptoms.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                 <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              </div>
              <p className="text-gray-500 mb-2 font-medium">No symptoms recorded yet.</p>
              <p className="text-sm text-gray-400">Go back to the symptoms page to log your active profile.</p>
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
                    <div className="absolute -left-[35px] top-5 w-4 h-4 rounded-full border-4 border-white bg-blue-500 shadow-sm"></div>
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      
                      <div className="flex items-start md:items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 border border-blue-100">
                          <span className="text-blue-600 font-bold text-lg">{new Date(item.date).getDate()}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <p className="font-bold text-gray-800 capitalize text-lg">{item.symptom}</p>
                            {trend === 'up' && (
                              <span className="flex items-center text-xs font-bold text-red-600 gap-1 bg-red-50 px-2 py-0.5 rounded border border-red-100" title="Severity Increasing">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                                Escaped Normalcy
                              </span>
                            )}
                            {trend === 'down' && (
                              <span className="flex items-center text-xs font-bold text-green-600 gap-1 bg-green-50 px-2 py-0.5 rounded border border-green-100" title="Severity Decreasing">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                                Recovery Trending
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-500 font-medium">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              {formattedDate(item.date)}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              {item.duration} days tracking
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end shrink-0">
                         <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Severity Weight</span>
                         <Badge variant={getSeverityLabel(item.severity).toLowerCase()} className="shadow-sm">
                           {getSeverityLabel(item.severity)} • {item.severity}/10
                         </Badge>
                      </div>
                      
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
        <div className="mt-8 text-center">
          {symptoms.length === 0 ? (
            <Button onClick={() => navigate('/symptoms')}>Add Symptoms</Button>
          ) : (
            <Button onClick={() => navigate('/analysis')}>Get AI Analysis</Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Timeline;