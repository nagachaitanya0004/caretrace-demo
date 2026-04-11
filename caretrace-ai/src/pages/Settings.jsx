import { useContext, useState, useEffect } from 'react';
import { AppContext } from '../AppContext';
import { useLanguage } from '../LanguageContext';
import { useNotification } from '../NotificationContext';
import { useAuth } from '../AuthContext';
import { api } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';

function Settings() {
  const { userProfile, refreshData } = useContext(AppContext);
  const { user } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const { addNotification } = useNotification();
  
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    lifestyle: '',
  });
  
  // Local toggle maps simulating mock backend preferences locally
  const [preferences, setPreferences] = useState({
    notifications: true,
    emailUpdates: true
  });
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userProfile && Object.keys(userProfile).length > 0) {
      setFormData({
        name: userProfile.name || '',
        age: userProfile.age || '',
        gender: userProfile.gender || '',
        lifestyle: userProfile.lifestyle || '',
      });
    }
  }, [userProfile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    setIsSaving(true);
    try {
       await api.put(`/users/${user.id}`, formData);
       await refreshData();
       addNotification("Profile Configuration Saved Successfully", "success");
    } catch (e) {
       addNotification(e.message || "Failed updating properties", "error");
    } finally {
       setIsSaving(false);
    }
  };

  const handleToggle = (name) => {
    setPreferences(prev => {
      const next = { ...prev, [name]: !prev[name] };
      addNotification(`Preference [${name}] Updated`, "info");
      return next;
    });
  };
  
  const changeLanguage = (e) => {
    setLang(e.target.value);
    addNotification("Language configuration applied", "success");
  }

  return (
    <div className="p-6 md:p-8 fade-in h-full overflow-y-auto w-full">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('settings')}</h1>
        <p className="text-gray-600 mb-8">Manage your profile and application preferences.</p>

        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-gray-700 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              {t('profile')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Age"
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select your gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
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
                    <option value="smoker">Smoker</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex items-center justify-between">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Processing...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-700 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Preferences
            </h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h3 className="font-medium text-gray-800">{t('language')}</h3>
                  <p className="text-sm text-gray-500">Choose your preferred language.</p>
                </div>
                <select value={lang} onChange={changeLanguage} className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-800">Push Notifications</h3>
                  <p className="text-sm text-gray-500">Receive alerts on your device.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.notifications}
                    onChange={() => handleToggle('notifications')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-800">Email Updates</h3>
                  <p className="text-sm text-gray-500">Receive weekly summary emails.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.emailUpdates}
                    onChange={() => handleToggle('emailUpdates')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </Card>

          <Card className="bg-gray-50 border-gray-200">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              About CareTrace AI
            </h2>
            <div className="text-sm text-gray-600 space-y-3">
              <p>CareTrace AI is a personalized health tracking system designed to help you monitor symptoms and visualize patterns over time.</p>
              <div className="p-3 bg-white border border-gray-200 rounded-md shadow-sm">
                <span className="font-semibold text-gray-800">Medical Disclaimer:</span> This application is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Settings;
