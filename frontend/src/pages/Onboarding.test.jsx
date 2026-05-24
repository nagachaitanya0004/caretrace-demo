import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Onboarding from './Onboarding';

// Mock translation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: {
      resolvedLanguage: 'en',
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}));

// Mock AuthContext
vi.mock('../AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      is_onboarded: false,
    },
    setUser: vi.fn(),
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('Onboarding Component Render Test', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Onboarding />
        </BrowserRouter>
      </QueryClientProvider>
    );
    expect(container).toBeDefined();
    console.log("Onboarding render HTML succeeded!");
  });
});
