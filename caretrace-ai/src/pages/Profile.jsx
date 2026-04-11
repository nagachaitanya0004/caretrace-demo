import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AppContext } from '../AppContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';

function Profile() {
  const navigate = useNavigate();
  const { userProfile, updateProfile } = useContext(AppContext);
  const [formData, setFormData] = useState(userProfile);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.age || !formData.gender || !formData.lifestyle) {
      alert('Please fill in all fields to continue.');
      return;
    }
    updateProfile(formData);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-blue-50 p-4 fade-in">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">Tell Us About Yourself</h1>
        <p className="text-gray-600 mb-8 text-center">This helps us provide personalized health insights.</p>
        <Card>
          <form onSubmit={handleSubmit}>
            <Input
              label="Full Name"
              type="text"
              name="name"
              placeholder="e.g., John Doe"
              value={formData.name || ''}
              onChange={handleChange}
              required
            />
            <p className="text-xs text-gray-500 mb-4">Your name helps us personalize your experience.</p>
            <Input
              label="Age"
              type="number"
              name="age"
              placeholder="e.g., 30"
              value={formData.age}
              onChange={handleChange}
              required
            />
            <p className="text-xs text-gray-500 mb-4">Your age helps us understand age-related health patterns.</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select your gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <p className="text-xs text-gray-500 mb-4">Gender information helps tailor recommendations.</p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Lifestyle</label>
              <select
                name="lifestyle"
                value={formData.lifestyle}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select your lifestyle</option>
                <option value="sedentary">Sedentary (mostly sitting)</option>
                <option value="active">Active (regular exercise)</option>
                <option value="athletic">Athletic (intense training)</option>
              </select>
            </div>
            <p className="text-xs text-gray-500 mb-6">Your activity level affects health recommendations.</p>
            <Button type="submit" className="w-full">Create Profile & View Dashboard</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default Profile;