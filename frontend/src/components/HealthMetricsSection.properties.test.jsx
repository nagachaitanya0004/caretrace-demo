/**
 * Property-based tests for HealthMetricsSection
 *
 * Validates: Requirements 6.2 (Property 6), Requirements 5.6 (Property 8)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import HealthMetricsSection from './HealthMetricsSection';

vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
  unwrapApiPayload: vi.fn((res) => res),
}));

import { api, unwrapApiPayload } from '../services/api';

// Field definitions mirroring HealthMetricsSection internals
const FIELD_DEFS = [
  { key: 'systolic_bp',       label: 'Systolic BP (mmHg)',    min: 50,  max: 300, isFloat: false },
  { key: 'diastolic_bp',      label: 'Diastolic BP (mmHg)',   min: 30,  max: 200, isFloat: false },
  { key: 'blood_sugar_mg_dl', label: 'Blood Sugar (mg/dL)',   min: 0,   max: null, isFloat: true },
  { key: 'heart_rate_bpm',    label: 'Heart Rate (bpm)',      min: 20,  max: 300, isFloat: false },
  { key: 'oxygen_saturation', label: 'Oxygen Saturation (%)', min: 50,  max: 100, isFloat: false },
];

/**
 * Generates { field, value, label } where value is strictly outside the valid range.
 */
function outOfRangeVitalsArb() {
  return fc.oneof(
    fc.oneof(
      fc.integer({ min: -1000, max: 49 }),
      fc.integer({ min: 301, max: 10000 })
    ).map((value) => ({ field: 'systolic_bp', label: 'Systolic BP (mmHg)', value })),

    fc.oneof(
      fc.integer({ min: -1000, max: 29 }),
      fc.integer({ min: 201, max: 10000 })
    ).map((value) => ({ field: 'diastolic_bp', label: 'Diastolic BP (mmHg)', value })),

    fc.float({ min: Math.fround(-1000), max: Math.fround(-0.01), noNaN: true }).map((value) => ({
      field: 'blood_sugar_mg_dl',
      label: 'Blood Sugar (mg/dL)',
      value,
    })),

    fc.oneof(
      fc.integer({ min: -1000, max: 19 }),
      fc.integer({ min: 301, max: 10000 })
    ).map((value) => ({ field: 'heart_rate_bpm', label: 'Heart Rate (bpm)', value })),

    fc.oneof(
      fc.integer({ min: -1000, max: 49 }),
      fc.integer({ min: 101, max: 10000 })
    ).map((value) => ({ field: 'oxygen_saturation', label: 'Oxygen Saturation (%)', value })),
  );
}

/**
 * Generates a non-empty subset of valid vital field values.
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

describe('HealthMetricsSection property tests', () => {
  const mockAddNotification = vi.fn();

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
        api.get.mockResolvedValue([]);
        unwrapApiPayload.mockReturnValue([]);
        api.post.mockResolvedValue({});

        const { unmount, container } = render(<HealthMetricsSection addNotification={mockAddNotification} />);

        // Wait for component to load
        await waitFor(() => {
          expect(screen.getByText('Add Entry')).toBeInTheDocument();
        });

        // Open form
        fireEvent.click(screen.getByText('Add Entry'));

        // Find the input by name attribute
        const fieldDef = FIELD_DEFS.find((f) => f.key === field);
        const input = container.querySelector(`input[name="${field}"]`);
        fireEvent.change(input, { target: { value: String(value) } });

        // Click Save
        fireEvent.click(screen.getByText('Save'));

        // api.post must NOT be called
        expect(api.post).not.toHaveBeenCalled();
        // An error message must be visible
        await waitFor(() => {
          const errorEl = input.parentElement.querySelector('p.text-xs.text-red-500');
          expect(errorEl).not.toBeNull();
          expect(errorEl.textContent.length).toBeGreaterThan(0);
        });

        unmount();
        vi.clearAllMocks();
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Property 8: Any non-empty valid subset triggers POST, re-fetches GET, calls addNotification with success
   * Validates: Requirements 5.6
   */
  it('Property 8 — any non-empty valid subset triggers POST, re-fetches GET, calls addNotification with success', async () => {
    await fc.assert(
      fc.asyncProperty(nonEmptyValidVitalsSubsetArb(), async (subset) => {
        api.get.mockResolvedValue([]);
        unwrapApiPayload.mockReturnValue([]);
        api.post.mockResolvedValue({ success: true });

        const { unmount, container } = render(<HealthMetricsSection addNotification={mockAddNotification} />);

        // Wait for component to load
        await waitFor(() => {
          expect(screen.getByText('Add Entry')).toBeInTheDocument();
        });

        // Open form
        fireEvent.click(screen.getByText('Add Entry'));

        // Fill each field that has a value in the subset
        for (const fieldDef of FIELD_DEFS) {
          const val = subset[fieldDef.key];
          if (val !== undefined) {
            const input = container.querySelector(`input[name="${fieldDef.key}"]`);
            fireEvent.change(input, { target: { value: String(val) } });
          }
        }

        // Click Save
        fireEvent.click(screen.getByText('Save'));

        await waitFor(() => {
          // POST should be called once
          expect(api.post).toHaveBeenCalledTimes(1);
          // GET should be called twice (initial load + re-fetch)
          expect(api.get).toHaveBeenCalledTimes(2);
          // addNotification should be called with success
          expect(mockAddNotification).toHaveBeenCalledWith('Vitals recorded', 'success');
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
