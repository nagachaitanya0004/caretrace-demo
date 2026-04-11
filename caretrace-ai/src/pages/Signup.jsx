import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Card from '../components/Card';
import Button from '../components/Button';

function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    age: '',
    gender: 'Male',
    lifestyle: 'active'
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signup } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Validate inputs cleanly
      if (formData.password.length < 6) {
         throw new Error("Password must be at least 6 characters.");
      }

      await signup({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        age: parseInt(formData.age),
        gender: formData.gender,
        lifestyle: formData.lifestyle
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Check inputs and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4 fade-in">
      <Card className="max-w-md w-full shadow-2xl border-t-4 border-t-green-500">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Join CareTrace AI</h1>
          <p className="text-sm text-gray-500">Establish your predictive health footprint locally.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              name="name"
              required
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="Rahul Sharma"
              value={formData.name}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              required
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              name="password"
              required
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="Min 6 characters"
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              <input
                type="number"
                name="age"
                required
                min="1"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                value={formData.age}
                onChange={handleChange}
              />
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
               <select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white">
                 <option value="Male">Male</option>
                 <option value="Female">Female</option>
                 <option value="Other">Other</option>
               </select>
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Lifestyle Risk Context</label>
             <select name="lifestyle" value={formData.lifestyle} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white">
               <option value="active">Active</option>
               <option value="sedentary">Sedentary</option>
               <option value="smoker">Smoker</option>
             </select>
          </div>

          <Button type="submit" variant="success" className="w-full mt-2 py-3 text-lg flex items-center justify-center gap-2" disabled={isLoading}>
            {isLoading ? (
               <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : null}
            {isLoading ? 'Constructing...' : 'Register Profile'}
          </Button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-600">
          Already mapped?{' '}
          <Link to="/login" className="text-green-600 hover:text-green-800 font-semibold transition-colors">
            Login natively
          </Link>
        </p>
      </Card>
    </div>
  );
}

export default Signup;
