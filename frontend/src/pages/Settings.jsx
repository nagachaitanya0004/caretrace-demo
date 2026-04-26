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

const selectCls =
  'w-full px-3.5 py-2.5 bg-[var(--app-input-bg)] text-[var(--app-text)] ' +
  'border border-[var(--app-input-border)] rounded-[var(--radius-lg)] text-sm ' +
  'transition-colors duration-150 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:border-[var(--brand-accent)]';

const labelCls = 'block text-sm font-medium text-[var(--app-text)] mb-1.5';

function Settings() {
  const { userProfile, refreshData } = useContext(AppContext);
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const { addNotification } = useNotification();

  const [formData, setFormData] = useState({ name: '', age: '', gender: '', lifestyle: '' });
  const [preferences, setPreferences] = useState({ notifications: true, emailUpdates: true });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userProfile && Object.keys(userProfile).length > 0) {
      setFormData({
        name:      userProfile.name      || '',
        age:       userProfile.age       || '',
        gender:    userProfile.gender    || '',
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
        name:      formData.name,
        age:       formData.age === '' ? undefined : Number(formData.age),
        gender:    formData.gender,
        lifestyle: formData.lifestyle,
      });
      await refreshData();
      addNotification(t('settings.notifications.profile_success'), 'success');
    } catch (e) {
      addNotification(e.message || t('settings.notifications.profile_error'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (name) => {
    setPreferences((prev) => {
      const next = { ...prev, [name]: !prev[name] };
      addNotification(t('settings.notifications.pref_updated', { name }), 'info');
      return next;
    });
  };

  const changeLanguage = (e) => {
    const newLang = e.target.value;
    i18n.changeLanguage(newLang);
    localStorage.setItem('i18nextLng', newLang);
    addNotification(t('settings.notifications.lang_applied'), 'success');
  };

  return (
    <PageFrame title={t('settings.title')} subtitle={t('settings.subtitle')} maxWidthClass="max-w-3xl">

      {/* Profile */}
      <Card elevation={1}>
        <h2 className="text-lg font-semibold text-[var(--app-text)] mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-[var(--app-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {t('settings.profile_section')}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label={t('settings.full_name')} type="text"   name="name" value={formData.name} onChange={handleChange} required />
            <Input label={t('settings.age')}       type="number" name="age"  value={formData.age}  onChange={handleChange} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t('reports.profile.gender')}</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className={selectCls} required>
                <option value="">{t('common.gender.placeholder')}</option>
                <option value="Male">{t('common.gender.male')}</option>
                <option value="Female">{t('common.gender.female')}</option>
                <option value="Other">{t('common.gender.other')}</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{t('reports.profile.lifestyle')}</label>
              <select name="lifestyle" value={formData.lifestyle} onChange={handleChange} className={selectCls} required>
                <option value="">{t('common.lifestyle.placeholder')}</option>
                <option value="sedentary">{t('common.lifestyle.sedentary')}</option>
                <option value="active">{t('common.lifestyle.active')}</option>
                <option value="smoker">{t('common.lifestyle.smoker')}</option>
              </select>
            </div>
          </div>
          <div className="pt-4">
            <Button type="submit" intent="primary" size="md" loading={isSaving}>
              {isSaving ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </form>
      </Card>

      {/* Preferences */}
      <Card elevation={1}>
        <h2 className="text-lg font-semibold text-[var(--app-text)] mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-[var(--app-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {t('settings.preferences_section')}
        </h2>

        <div className="space-y-6">
          {/* Language */}
          <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-4">
            <div>
              <h3 className="font-medium text-[var(--app-text)]">{t('navbar.language')}</h3>
              <p className="text-sm text-[var(--app-text-muted)]">{t('common.language_choice') || 'Choose your preferred language.'}</p>
            </div>
            <select value={i18n.language.split('-')[0]} onChange={changeLanguage} className={`${selectCls} w-auto`}>
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
              <option value="te">తెలుగు (Telugu)</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="kn">ಕನ್ನಡ (Kannada)</option>
            </select>
          </div>

          {/* Toggle rows */}
          {[
            { key: 'notifications', titleKey: 'settings.notifications.title', bodyKey: 'settings.notifications.body' },
            { key: 'emailUpdates',  titleKey: 'settings.emails.title',        bodyKey: 'settings.emails.body'        },
          ].map(({ key, titleKey, bodyKey }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-[var(--app-text)]">{t(titleKey)}</h3>
                <p className="text-sm text-[var(--app-text-muted)]">{t(bodyKey)}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences[key]}
                  onChange={() => handleToggle(key)}
                  className="sr-only peer"
                />
                {/* Toggle track — uses brand-accent token for checked state */}
                <div className="w-11 h-6 bg-[var(--app-surface-soft)] border border-[var(--app-border)] rounded-full peer peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--brand-accent)] peer-checked:bg-[var(--brand-accent)] after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:after:translate-x-5 peer-checked:after:bg-[var(--brand-accent-on)]" />
              </label>
            </div>
          ))}
        </div>
      </Card>

      {/* About */}
      <Card elevation={0} className="bg-[var(--app-surface-soft)]">
        <h2 className="text-lg font-semibold text-[var(--app-text)] mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-[var(--app-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t('settings.about_section')}
        </h2>
        <div className="text-sm text-[var(--app-text-muted)] space-y-3">
          <p className="leading-relaxed">{t('settings.about_body')}</p>
          <div className="p-4 bg-[var(--app-surface)] border border-[var(--app-border)] rounded-[var(--radius-xl)]">
            <span className="font-semibold text-[var(--app-text)]">{t('common.disclaimer_label')}:</span>{' '}
            {t('reports.disclaimer')}
          </div>
        </div>
      </Card>
    </PageFrame>
  );
}

export default Settings;
