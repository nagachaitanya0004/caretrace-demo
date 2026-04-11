import { useContext, useMemo, useState } from 'react';
import { AppContext } from '../AppContext';
import { useLanguage } from '../LanguageContext';
import { useNotification } from '../NotificationContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { formattedDate } from '../utils/health';

function Reports() {
  const { userProfile, symptoms, analysisResult, isLoading } = useContext(AppContext);
  const { addNotification } = useNotification();
  const { t } = useLanguage();
  const [isGenerating, setIsGenerating] = useState(false);
  const riskLevel = analysisResult?.risk || 'Pending';

  const chartData = useMemo(
    () =>
      (symptoms || [])
        .slice()
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map((item) => ({
          date: formattedDate(item.date),
          severity: Number(item.severity),
        })),
    [symptoms]
  );

  const handleDownload = () => {
    setIsGenerating(true);
    addNotification("Booting PDF Render Matrix...", "info");
    
    // Simulate complex PDF compilation delay
    setTimeout(() => {
      setIsGenerating(false);
      addNotification("Report Rendered Successfully!", "success");
      // Trigger native browser PDF window print dialogue!
      window.print();
    }, 1500);
  };

  return (
    <div className="p-6 md:p-8 fade-in h-full overflow-y-auto w-full id-print-container">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 print:hidden">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('reports')}</h1>
            <p className="text-gray-600">Review your generated health summaries and extract analytical PDF reports.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleDownload} disabled={isGenerating || isLoading} className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2 shadow-sm font-bold tracking-wide">
              {isGenerating ? (
                 <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              )}
              {isGenerating ? 'Compiling PDF...' : t('download_report')}
            </Button>
          </div>
        </div>

        <Card className="mb-6 border border-gray-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">Patient Profile</h2>
              <ul className="space-y-3">
                <li className="flex justify-between"><span className="text-gray-500">Name:</span> <span className="font-medium text-gray-800">{userProfile.name || 'N/A'}</span></li>
                <li className="flex justify-between"><span className="text-gray-500">Age:</span> <span className="font-medium text-gray-800">{userProfile.age || 'N/A'}</span></li>
                <li className="flex justify-between"><span className="text-gray-500">Gender:</span> <span className="font-medium text-gray-800 capitalize">{userProfile.gender || 'N/A'}</span></li>
                <li className="flex justify-between"><span className="text-gray-500">Lifestyle:</span> <span className="font-medium text-gray-800 capitalize">{userProfile.lifestyle || 'N/A'}</span></li>
              </ul>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg flex flex-col justify-center items-center">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Current Risk Assessment</h2>
              <div className="flex items-center gap-2">
                <Badge variant={riskLevel.toLowerCase()}>{riskLevel}</Badge>
              </div>
              <p className="text-sm text-center text-gray-600 mt-4">
                {analysisResult?.recommendation || 'Run an AI analysis to generate personalized guidance.'}
              </p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          <Card>
            <h3 className="text-gray-500 font-medium text-sm mb-1 uppercase tracking-wider">Total Symptoms</h3>
            <p className="text-3xl font-bold text-blue-600">{symptoms.length}</p>
          </Card>
          <Card>
            <h3 className="text-gray-500 font-medium text-sm mb-1 uppercase tracking-wider">Avg Severity</h3>
            <p className="text-3xl font-bold text-gray-800">
              {symptoms.length > 0
                ? (symptoms.reduce((sum, item) => sum + Number(item.severity), 0) / symptoms.length).toFixed(1)
                : '—'}
            </p>
          </Card>
          <Card>
            <h3 className="text-gray-500 font-medium text-sm mb-1 uppercase tracking-wider">Longest Run</h3>
            <p className="text-3xl font-bold text-gray-800">
              {symptoms.length > 0 ? Math.max(...symptoms.map((item) => Number(item.duration))) : '—'} day(s)
            </p>
          </Card>
        </div>

        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-700">Severity Trend</h2>
            <span className="text-sm text-gray-500">Latest updates</span>
          </div>
          {chartData.length === 0 ? (
            <div className="py-12 text-center text-gray-500">No symptoms logged yet. Add entries to view a trend chart.</div>
          ) : (
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 12 }} />
                  <YAxis domain={[0, 10]} tick={{ fill: '#475569', fontSize: 12 }} />
                  <Tooltip formatter={(value) => `${value}/10`} />
                  <Legend />
                  <Line type="monotone" dataKey="severity" stroke="#2563eb" strokeWidth={3} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <div className="text-center text-sm text-gray-400 mt-12 bg-white px-4 py-3 rounded border border-gray-100 flex items-center justify-center gap-2">
          <span className="font-semibold">Disclaimer:</span> This report is generated by AI and does not constitute a medical diagnosis.
        </div>
      </div>
    </div>
  );
}

export default Reports;
