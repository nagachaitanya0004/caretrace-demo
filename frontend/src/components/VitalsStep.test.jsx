import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VitalsStep from './VitalsStep';

// Mock the api service
vi.mock('../services/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

import { api } from '../services/api';

const LABELS = [
  'Systolic BP (mmHg)',
  'Diastolic BP (mmHg)',
  'Blood Sugar (mg/dL)',
  'Heart Rate (bpm)',
  'Oxygen Saturation (%)',
];

describe('VitalsStep', () => {
  let onNext;

  beforeEach(() => {
    onNext = vi.fn();
    vi.clearAllMocks();
  });

  it('renders five labeled inputs', () => {
    render(<VitalsStep onNext={onNext} disabled={false} />);
    for (const label of LABELS) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs).toHaveLength(5);
  });

  it('Skip advances without API call', async () => {
    render(<VitalsStep onNext={onNext} disabled={false} />);
    fireEvent.click(screen.getByText('Skip'));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('All-empty Next advances without API call', async () => {
    render(<VitalsStep onNext={onNext} disabled={false} />);
    fireEvent.click(screen.getByText('Next'));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('POST failure still advances (non-blocking)', async () => {
    api.post.mockRejectedValueOnce(new Error('Network error'));

    render(<VitalsStep onNext={onNext} disabled={false} />);

    // Fill one valid field
    const inputs = screen.getAllByRole('spinbutton');
    await userEvent.type(inputs[0], '120'); // systolic_bp = 120 (valid)

    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(onNext).toHaveBeenCalledTimes(1);
    });
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('Inputs and buttons disabled while submitting', async () => {
    // api.post never resolves (pending promise)
    api.post.mockReturnValueOnce(new Promise(() => {}));

    render(<VitalsStep onNext={onNext} disabled={false} />);

    const inputs = screen.getAllByRole('spinbutton');
    await userEvent.type(inputs[0], '120'); // systolic_bp = 120 (valid)

    fireEvent.click(screen.getByText('Next'));

    // While submitting, all inputs and buttons should be disabled
    await waitFor(() => {
      const allInputs = screen.getAllByRole('spinbutton');
      for (const input of allInputs) {
        expect(input).toBeDisabled();
      }
      expect(screen.getByText('Saving…')).toBeDisabled();
      expect(screen.getByText('Skip')).toBeDisabled();
    });
  });
});
