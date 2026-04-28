import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import {
  useOnboardingFamEntries,
  useOnboardingStore,
} from '../../../store/useOnboardingStore';
import { useOnboardingFlow } from '../../../hooks/useOnboardingFlow';

const familyHistorySchema = z.object({
  entries: z.array(
    z.object({
      condition: z.string().trim().max(120).optional().or(z.literal('')),
      relation: z.string().trim().max(80).optional().or(z.literal('')),
    })
  ),
});

const CONDITION_OPTIONS = ['Diabetes', 'Heart Disease', 'Hypertension', 'Cancer', 'Stroke', 'Asthma', 'Other'];
const RELATION_OPTIONS = ['Father', 'Mother', 'Sibling', 'Grandparent', 'Other'];

const SelectChevron = () => (
  <svg
    className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-text-muted)] pointer-events-none"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

function buildPayload(entries) {
  return {
    entries: entries
      .filter((entry) => entry.condition?.trim())
      .map((entry) => ({
        condition_name: entry.condition.trim(),
        relation: entry.relation?.trim() || undefined,
      })),
  };
}

export default function FamilyHistoryStep({ onNext }) {
  const { t } = useTranslation();
  const familyEntries = useOnboardingFamEntries();
  const updateFamEntries = useOnboardingStore((state) => state.updateFamEntries);
  const { syncSection } = useOnboardingFlow();

  const { control, register, handleSubmit } = useForm({
    resolver: zodResolver(familyHistorySchema),
    defaultValues: {
      entries: familyEntries?.length ? familyEntries : [{ condition: '', relation: '' }],
    },
    mode: 'onTouched',
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'entries' });

  const onSubmit = (data) => {
    updateFamEntries(data.entries);
    onNext();

    const payload = buildPayload(data.entries);
    void syncSection('family', '/api/family-history', payload.entries.length ? payload : {}, 'post');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="fade-in space-y-4">
      <p className="text-sm text-[var(--app-text-muted)]">{t('onboarding.family.hint')}</p>

      {fields.map((field, index) => (
        <div
          key={field.id}
          className="relative flex flex-col gap-3 rounded-lg border border-[var(--app-border-soft)] bg-[var(--app-surface-soft)] p-4 sm:flex-row sm:items-end"
        >
          <div className="w-full flex-1">
            {index === 0 && (
              <label className="mb-1.5 block text-xs font-medium text-[var(--app-text-muted)]">
                {t('onboarding.family.condition')}
              </label>
            )}
            <div className="relative">
              <select
                {...register(`entries.${index}.condition`)}
                className="input-premium w-full appearance-none px-3.5 py-2.5 pr-10 text-sm"
              >
                <option value="">{t('onboarding.family.condition_select')}</option>
                {CONDITION_OPTIONS.map((condition) => (
                  <option key={condition} value={condition}>
                    {condition}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
          </div>

          <div className="w-full flex-1">
            {index === 0 && (
              <label className="mb-1.5 block text-xs font-medium text-[var(--app-text-muted)]">
                {t('onboarding.family.relation')}
              </label>
            )}
            <div className="relative">
              <select
                {...register(`entries.${index}.relation`)}
                className="input-premium w-full appearance-none px-3.5 py-2.5 pr-10 text-sm"
              >
                <option value="">{t('onboarding.family.relation_select')}</option>
                {RELATION_OPTIONS.map((relation) => (
                  <option key={relation} value={relation}>
                    {relation}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
          </div>

          <button
            type="button"
            onClick={() => remove(index)}
            disabled={fields.length === 1}
            aria-label={t('onboarding.actions.remove')}
            className="rounded-lg p-2.5 text-[var(--app-text-disabled)] transition-colors hover:bg-rose-500/10 hover:text-rose-500 active:scale-95 disabled:pointer-events-none disabled:opacity-30"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => append({ condition: '', relation: '' })}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--app-border)] py-3.5 text-sm font-medium text-[var(--app-text-muted)] transition-all duration-200 hover:border-[var(--app-accent)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--app-text)] active:scale-[0.98]"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
        </svg>
        {t('onboarding.actions.add_condition')}
      </button>

      <div className="mt-8 flex flex-col items-center gap-3.5 border-t border-[var(--app-border-soft)] pt-6">
        <button
          type="submit"
          className="btn-glow-cta w-full rounded-[var(--radius-md)] bg-[var(--app-accent)] px-4 py-3.5 text-sm font-semibold text-[var(--brand-accent-on,#000)] shadow-[0_0_20px_rgba(226,255,50,0.15)] transition-all duration-200 hover:shadow-[0_0_25px_rgba(226,255,50,0.25)] active:scale-[0.98]"
        >
          {t('onboarding.actions.next')}
        </button>
        <button
          type="button"
          onClick={onNext}
          className="text-sm font-medium text-[var(--app-text-muted)] transition-colors duration-200 hover:text-[var(--app-text)] active:scale-[0.98]"
        >
          {t('onboarding.actions.skip')}
        </button>
      </div>
    </form>
  );
}
