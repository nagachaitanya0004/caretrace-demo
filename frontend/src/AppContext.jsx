import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
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
  const { user, logout } = useAuth();
  const demoEmail = DEMO_EMAIL.toLowerCase();

  const [userProfile, setUserProfile] = useState({});
  const [symptoms, setSymptoms] = useState([]);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const isDemoUser = useMemo(() => {
    const e = user?.email || userProfile?.email;
    return typeof e === 'string' && e.toLowerCase() === demoEmail;
  }, [user?.email, userProfile?.email, demoEmail]);

  const applyDemoFallback = useCallback(() => {
    const uid = user?.id;
    if (!uid) return;
    setUserProfile({ ...DEMO_FALLBACK_PROFILE, id: uid });
    setSymptoms(
      DEMO_FALLBACK_SYMPTOMS.map((s) => normalizeSymptom({ ...s, user_id: uid }))
    );
    setAlerts(
      DEMO_FALLBACK_ALERTS.map((a) => ({ ...a, user_id: uid }))
    );
    setAnalysisResult(
      normalizeAnalysisPayload({ ...DEMO_FALLBACK_ANALYSIS, user_id: uid })
    );
    setLoadError(null);
  }, [user?.id]);

  const fetchAppData = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    setLoadError(null);
    const uid = user.id;
    try {
      const [userRes, symptomsRes, alertsRes] = await Promise.all([
        api.get('/api/users/me'),
        api.get('/api/symptoms'),
        api.get('/api/alerts'),
      ]);

      let profile = unwrapApiPayload(userRes) || {};
      let symList = unwrapApiPayload(symptomsRes);
      if (!Array.isArray(symList)) symList = [];
      symList = symList.map(normalizeSymptom);
      let alertList = unwrapApiPayload(alertsRes);
      if (!Array.isArray(alertList)) alertList = [];

      const emailMatchesDemo =
        typeof profile.email === 'string' && profile.email.toLowerCase() === demoEmail;
      const treatAsDemo = isDemoUser || emailMatchesDemo;

      if (treatAsDemo) {
        if (!symList.length) {
          symList = DEMO_FALLBACK_SYMPTOMS.map((s) =>
            normalizeSymptom({ ...s, user_id: uid })
          );
        }
        if (!alertList.length) {
          alertList = DEMO_FALLBACK_ALERTS.map((a) => ({ ...a, user_id: uid }));
        }
        if (!profile?.email) {
          profile = { ...DEMO_FALLBACK_PROFILE, id: uid };
        }
      }

      setUserProfile(profile);
      setSymptoms(symList);
      setAlerts(alertList);

      try {
        const anaRes = await api.get('/api/analysis');
        const anaList = unwrapApiPayload(anaRes);
        const list = Array.isArray(anaList) ? anaList : [];
        let analysis = list.length ? normalizeAnalysisPayload(list[0]) : null;
        if (treatAsDemo && !analysis) {
          analysis = normalizeAnalysisPayload({ ...DEMO_FALLBACK_ANALYSIS, user_id: uid });
        }
        setAnalysisResult(analysis);
      } catch {
        setAnalysisResult(
          treatAsDemo ? normalizeAnalysisPayload({ ...DEMO_FALLBACK_ANALYSIS, user_id: uid }) : null
        );
      }
    } catch (err) {
      console.error('Failed fetching context data', err);
      if (err?.status === 401) {
        if (logout) logout();
      } else if (isDemoUser) {
        applyDemoFallback();
      } else {
        setLoadError(err?.message || 'Failed to load data');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, logout, isDemoUser, applyDemoFallback, demoEmail]);

  useEffect(() => {
    if (user?.id) {
      fetchAppData();
    } else {
      setUserProfile({});
      setSymptoms([]);
      setAlerts([]);
      setAnalysisResult(null);
    }
  }, [user?.id, fetchAppData]);

  const addSymptom = useCallback(
    async (symptomParams) => {
      if (!user?.id) return;
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
      // Store structured extras in context so they flow to all existing consumers
      const context = {};
      if (frequency) context.frequency = frequency;
      if (duration_text) context.duration_text = duration_text;
      if (Object.keys(context).length > 0) payload.context = context;
      await api.post('/api/symptoms', payload);
      await fetchAppData();
    },
    [user?.id, fetchAppData]
  );

  const performAnalysis = useCallback(async () => {
    if (!user?.id) return;
    const res = await api.post('/api/analysis', {});
    setAnalysisResult(normalizeAnalysisPayload(unwrapApiPayload(res)));
    await fetchAppData();
  }, [user?.id, fetchAppData]);

  const hasAlert = useCallback(() => alerts.length > 0, [alerts]);

  const riskLevel = analysisResult?.risk || 'Pending';

  const EMPTY_MEDS = useMemo(() => [], []);
  const demoMedications = isDemoUser ? DEMO_MEDICATIONS : EMPTY_MEDS;

  const value = useMemo(
    () => ({
      userProfile,
      symptoms,
      analysisResult,
      alerts,
      isLoading,
      loadError,
      isDemoUser,
      demoMedications,
      riskLevel,
      addSymptom,
      performAnalysis,
      hasAlert,
      refreshData: fetchAppData,
      clearLoadError: () => setLoadError(null),
    }),
    [
      userProfile,
      symptoms,
      analysisResult,
      alerts,
      isLoading,
      loadError,
      isDemoUser,
      demoMedications,
      riskLevel,
      addSymptom,
      performAnalysis,
      hasAlert,
      fetchAppData,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export { AppContext };
