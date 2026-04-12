import { useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AppContext } from '../AppContext';
import { useNotification } from '../NotificationContext';
import { useAuth } from '../AuthContext';
import { api } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import PageFrame from '../components/PageFrame';

function Settings() {
  const { userProfile, refreshData } = useContext(AppContext);
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const { addNotification } = useNotification();
  
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    lifestyle: '',
  });
  
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
       await api.put('/api/users/me', {
         name: formData.name,
         age: formData.age === '' ? undefined : Number(formData.age),
         gender: formData.gender,
         lifestyle: formData.lifestyle,
       });
       await refreshData();
       addNotification(t('settings.notifications.profile_success'), "success");
    } catch (e) {
       addNotification(e.message || t('settings.notifications.profile_error'), "error");
    } finally {
       setIsSaving(false);
    }
  };

  const handleToggle = (name) => {
    setPreferences(prev => {
      const next = { ...prev, [name]: !prev[name] };
      addNotification(t('settings.notifications.pref_updated', { name }), "info");
      return next;
    });
  };
  
  const changeLanguage = (e) => {
    const newLang = e.target.value;
    i18n.changeLanguage(newLang);
    localStorage.setItem('i18nextLng', newLang);
    addNotification(t('settings.notifications.lang_applied'), "success");
  }

  return (
    <PageFrame title={t('settings.title')} subtitle={t('settings.subtitle')} maxWidthClass="max-w-3xl">
          <Card className="border-slate-200/80">
            <h2 className="text-lg font-semibold text-gray-700 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              {t('settings.profile_section')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={t('settings.full_name')}
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
                <Input
                  label={t('settings.age')}
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('reports.profile.gender')}</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-zinc-600"
                    required
                  >
                    <option value="">{t('common.gender.placeholder')}</option>
                    <option value="Male">{t('common.gender.male')}</option>
                    <option value="Female">{t('common.gender.female')}</option>
                    <option value="Other">{t('common.gender.other')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('reports.profile.lifestyle')}</label>
                  <select
                    name="lifestyle"
                    value={formData.lifestyle}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-zinc-600"
                    required
                  >
                    <option value="">{t('common.lifestyle.placeholder')}</option>
                    <option value="sedentary">{t('common.lifestyle.sedentary')}</option>
                    <option value="active">{t('common.lifestyle.active')}</option>
                    <option value="smoker">{t('common.lifestyle.smoker')}</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex items-center justify-between">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="border-slate-200/80">
            <h2 className="text-lg font-semibold text-gray-700 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {t('settings.preferences_section')}
            </h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h3 className="font-medium text-gray-800">{t('navbar.language')}</h3>
                  <p className="text-sm text-gray-500">{t('common.language_choice') || 'Choose your preferred language.'}</p>
                </div>
                <select value={i18n.language.split('-')[0]} onChange={changeLanguage} className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-600">
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="te">తెలుగు (Telugu)</option>
                  <option value="ta">தமிழ் (Tamil)</option>
                  <option value="kn">ಕನ್ನಡ (Kannada)</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-800">{t('settings.notifications.title')}</h3>
                  <p className="text-sm text-gray-500">{t('settings.notifications.body')}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.notifications}
                    onChange={() => handleToggle('notifications')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-zinc-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-800"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-800">{t('settings.emails.title')}</h3>
                  <p className="text-sm text-gray-500">{t('settings.emails.body')}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.emailUpdates}
                    onChange={() => handleToggle('emailUpdates')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-zinc-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-800"></div>
                </label>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-50/80 border-slate-200/80">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {t('settings.about_section')}
            </h2>
            <div className="text-sm text-gray-600 space-y-3">
              <p className="leading-relaxed">{t('settings.about_body')}</p>
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                <span className="font-semibold text-slate-800">{t('common.disclaimer_label')}:</span>{' '}
                {t('reports.disclaimer')}
              </div>
            </div>
          </Card>
    </PageFrame>
  );
}

export default Settings;
