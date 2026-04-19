import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { AppProvider } from './AppContext';
import { NotificationProvider } from './NotificationContext';
import { ThemeProvider } from './ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Symptoms from './pages/Symptoms';
import Timeline from './pages/Timeline';
import Analysis from './pages/Analysis';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import History from './pages/History';
import Recommendations from './pages/Recommendations';

function App() {
  const { i18n } = useTranslation();
  
  useEffect(() => {
    document.documentElement.lang = i18n.language.split('-')[0];
  }, [i18n.language]);

  return (
    <NotificationProvider>
      <AuthProvider>
        <ThemeProvider>
          <AppProvider>
            <Router>
              <Routes>
              {/* Landing Page - standalone with its own design */}
              <Route path="/" element={<Landing />} />

              {/* Auth Exclusive Unprotected Portal */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Full App Layout Routes Protected by JWT */}
              <Route 
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/symptoms" element={<Symptoms />} />
                <Route path="/timeline" element={<Timeline />} />
                <Route path="/history" element={<History />} />
                <Route path="/analysis" element={<Analysis />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/recommendations" element={<Recommendations />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Routes>
            </Router>
          </AppProvider>
        </ThemeProvider>
      </AuthProvider>
    </NotificationProvider>
  );
}

export default App;
