/**
 * Unit tests for HealthMetricsSection
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HealthMetricsSection from './HealthMetricsSection';

vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
  unwrapApiPayload: vi.fn((res) => res),
}));

import { api, unwrapApiPayload } from '../services/api';

describe('HealthMetricsSection', () => {
  const mockAddNotification = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows "Not provided" for all fields when GET returns []', async () => {
    api.get.mockResolvedValue([]);
    unwrapApiPayload.mockReturnValue([]);

    render(<HealthMetricsSection addNotification={mockAddNotification} />);

    await waitFor(() => {
      expect(screen.queryByText('Systolic BP')).toBeInTheDocument();
    });

    // All five fields should show "Not provided"
    const notProvidedElements = screen.getAllByText('Not provided');
    expect(notProvidedElements.length).toBe(5);
  });

  it('"Add Entry" opens inline form', async () => {
    api.get.mockResolvedValue([]);
    unwrapApiPayload.mockReturnValue([]);

    render(<HealthMetricsSection addNotification={mockAddNotification} />);

    await waitFor(() => {
      expect(screen.getByText('Add Entry')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Entry'));

    // Form should be visible
    expect(screen.getByText('Enter your current vital signs')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('all-empty submit shows validation message and makes no API call', async () => {
    api.get.mockResolvedValue([]);
    unwrapApiPayload.mockReturnValue([]);

    render(<HealthMetricsSection addNotification={mockAddNotification} />);

    await waitFor(() => {
      expect(screen.getByText('Add Entry')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Entry'));

    // Submit without filling any fields
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(
        'Please enter at least one metric value',
        'error'
      );
    });

    // POST should not have been called
    expect(api.post).not.toHaveBeenCalled();
  });

  it('POST failure shows error notification and does not update displayed values', async () => {
    const initialRecord = {
      systolic_bp: 120,
      diastolic_bp: 80,
      blood_sugar_mg_dl: 100,
      heart_rate_bpm: 70,
      oxygen_saturation: 98,
    };

    api.get.mockResolvedValue([initialRecord]);
    unwrapApiPayload.mockReturnValue([initialRecord]);
    api.post.mockRejectedValue(new Error('Network error'));

    const { container } = render(<HealthMetricsSection addNotification={mockAddNotification} />);

    await waitFor(() => {
      expect(screen.getByText('120 mmHg')).toBeInTheDocument();
    });

    // Open form
    fireEvent.click(screen.getByText('Add Entry'));

    // Fill one field - find input by name attribute
    const systolicInput = container.querySelector('input[name="systolic_bp"]');
    fireEvent.change(systolicInput, { target: { value: '130' } });

    // Submit
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith('Network error', 'error');
    });

    // Original values should still be displayed (form should still be open)
    expect(screen.getByText('Enter your current vital signs')).toBeInTheDocument();
  });
});
