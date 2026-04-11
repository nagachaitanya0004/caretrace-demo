import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AppContext } from '../AppContext';
import Card from '../components/Card';
import Button from '../components/Button';

function Recommendations() {
  const navigate = useNavigate();
  const { analysisResult } = useContext(AppContext);

  const getRecommendations = (risk) => {
    switch (risk) {
      case 'Low':
        return [
          'Continue monitoring your symptoms daily.',
          'Maintain a healthy lifestyle with balanced nutrition.',
          'Stay hydrated and get adequate rest.',
          'Keep a symptom journal for future reference.',
        ];
      case 'Medium':
        return [
          'Schedule an appointment with your primary care physician.',
          'Consider additional screening tests as recommended.',
          'Monitor symptoms closely and note any changes.',
          'Follow up with healthcare provider within 1-2 weeks.',
        ];
      case 'High':
        return [
          'Consult a doctor immediately for professional evaluation.',
          'Seek medical attention if symptoms worsen.',
          'Follow all medical advice and treatment plans.',
          'Keep detailed records of all symptoms and treatments.',
        ];
      default:
        return [
          'Monitor your health closely.',
          'Consult healthcare professionals as needed.',
        ];
    }
  };

  const recommendations = analysisResult ? getRecommendations(analysisResult.risk) : [];

  return (
    <div className="min-h-screen bg-blue-50 p-4 fade-in">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">Personalized Health Recommendations</h1>
        <p className="text-gray-600 mb-8 text-center">Based on your symptoms and AI analysis, here are tailored recommendations for your health.</p>
        <Card>
          <h2 className="text-xl font-semibold mb-6">Recommended Action Steps</h2>
          {recommendations.length > 0 ? (
            <ul className="space-y-4">
              {recommendations.map((rec, index) => (
                <li key={index} className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-blue-600 text-sm font-medium">{index + 1}</span>
                  </div>
                  <p className="ml-3 text-gray-700">{rec}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">No analysis data available.</p>
              <p className="text-sm text-gray-400">Please complete the symptom assessment and AI analysis first.</p>
            </div>
          )}
        </Card>
        <div className="mt-8 text-center flex flex-col md:flex-row justify-center gap-4">
          <p className="text-sm text-gray-500 mb-4 hidden md:block w-full">These recommendations are for informational purposes only. Always consult healthcare professionals for medical advice.</p>
          <Button onClick={() => navigate('/dashboard')}>Return to Dashboard</Button>
        </div>
      </div>
    </div>
  );
}

export default Recommendations;