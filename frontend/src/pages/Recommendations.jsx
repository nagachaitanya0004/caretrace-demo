import { useNavigate } from 'react-router-dom';
import { useContext, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AppContext } from '../AppContext';
import Card from '../components/Card';
import Button from '../components/Button';
import PageFrame from '../components/PageFrame';

function Recommendations() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { analysisResult, userProfile, symptoms } = useContext(AppContext);

  const getRecommendations = useCallback((risk) => {
    if (!risk) return t('recommendations.risk_plans.default', { returnObjects: true });
    const riskKey = risk.toLowerCase();
    switch (riskKey) {
      case 'low':    return t('recommendations.risk_plans.low',    { returnObjects: true });
      case 'medium': return t('recommendations.risk_plans.medium', { returnObjects: true });
      case 'high':   return t('recommendations.risk_plans.high',   { returnObjects: true });
      default:       return t('recommendations.risk_plans.default', { returnObjects: true });
    }
  }, [t]);

  const personalizedRecs = useMemo(() => {
    const baseRecs = analysisResult ? getRecommendations(analysisResult.risk) : [];
    const recs = Array.isArray(baseRecs) ? [...baseRecs] : [];
    const risk = analysisResult?.risk?.toLowerCase();

    // 1. Sedentary + Medium+ Risk
    if (userProfile?.lifestyle?.toLowerCase() === 'sedentary' && (risk === 'medium' || risk === 'high')) {
      recs.push(t('recommendations.personalized.sedentary_exercise', 'Based on your sedentary lifestyle and risk profile, consider incorporating 15 minutes of light walking daily to improve circulation.'));
    }

    // 2. Age > 50
    if (userProfile?.age > 50) {
      recs.push(t('recommendations.personalized.age_screening', 'Given your age group, we recommend scheduling an annual cardiovascular screening and bone density test.'));
    }

    // 3. Chronic Match
    const last7DaysSymptoms = (symptoms || []).filter(s => {
      const d = new Date(s.date);
      return (new Date() - d) / (1000 * 60 * 60 * 24) <= 7;
    });
    
    if (userProfile?.conditions && Array.isArray(userProfile.conditions)) {
      const recentSymptomNames = last7DaysSymptoms.map(s => s.symptom?.toLowerCase());
      const matchedCondition = userProfile.conditions.find(c => recentSymptomNames.includes(c.toLowerCase()));
      if (matchedCondition) {
        recs.push(t('recommendations.personalized.chronic_specialist', { 
          condition: matchedCondition,
          defaultValue: `Your recent symptoms may be related to your chronic condition (${matchedCondition}). Consider consulting your specialist for a targeted review.`
        }));
      }
    }

    return recs;
  }, [analysisResult, userProfile, symptoms, t, getRecommendations]);

  const recommendations = personalizedRecs;

  return (
    <PageFrame
      title={t('recommendations.title')}
      subtitle={t('recommendations.subtitle')}
      headAlign="center"
      maxWidthClass="max-w-4xl"
    >
      <Card elevation={1}>
        <h2 className="text-lg font-semibold text-[var(--app-text)] mb-6">
          {t('recommendations.section_title')}
        </h2>

        {recommendations.length > 0 ? (
          <ul className="space-y-4">
            {recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-[var(--app-surface-soft)] border border-[var(--app-border)] rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-[var(--app-text)] text-sm font-bold">{index + 1}</span>
                </div>
                <p className="text-[var(--app-text-muted)] leading-relaxed pt-0.5">{rec}</p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-10 px-4">
            <p className="text-[var(--app-text)] font-medium mb-2">{t('recommendations.empty.title')}</p>
            <p className="text-sm text-[var(--app-text-muted)] mb-6 max-w-md mx-auto leading-relaxed">
              {t('recommendations.empty.body')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button intent="secondary" size="md" onClick={() => navigate('/symptoms')}>
                {t('navbar.log_symptoms')}
              </Button>
              <Button intent="cta" size="md" onClick={() => navigate('/analysis')}>
                {t('dashboard.run_analysis')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="text-center flex flex-col items-center gap-4 pt-2">
        <p className="text-sm text-[var(--app-text-muted)] max-w-2xl leading-relaxed">
          {t('recommendations.disclaimer')}
        </p>
        <Button intent="secondary" size="md" onClick={() => navigate('/dashboard')}>
          {t('navbar.dashboard')}
        </Button>
      </div>
    </PageFrame>
  );
}

export default Recommendations;
