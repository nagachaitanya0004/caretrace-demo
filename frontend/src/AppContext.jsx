import { createContext, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, unwrapApiPayload } from './services/api';
import { useAuth } from './AuthContext';
import { DEMO_EMAIL, DEMO_MEDICATIONS } from './constants/demoAccount';
import {
  DEMO_FALLBACK_PROFILE,
  DEMO_FALLBACK_SYMPTOMS,
  DEMO_FALLBACK_ALERTS,
  DEMO_FALLBACK_ANALYSIS,
} from './constants/demoFallbackData';

const AppContext = createContext();

/** API returns risk_level (and mixed casing); UI expects risk: Low | Medium | High */
function normalizeRiskLevel(level) {
  if (level == null || level === '') return null;
  const s = String(level).trim().toLowerCase();
  if (s === 'low') return 'Low';
  if (s === 'medium') return 'Medium';
  if (s === 'high') return 'High';
  return null;
}

function normalizeAnalysisPayload(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const risk = normalizeRiskLevel(raw.risk ?? raw.risk_level);
  const summary = raw.summary != null ? String(raw.summary) : '';
  const recommendation =
    raw.recommendation != null && String(raw.recommendation).trim() !== ''
      ? String(raw.recommendation)
      : summary;
  return {
    ...raw,
    risk: risk ?? raw.risk ?? raw.risk_level,
    recommendation,
  };
}

/** Symptoms use timestamp from API; charts/timeline expect date */
function normalizeSymptom(s) {
  if (!s || typeof s !== 'object') return s;
  const date = s.date ?? s.timestamp;
  return { ...s, date };
}

export function AppProvider({ children }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const demoEmail = DEMO_EMAIL.toLowerCase();

  const isDemoUser = useMemo(() => {
    const e = user?.email;
    return typeof e === 'string' && e.toLowerCase() === demoEmail;
  }, [user?.email, demoEmail]);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: userProfileRaw, isLoading: profileLoading } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      const res = await api.get('/api/users/me');
      return unwrapApiPayload(res) || {};
    },
    enabled: !!user?.id,
  });

  const { data: symptomsRaw, isLoading: symptomsLoading } = useQuery({
    queryKey: ['symptoms', user?.id],
    queryFn: async () => {
      const res = await api.get('/api/symptoms');
      const list = unwrapApiPayload(res);
      return Array.isArray(list) ? list.map(normalizeSymptom) : [];
    },
    enabled: !!user?.id,
  });

  const { data: alertsRaw, isLoading: alertsLoading } = useQuery({
    queryKey: ['alerts', user?.id],
    queryFn: async () => {
      const res = await api.get('/api/alerts');
      const list = unwrapApiPayload(res);
      return Array.isArray(list) ? list : [];
    },
    enabled: !!user?.id,
  });

  const { data: analysesRaw, isLoading: analysisLoading } = useQuery({
    queryKey: ['analyses', user?.id],
    queryFn: async () => {
      const res = await api.get('/api/analysis');
      const list = unwrapApiPayload(res);
      return Array.isArray(list) ? list.map(normalizeAnalysisPayload) : [];
    },
    enabled: !!user?.id,
  });

  // ── Demo Logic ─────────────────────────────────────────────────────────────

  const userProfile = useMemo(() => {
    if (!isDemoUser) return userProfileRaw || {};
    return { ...DEMO_FALLBACK_PROFILE, ...userProfileRaw, id: user?.id };
  }, [isDemoUser, userProfileRaw, user?.id]);

  const symptoms = useMemo(() => {
    const apiSymptoms = symptomsRaw || [];
    if (!isDemoUser) return apiSymptoms;
    const fallback = DEMO_FALLBACK_SYMPTOMS.map(s => normalizeSymptom({ ...s, user_id: user?.id }));
    return [...apiSymptoms, ...fallback];
  }, [isDemoUser, symptomsRaw, user?.id]);

  const alerts = useMemo(() => {
    const apiAlerts = alertsRaw || [];
    if (!isDemoUser) return apiAlerts;
    const fallback = DEMO_FALLBACK_ALERTS.map(a => ({ ...a, user_id: user?.id }));
    return [...apiAlerts, ...fallback];
  }, [isDemoUser, alertsRaw, user?.id]);

  const analysisResult = useMemo(() => {
    const list = analysesRaw || [];
    const latest = list[0];
    if (!isDemoUser) return latest;
    if (latest && latest.risk !== 'Pending') {
      return latest;
    }
    return normalizeAnalysisPayload({ ...DEMO_FALLBACK_ANALYSIS, user_id: user?.id });
  }, [isDemoUser, analysesRaw, user?.id]);

  const analysisHistory = useMemo(() => {
    return analysesRaw || [];
  }, [analysesRaw]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const addSymptomMutation = useMutation({
    mutationFn: async (symptomParams) => {
      const { date, notes, symptom, duration, severity, frequency, duration_text } = symptomParams;
      const payload = {
        symptom,
        duration: Number(duration) || 0,
        severity: Number(severity),
      };
      if (notes) payload.notes = notes;
      if (date) {
        const d = typeof date === 'string' && !date.includes('T')
          ? new Date(`${date}T12:00:00`)
          : new Date(date);
        if (!Number.isNaN(d.getTime())) payload.timestamp = d.toISOString();
      }
      if (!payload.timestamp) {
        payload.timestamp = new Date().toISOString();
      }
      const context = {};
      if (frequency) context.frequency = frequency;
      if (duration_text) context.duration_text = duration_text;
      if (Object.keys(context).length > 0) payload.context = context;
      return api.post('/api/symptoms', payload);
    },
    onMutate: async (newSymptom) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['symptoms', user?.id] });
      const previousSymptoms = queryClient.getQueryData(['symptoms', user?.id]);
      
      const optimisticSymptom = normalizeSymptom({
        ...newSymptom,
        id: `temp-${Date.now()}`,
        timestamp: newSymptom.date || new Date().toISOString(),
        user_id: user?.id
      });

      queryClient.setQueryData(['symptoms', user?.id], (old) => [optimisticSymptom, ...(old || [])]);
      return { previousSymptoms };
    },
    onError: (err, newSymptom, context) => {
      queryClient.setQueryData(['symptoms', user?.id], context.previousSymptoms);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['symptoms', user?.id] });
    },
  });

  const performAnalysisMutation = useMutation({
    mutationFn: () => api.post('/api/analysis', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyses', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['alerts', user?.id] });
    },
  });

  const markAlertReadMutation = useMutation({
    mutationFn: (alertId) => api.patch(`/api/alerts/${alertId}/read`),
    onMutate: async (alertId) => {
      await queryClient.cancelQueries({ queryKey: ['alerts', user?.id] });
      const previousAlerts = queryClient.getQueryData(['alerts', user?.id]);
      
      queryClient.setQueryData(['alerts', user?.id], (old) => 
        (old || []).map(a => a.id === alertId ? { ...a, is_read: true } : a)
      );
      
      return { previousAlerts };
    },
    onError: (err, alertId, context) => {
      queryClient.setQueryData(['alerts', user?.id], context.previousAlerts);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', user?.id] });
    },
  });

  const isLoading = profileLoading || symptomsLoading || alertsLoading || analysisLoading;
  const riskLevel = analysisResult?.risk || 'Pending';

  const value = useMemo(
    () => ({
      userProfile,
      symptoms,
      analysisResult,
      analysisHistory,
      alerts,
      isLoading,
      isDemoUser,
      demoMedications: isDemoUser ? DEMO_MEDICATIONS : [],
      riskLevel,
      addSymptom: addSymptomMutation.mutateAsync,
      performAnalysis: performAnalysisMutation.mutateAsync,
      markAlertRead: markAlertReadMutation.mutateAsync,
      hasAlert: () => alerts.length > 0,
      refreshData: () => queryClient.invalidateQueries({ queryKey: [user?.id] }),
    }),
    [
      userProfile,
      symptoms,
      analysisResult,
      analysisHistory,
      alerts,
      isLoading,
      isDemoUser,
      riskLevel,
      addSymptomMutation,
      performAnalysisMutation,
      markAlertReadMutation,
      queryClient,
      user?.id
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export { AppContext };
