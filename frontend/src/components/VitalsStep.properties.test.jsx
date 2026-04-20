/**
 * Property-based tests for VitalsStep
 *
 * Validates: Requirements 6.2 (Property 6), Requirements 4.4 (Property 7)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import VitalsStep from './VitalsStep';

vi.mock('../services/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

import { api } from '../services/api';

// Field definitions mirroring VitalsStep internals
const FIELD_DEFS = [
  { key: 'systolic_bp',       label: 'Systolic BP (mmHg)',    min: 50,  max: 300, isFloat: false },
  { key: 'diastolic_bp',      label: 'Diastolic BP (mmHg)',   min: 30,  max: 200, isFloat: false },
  { key: 'blood_sugar_mg_dl', label: 'Blood Sugar (mg/dL)',   min: 0,   max: null, isFloat: true },
  { key: 'heart_rate_bpm',    label: 'Heart Rate (bpm)',      min: 20,  max: 300, isFloat: false },
  { key: 'oxygen_saturation', label: 'Oxygen Saturation (%)', min: 50,  max: 100, isFloat: false },
];

/**
 * Generates { field, value, label } where value is strictly outside the valid range.
 * For fields with only a min (blood_sugar_mg_dl), generates a negative value.
 * For fields with both min and max, generates either below-min or above-max.
 */
function outOfRangeVitalsArb() {
  return fc.oneof(
    // systolic_bp: below 50 or above 300
    fc.oneof(
      fc.integer({ min: -1000, max: 49 }),
      fc.integer({ min: 301, max: 10000 })
    ).map((value) => ({ field: 'systolic_bp', label: 'Systolic BP (mmHg)', value })),

    // diastolic_bp: below 30 or above 200
    fc.oneof(
      fc.integer({ min: -1000, max: 29 }),
      fc.integer({ min: 201, max: 10000 })
    ).map((value) => ({ field: 'diastolic_bp', label: 'Diastolic BP (mmHg)', value })),

    // blood_sugar_mg_dl: below 0 (only lower bound)
    fc.float({ min: Math.fround(-1000), max: Math.fround(-0.01), noNaN: true }).map((value) => ({
      field: 'blood_sugar_mg_dl',
      label: 'Blood Sugar (mg/dL)',
      value,
    })),

    // heart_rate_bpm: below 20 or above 300
    fc.oneof(
      fc.integer({ min: -1000, max: 19 }),
      fc.integer({ min: 301, max: 10000 })
    ).map((value) => ({ field: 'heart_rate_bpm', label: 'Heart Rate (bpm)', value })),

    // oxygen_saturation: below 50 or above 100
    fc.oneof(
      fc.integer({ min: -1000, max: 49 }),
      fc.integer({ min: 101, max: 10000 })
    ).map((value) => ({ field: 'oxygen_saturation', label: 'Oxygen Saturation (%)', value })),
  );
}

/**
 * Generates a non-empty subset of valid vital field values.
 * Returns an object like { systolic_bp: 120, heart_rate_bpm: 75 }.
 */
function nonEmptyValidVitalsSubsetArb() {
  return fc
    .record({
      systolic_bp:       fc.option(fc.integer({ min: 50,  max: 300 }), { nil: undefined }),
      diastolic_bp:      fc.option(fc.integer({ min: 30,  max: 200 }), { nil: undefined }),
      blood_sugar_mg_dl: fc.option(fc.float({ min: 0, max: Math.fround(500), noNaN: true }), { nil: undefined }),
      heart_rate_bpm:    fc.option(fc.integer({ min: 20,  max: 300 }), { nil: undefined }),
      oxygen_saturation: fc.option(fc.integer({ min: 50,  max: 100 }), { nil: undefined }),
    })
    .filter((obj) => Object.values(obj).some((v) => v !== undefined));
}

describe('VitalsStep property tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Property 6: Out-of-range value blocks submission and shows error
   * Validates: Requirements 6.2
   */
  it('Property 6 — out-of-range value blocks submission and shows error', async () => {
    await fc.assert(
      fc.asyncProperty(outOfRangeVitalsArb(), async ({ field, label, value }) => {
        api.post.mockResolvedValue({});
        const onNext = vi.fn();

        const { unmount } = render(<VitalsStep onNext={onNext} disabled={false} />);

        // Find the input by its label
        const labelEl = screen.getByText(label);
        const input = labelEl.parentElement.querySelector('input');
        fireEvent.change(input, { target: { value: String(value) } });

        fireEvent.click(screen.getByText('Next'));

        // api.post must NOT be called
        expect(api.post).not.toHaveBeenCalled();
        // onNext must NOT be called
        expect(onNext).not.toHaveBeenCalled();
        // An error message must be visible
        const fieldDef = FIELD_DEFS.find((f) => f.key === field);
        const errorEl = input.parentElement.querySelector('p');
        expect(errorEl).not.toBeNull();
        expect(errorEl.textContent.length).toBeGreaterThan(0);

        unmount();
        vi.clearAllMocks();
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Property 7: Any non-empty valid subset triggers POST then onNext
   * Validates: Requirements 4.4
   */
  it('Property 7 — any non-empty valid subset triggers POST then onNext', async () => {
    await fc.assert(
      fc.asyncProperty(nonEmptyValidVitalsSubsetArb(), async (subset) => {
        api.post.mockResolvedValue({ success: true });
        const onNext = vi.fn();

        const { unmount } = render(<VitalsStep onNext={onNext} disabled={false} />);

        // Fill each field that has a value in the subset
        for (const fieldDef of FIELD_DEFS) {
          const val = subset[fieldDef.key];
          if (val !== undefined) {
            const labelEl = screen.getByText(fieldDef.label);
            const input = labelEl.parentElement.querySelector('input');
            fireEvent.change(input, { target: { value: String(val) } });
          }
        }

        fireEvent.click(screen.getByText('Next'));

        await waitFor(() => {
          expect(api.post).toHaveBeenCalledTimes(1);
          expect(onNext).toHaveBeenCalledTimes(1);
        });

        // Verify the POST was called with the correct endpoint and subset values
        const [endpoint, payload] = api.post.mock.calls[0];
        expect(endpoint).toBe('/api/health-metrics');

        for (const fieldDef of FIELD_DEFS) {
          const val = subset[fieldDef.key];
          if (val !== undefined) {
            expect(payload).toHaveProperty(fieldDef.key);
          }
        }

        unmount();
        vi.clearAllMocks();
      }),
      { numRuns: 50 }
    );
  });
});
