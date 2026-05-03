import { useContext } from 'react';
import { AppContext } from '../AppContext';

/**
 * Hook to access core app data from AppContext.
 * Using named selectors prevents components from destructuring the entire context,
 * which helps with code clarity and readability.
 */
export function useAppData() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppProvider');
  }
  return context;
}

export function useSymptoms() {
  const { symptoms, isLoading, isDemoUser, addSymptom } = useAppData();
  return { symptoms, isLoading, isDemoUser, addSymptom };
}

export function useAnalysis() {
  const { analysisResult, riskLevel, isLoading, performAnalysis } = useAppData();
  return { analysisResult, riskLevel, isLoading, performAnalysis };
}

export function useAlerts() {
  const { alerts, hasAlert, isLoading } = useAppData();
  return { alerts, hasAlert: hasAlert(), isLoading };
}

export function useUserProfile() {
  const { userProfile, isLoading, isDemoUser } = useAppData();
  return { userProfile, isLoading, isDemoUser };
}
