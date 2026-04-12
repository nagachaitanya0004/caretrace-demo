import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Card from '../components/Card';
import Button from '../components/Button';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../constants/demoAccount';

function Login() {
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4 fade-in">
      <Card className="max-w-md w-full shadow-2xl border-t-4 border-t-blue-600">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h1>
          <p className="text-sm text-gray-500">Sign in to your CareTrace AI dashboard</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">
            {error}
          </div>
        )}

        <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-slate-700">
          <p className="font-semibold text-slate-800 mb-1">Demo account (all features)</p>
          <p className="text-slate-600 mb-3">
            After <code className="text-xs bg-white px-1 py-0.5 rounded border">python seed.py</code> from the repo root, sign in with the demo user to load symptoms, AI analysis, alerts, reports, and recommendations.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <span className="text-xs text-slate-500">
              <span className="font-medium text-slate-700">{DEMO_EMAIL}</span>
              {' · '}
              <span className="font-medium text-slate-700">{DEMO_PASSWORD}</span>
            </span>
            <Button
              type="button"
              variant="secondary"
              className="py-2 px-3 text-sm shrink-0 bg-white border border-blue-200 text-blue-800 hover:bg-blue-100"
              onClick={() => {
                setEmail(DEMO_EMAIL);
                setPassword(DEMO_PASSWORD);
              }}
              disabled={isLoading}
            >
              Fill demo credentials
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full py-3 text-lg flex items-center justify-center gap-2" disabled={isLoading}>
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : null}
            {isLoading ? 'Authenticating...' : 'Secure Login'}
          </Button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/signup" className="text-blue-600 hover:text-blue-800 font-semibold transition-colors">
            Create Profile
          </Link>
        </p>
      </Card>
    </div>
  );
}

export default Login;
