import { useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppContext } from '../AppContext';
import { useNotification } from '../NotificationContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import PageFrame from '../components/PageFrame';
import { chartColors, cartesianGridProps, tooltipContentStyle } from '../utils/chartTheme';

function Reports() {
  const { userProfile, symptoms, analysisResult, isLoading } = useContext(AppContext);
  const { addNotification } = useNotification();
  const { t, i18n } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const riskLevel = analysisResult?.risk || t('common.pending');

  const chartData = useMemo(
    () =>
      (symptoms || [])
        .slice()
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map((item) => ({
          date: new Date(item.date).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' }),
          severity: Number(item.severity),
        })),
    [symptoms, i18n.language]
  );

  const handleDownload = () => {
    setIsGenerating(true);
    addNotification(t('reports.notifications.booting'), "info");
    
    setTimeout(() => {
      setIsGenerating(false);
      addNotification(t('reports.notifications.success'), "success");
      window.print();
    }, 1500);
  };

  const getRiskLabel = (risk) => {
    if (!risk || risk === t('common.pending')) return risk;
    const key = risk.toLowerCase();
    if (key === 'low') return t('dashboard.risk.low');
    if (key === 'medium') return t('dashboard.risk.medium');
    if (key === 'high') return t('dashboard.risk.high');
    return risk;
  };

  return (
    <div className="fade-in h-full overflow-y-auto w-full id-print-container">
      <PageFrame
        title={t('reports.title')}
        subtitle={t('reports.subtitle')}
        actions={
          <Button
            onClick={handleDownload}
            disabled={isGenerating || isLoading}
            className="print:hidden bg-gradient-to-r from-teal-600 to-cyan-700 hover:from-teal-700 hover:to-cyan-800 flex items-center gap-2 shadow-md font-semibold"
          >
            {isGenerating ? (
              <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            {isGenerating ? t('reports.compiling') : t('reports.download_btn')}
          </Button>
        }
      >
        <Card className="border-slate-200/80">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">{t('reports.profile.title')}</h2>
              <ul className="space-y-3">
                <li className="flex justify-between"><span className="text-gray-500">{t('reports.profile.name')}:</span> <span className="font-medium text-gray-800">{userProfile.name || t('common.not_available')}</span></li>
                <li className="flex justify-between"><span className="text-gray-500">{t('reports.profile.age')}:</span> <span className="font-medium text-gray-800">{userProfile.age || t('common.not_available')}</span></li>
                <li className="flex justify-between"><span className="text-gray-500">{t('reports.profile.gender')}:</span> <span className="font-medium text-gray-800 capitalize">{userProfile.gender ? t(`common.gender.${userProfile.gender.toLowerCase()}`, { defaultValue: userProfile.gender }) : t('common.not_available')}</span></li>
                <li className="flex justify-between"><span className="text-gray-500">{t('reports.profile.lifestyle')}:</span> <span className="font-medium text-gray-800 capitalize">{userProfile.lifestyle ? t(`common.lifestyle.${userProfile.lifestyle.toLowerCase()}`, { defaultValue: userProfile.lifestyle }) : t('common.not_available')}</span></li>
              </ul>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg flex flex-col justify-center items-center">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('dashboard.risk.title')}</h2>
              <div className="flex items-center gap-2">
                <Badge variant={riskLevel === t('common.pending') ? 'default' : riskLevel.toLowerCase()}>{getRiskLabel(riskLevel)}</Badge>
              </div>
              <p className="text-sm text-center text-gray-600 mt-4">
                {analysisResult?.recommendation || t('dashboard.risk.action_pending')}
              </p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          <Card>
            <h3 className="text-gray-500 font-medium text-sm mb-1 uppercase tracking-wider">{t('reports.stats.total_symptoms')}</h3>
            <p className="text-3xl font-bold text-zinc-800">{symptoms.length}</p>
          </Card>
          <Card>
            <h3 className="text-gray-500 font-medium text-sm mb-1 uppercase tracking-wider">{t('reports.stats.avg_severity')}</h3>
            <p className="text-3xl font-bold text-gray-800">
              {symptoms.length > 0
                ? (symptoms.reduce((sum, item) => sum + Number(item.severity), 0) / symptoms.length).toFixed(1)
                : '—'}
            </p>
          </Card>
          <Card>
            <h3 className="text-gray-500 font-medium text-sm mb-1 uppercase tracking-wider">{t('reports.stats.longest_run')}</h3>
            <p className="text-3xl font-bold text-gray-800">
              {symptoms.length > 0 ? t('reports.stats.days', { count: Math.max(...symptoms.map((item) => Number(item.duration))) }) : '—'}
            </p>
          </Card>
        </div>

        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">{t('reports.charts.severity_trend')}</h2>
              <p className="text-xs text-slate-500 mt-1">{t('charts.caption_trend')}</p>
            </div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {t('reports.charts.latest_updates')}
            </span>
          </div>
          {chartData.length === 0 ? (
            <div className="py-14 text-center text-slate-500 text-sm">{t('reports.charts.empty')}</div>
          ) : (
            <div className="h-80 sm:h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
                  <CartesianGrid {...cartesianGridProps} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: chartColors.axis, fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: chartColors.grid }}
                    label={{ value: t('charts.x_time'), position: 'bottom', offset: 0, fill: chartColors.axis, fontSize: 11 }}
                  />
                  <YAxis
                    domain={[0, 10]}
                    tick={{ fill: chartColors.axis, fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: chartColors.grid }}
                    width={40}
                    label={{
                      value: t('charts.y_severity'),
                      angle: -90,
                      position: 'insideLeft',
                      fill: chartColors.axis,
                      fontSize: 11,
                    }}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}/10`, t('history.table.severity')]}
                    contentStyle={tooltipContentStyle}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="severity"
                    name={t('history.table.severity')}
                    stroke={chartColors.primary}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: chartColors.primary, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: chartColors.secondary }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <div className="text-sm text-slate-500 card-premium px-4 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-center gap-1 sm:gap-2 text-center">
          <span className="font-semibold text-slate-700">{t('common.disclaimer')}:</span>
          <span>{t('reports.disclaimer')}</span>
        </div>
      </PageFrame>
    </div>
  );
}

export default Reports;
