import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { AppProvider } from './AppContext';
import { LanguageProvider } from './LanguageContext';
import { NotificationProvider } from './NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
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

// Wrapper for pages that just use the Header, not the full sidebar Layout
function HeaderOnlyLayout() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-blue-50">
      <Header />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <NotificationProvider>
        <AuthProvider>
          <AppProvider>
            <Router>
              <Routes>
                {/* Header Only / Public Routes */}
                <Route element={<HeaderOnlyLayout />}>
                  <Route path="/" element={<Landing />} />
                </Route>

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
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Routes>
            </Router>
          </AppProvider>
        </AuthProvider>
      </NotificationProvider>
    </LanguageProvider>
  );
}

export default App;
