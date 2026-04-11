import { useContext } from 'react';
import { AppContext } from '../AppContext';
import Card from '../components/Card';
import Badge from '../components/Badge';

function History() {
  const { symptoms } = useContext(AppContext);

  const getSeverityLabel = (severity) => {
    if (severity <= 3) return 'Low';
    if (severity <= 7) return 'Medium';
    return 'High';
  };

  return (
    <div className="p-6 md:p-8 fade-in h-full overflow-y-auto w-full">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Symptoms History</h1>
        <p className="text-gray-600 mb-8">A comprehensive chronological record of your logged symptoms.</p>

        <Card className="overflow-hidden p-0 shadow-sm">
          {symptoms.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Date Logged</th>
                    <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Symptom</th>
                    <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {symptoms.slice().reverse().map((s) => (
                    <tr key={s.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {s.date || new Date(s.id).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900 capitalize">{s.symptom}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {s.duration} {s.duration === '1' ? 'day' : 'days'}
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
              <h3 className="text-lg font-medium text-gray-900 mb-1">No History Found</h3>
              <p className="text-gray-500">You haven't logged any symptoms yet.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default History;
