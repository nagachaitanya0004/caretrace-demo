import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AppContext } from '../AppContext';
import Card from '../components/Card';
import Button from '../components/Button';

function Alerts() {
  const navigate = useNavigate();
  const { alerts, hasAlert } = useContext(AppContext);

  return (
    <div className="min-h-screen bg-blue-50 p-4 fade-in">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">Health Alerts & Notifications</h1>
        <p className="text-gray-600 mb-8 text-center">Stay informed about your health status and any recommended actions.</p>
        {hasAlert() ? (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <Card key={alert.id} className="border-l-4 border-yellow-400">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-yellow-800 capitalize">{alert.symptom}</h3>
                    <p className="mt-2 text-sm text-yellow-700">{alert.message}</p>
                    <p className="mt-2 text-xs text-yellow-600">Please consult a healthcare professional for proper evaluation.</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center">
            <div className="py-12">
              <svg className="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No Alerts</h3>
              <p className="mt-1 text-sm text-gray-500">Your symptoms are within normal ranges. Continue monitoring your health.</p>
            </div>
          </Card>
        )}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-4">This is not medical advice. Always consult healthcare professionals for health concerns.</p>
          <Button onClick={() => navigate('/recommendations')}>View Personalized Recommendations</Button>
        </div>
      </div>
    </div>
  );
}

export default Alerts;