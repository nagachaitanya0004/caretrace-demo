import { useTranslation } from 'react-i18next';

const HEALTH_GOALS = [
  { value: 'symptom_check',         icon: '🩺', label: 'Check current symptoms'       },
  { value: 'chronic_management',    icon: '💊', label: 'Manage an existing condition'  },
  { value: 'preventive_care',       icon: '🛡️', label: 'Preventive health check'       },
  { value: 'general_consultation',  icon: '💬', label: 'General consultation'          },
];

function HealthGoalSelector({ value, onChange, className = '' }) {
  const { t } = useTranslation();

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-sm font-medium text-[var(--app-text)]">
        {t('symptoms.health_goal_title', { defaultValue: 'What is your goal today?' })}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Health goal">
        {HEALTH_GOALS.map((goal) => {
          const isActive = value === goal.value;
          return (
            <button
              key={goal.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onChange(goal.value)}
              className={[
                'flex items-center gap-3 p-3 rounded-[var(--radius-lg)] border-2 transition-colors duration-150 text-left',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2',
                isActive
                  ? 'border-[var(--brand-accent)] bg-[var(--brand-accent)]/8 shadow-[var(--shadow-l1)]'
                  : 'border-[var(--app-border)] bg-[var(--app-surface)] hover:border-[var(--app-border-hover)] hover:bg-[var(--app-surface-soft)]',
              ].join(' ')}
            >
              <span className="text-2xl" aria-hidden="true">{goal.icon}</span>
              <span className="text-sm font-medium text-[var(--app-text)]">
                {t(`symptoms.health_goals.${goal.value}`, { defaultValue: goal.label })}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default HealthGoalSelector;
