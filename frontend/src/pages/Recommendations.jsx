import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { AppContext } from '../AppContext';
import Card from '../components/Card';
import Button from '../components/Button';
import PageFrame from '../components/PageFrame';

function Recommendations() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { analysisResult } = useContext(AppContext);

  const getRecommendations = (risk) => {
    if (!risk) return t('recommendations.risk_plans.default', { returnObjects: true });
    
    const riskKey = risk.toLowerCase();
    switch (riskKey) {
      case 'low':
        return t('recommendations.risk_plans.low', { returnObjects: true });
      case 'medium':
        return t('recommendations.risk_plans.medium', { returnObjects: true });
      case 'high':
        return t('recommendations.risk_plans.high', { returnObjects: true });
      default:
        return t('recommendations.risk_plans.default', { returnObjects: true });
    }
  };

  const rawRecs = analysisResult ? getRecommendations(analysisResult.risk) : [];
  const recommendations = Array.isArray(rawRecs) ? rawRecs : [];

  return (
    <PageFrame
      title={t('recommendations.title')}
      subtitle={t('recommendations.subtitle')}
      headAlign="center"
      maxWidthClass="max-w-4xl"
    >
        <Card className="border-slate-200/80">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">{t('recommendations.section_title')}</h2>
          {recommendations.length > 0 ? (
            <ul className="space-y-4">
              {recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-teal-50 border border-teal-100 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-teal-800 text-sm font-bold">{index + 1}</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed pt-0.5">{rec}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-10 px-4">
              <p className="text-slate-600 font-medium mb-2">{t('recommendations.empty.title')}</p>
              <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto leading-relaxed">
                {t('recommendations.empty.body')}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => navigate('/symptoms')}
                  variant="outline"
                  className="border-slate-300"
                >
                  {t('navbar.log_symptoms')}
                </Button>
                <Button
                  onClick={() => navigate('/analysis')}
                  className="bg-gradient-to-r from-teal-600 to-cyan-700 hover:from-teal-700 hover:to-cyan-800"
                >
                  {t('dashboard.run_analysis')}
                </Button>
              </div>
            </div>
          )}
        </Card>

        <div className="text-center flex flex-col items-center gap-4 pt-2">
          <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">{t('recommendations.disclaimer')}</p>
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="border-slate-300 text-slate-800"
          >
            {t('navbar.dashboard')}
          </Button>
        </div>
    </PageFrame>
  );
}

export default Recommendations;