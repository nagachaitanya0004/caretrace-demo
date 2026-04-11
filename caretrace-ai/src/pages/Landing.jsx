import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../AuthContext';
import Card from '../components/Card';
import Button from '../components/Button';

function Landing() {
  const navigate = useNavigate();
  const { token, isLoadingAuth } = useAuth();

  useEffect(() => {
    if (!isLoadingAuth && token) {
      navigate('/dashboard', { replace: true });
    }
  }, [token, isLoadingAuth, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4 fade-in">
      <Card className="max-w-md w-full text-center shadow-xl border-t-4 border-blue-500">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-blue-600 mb-2">CareTrace AI</h1>
          <p className="text-lg text-gray-600 mb-4 font-medium">Your Predictive Health Companion</p>
          <p className="text-sm text-gray-500 leading-relaxed">Early detection. Better decisions. Take control of your health with AI-powered insights mapped securely to your private footprint.</p>
        </div>
        <div className="flex flex-col gap-3">
          <Button onClick={() => navigate('/login')} className="w-full py-3 text-lg font-semibold">
            Secure Login
          </Button>
          <Button variant="outline" onClick={() => navigate('/signup')} className="w-full py-3 text-lg font-semibold">
            Create Profile
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default Landing;
