import { useTranslation } from 'react-i18next';

const HEALTH_GOALS = [
  { value: 'symptom_check',         icon: <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>, label: 'Check current symptoms'       },
  { value: 'chronic_management',    icon: <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>, label: 'Manage an existing condition'  },
  { value: 'preventive_care',       icon: <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>, label: 'Preventive health check'       },
  { value: 'general_consultation',  icon: <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>, label: 'General consultation'          },
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
              <span className="text-2xl flex-shrink-0" aria-hidden="true">{goal.icon}</span>
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
