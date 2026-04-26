import { lazy, Suspense, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { AppProvider } from './AppContext';
import { NotificationProvider } from './NotificationContext';
import { ThemeProvider } from './ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// ── Eager: critical path (landing + auth shown immediately) ──────────────────
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';

// ── Lazy: app routes — only loaded after authentication ──────────────────────
// Each chunk is split at the route boundary, reducing initial JS parse time.
const Dashboard       = lazy(() => import('./pages/Dashboard'));
const Onboarding      = lazy(() => import('./pages/Onboarding'));
const HealthProfile   = lazy(() => import('./pages/HealthProfile'));
const Symptoms        = lazy(() => import('./pages/Symptoms'));
const Timeline        = lazy(() => import('./pages/Timeline'));
const History         = lazy(() => import('./pages/History'));
const Analysis        = lazy(() => import('./pages/Analysis'));
const Alerts          = lazy(() => import('./pages/Alerts'));
const Reports         = lazy(() => import('./pages/Reports'));
const Settings        = lazy(() => import('./pages/Settings'));
const Recommendations = lazy(() => import('./pages/Recommendations'));

// ── Minimal route-level loading fallback — no layout shift ───────────────────
function RouteLoader() {
  return (
    <div
      className="flex min-h-[60vh] items-center justify-center"
      aria-label="Loading page"
      role="status"
    >
      <span className="h-8 w-8 rounded-full border-4 border-[var(--app-border)] border-t-[var(--app-accent)] animate-spin" />
    </div>
  );
}

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
              <Suspense fallback={<RouteLoader />}>
                <Routes>
                  {/* ── Public routes — eager loaded ─────────────────── */}
                  <Route path="/" element={<Landing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />

                  {/* ── Onboarding — protected, outside main layout ───── */}
                  <Route
                    path="/onboarding"
                    element={
                      <ProtectedRoute>
                        <Onboarding />
                      </ProtectedRoute>
                    }
                  />

                  {/* ── App routes — protected, inside Layout ─────────── */}
                  <Route
                    element={
                      <ProtectedRoute>
                        <Layout />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/dashboard"      element={<Dashboard />} />
                    <Route path="/health-profile" element={<HealthProfile />} />
                    <Route path="/symptoms"       element={<Symptoms />} />
                    <Route path="/timeline"       element={<Timeline />} />
                    <Route path="/history"        element={<History />} />
                    <Route path="/analysis"       element={<Analysis />} />
                    <Route path="/alerts"         element={<Alerts />} />
                    <Route path="/reports"        element={<Reports />} />
                    <Route path="/recommendations" element={<Recommendations />} />
                    <Route path="/settings"       element={<Settings />} />
                  </Route>
                </Routes>
              </Suspense>
            </Router>
          </AppProvider>
        </ThemeProvider>
      </AuthProvider>
    </NotificationProvider>
  );
}

export default App;
