import { createContext, useState, useEffect } from 'react';
import { api } from './services/api';
import { useAuth } from './AuthContext';

const AppContext = createContext();

export function AppProvider({ children }) {
  const { user, token, logout } = useAuth();
  
  const [userProfile, setUserProfile] = useState({});
  const [symptoms, setSymptoms] = useState([]);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAppData = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      // Parallelize fetches mapping cleanly
      const [userRes, symptomsRes, alertsRes] = await Promise.all([
        api.get(`/users/${user.id}`),
        api.get(`/symptoms/${user.id}`),
        api.get(`/alerts/${user.id}`)
      ]);
      
      setUserProfile(userRes.data || {});
      setSymptoms(symptomsRes.data || []);
      setAlerts(alertsRes.data || []);
      
      // Auto-pull existing analysis avoiding unhandled promise rejections if it throws 404
      try {
        const anaRes = await api.get(`/analysis/${user.id}`);
        setAnalysisResult(anaRes.data);
      } catch (e) {
        setAnalysisResult(null);
      }
    } catch (e) {
      console.error("Failed fetching context data", e);
      if (logout) logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchAppData();
    } else {
      setUserProfile({});
      setSymptoms([]);
      setAlerts([]);
      setAnalysisResult(null);
    }
  }, [user]);

  const addSymptom = async (symptomParams) => {
    if (!user?.id) return;
    try {
      const payload = { ...symptomParams, user_id: user.id, date: new Date().toISOString() };
      await api.post('/symptoms/', payload);
      await fetchAppData(); // Refresh UI dynamically natively!
    } catch (e) {
      throw e;
    }
  };

  const performAnalysis = async () => {
    if (!user?.id) return;
    try {
      const res = await api.post(`/analysis/${user.id}`);
      setAnalysisResult(res.data);
      await fetchAppData(); // Pull new alerts if generated
    } catch (e) {
      throw e;
    }
  };

  const hasAlert = () => alerts.length > 0;
  const riskLevel = analysisResult?.risk || 'Pending';

  const value = {
    userProfile,
    symptoms,
    analysisResult,
    alerts,
    isLoading,
    riskLevel,
    addSymptom,
    performAnalysis,
    hasAlert,
    refreshData: fetchAppData
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export { AppContext };
