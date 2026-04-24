import { useTranslation } from 'react-i18next';

const HEALTH_GOALS = [
  { value: 'symptom_check', icon: '🩺', label: 'Check current symptoms' },
  { value: 'chronic_management', icon: '💊', label: 'Manage an existing condition' },
  { value: 'preventive_care', icon: '🛡️', label: 'Preventive health check' },
  { value: 'general_consultation', icon: '💬', label: 'General consultation' },
];

function HealthGoalSelector({ value, onChange, className = '' }) {
  const { t } = useTranslation();

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-sm font-medium text-gray-700">
        {t('symptoms.health_goal_title', { defaultValue: 'What is your goal today?' })}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {HEALTH_GOALS.map((goal) => (
          <button
            key={goal.value}
            type="button"
            onClick={() => onChange(goal.value)}
            className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
              value === goal.value
                ? 'border-teal-500 bg-teal-50 shadow-sm'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <span className="text-2xl">{goal.icon}</span>
            <span className="text-sm font-medium text-gray-800">
              {t(`symptoms.health_goals.${goal.value}`, { defaultValue: goal.label })}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default HealthGoalSelector;
