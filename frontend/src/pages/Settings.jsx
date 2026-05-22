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
import ThemeToggle from '../components/ThemeToggle';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { motion, AnimatePresence } from 'framer-motion';

function Settings() {
  const { userProfile, refreshData } = useContext(AppContext);
  const { user } = useAuth();
  const { t } = useTranslation();
  const { addNotification } = useNotification();

  const [activeTab, setActiveTab] = useState('account'); // 'account', 'preferences', 'danger'
  const [formData, setFormData] = useState({ name: '' });
  const [preferences, setPreferences] = useState({ notifications: true, emailUpdates: true });
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (userProfile && Object.keys(userProfile).length > 0) {
      setFormData({
        name:      userProfile.name      || '',
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

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setIsDeleting(true);
    try {
      await api.delete('/api/users/me');
      addNotification(t('settings.delete_success', 'Account deleted successfully. Goodbye.'), 'info');
      window.location.href = '/login';
    } catch (err) {
      addNotification(err.message || 'Failed to delete account', 'error');
      setIsDeleting(false);
    }
  };

  const tabs = [
    {
      id: 'account',
      label: t('settings.profile_section', 'Account Details'),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      id: 'preferences',
      label: t('settings.preferences_section', 'App Preferences'),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    {
      id: 'danger',
      label: t('settings.danger_zone', 'Danger Zone'),
      icon: (
        <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    }
  ];

  return (
    <PageFrame title={t('settings.title')} subtitle={t('settings.subtitle')} maxWidthClass="max-w-5xl">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
        {/* Left Side: Vertical Tabs (Responsive flex row on small screens) */}
        <div className="md:col-span-1 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 gap-1 border-b border-[var(--app-border)] md:border-b-0">
          {tabs.map((tab) => {
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-150 text-left whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]/50 ${
                  isTabActive
                    ? 'bg-[var(--app-surface-soft)] text-[var(--app-text)] border border-[var(--app-border)] shadow-sm'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-soft)]/50 border border-transparent'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Side: Tab Panel Content */}
        <div className="md:col-span-3">
          <AnimatePresence mode="wait">
            {activeTab === 'account' && (
              <motion.div
                key="account"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <Card elevation={1} className="border border-zinc-200/80 dark:border-zinc-800/80 shadow-md">
                  <h2 className="text-base font-bold text-[var(--app-text)] mb-6 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[var(--app-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {t('settings.profile_section')}
                  </h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <Input label={t('settings.full_name')} type="text" name="name" value={formData.name} onChange={handleChange} required />
                      <Input label="Email Address" type="email" value={user?.email || ''} disabled />
                    </div>
                    <div className="pt-4">
                      <Button type="submit" intent="primary" size="md" loading={isSaving}>
                        {isSaving ? t('common.saving') : t('common.save')}
                      </Button>
                    </div>
                  </form>
                </Card>
              </motion.div>
            )}

            {activeTab === 'preferences' && (
              <motion.div
                key="preferences"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <Card elevation={1} className="border border-zinc-200/80 dark:border-zinc-800/80 shadow-md">
                  <h2 className="text-base font-bold text-[var(--app-text)] mb-6 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[var(--app-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {t('settings.preferences_section')}
                  </h2>

                  <div className="space-y-6">
                    {/* Theme & Language */}
                    <div className="flex flex-col sm:flex-row gap-6 border-b border-[var(--app-border)] pb-6">
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm text-[var(--app-text)] mb-1">{t('navbar.theme', 'Theme')}</h3>
                        <p className="text-xs text-[var(--app-text-muted)] mb-4">{t('settings.theme_body', 'Switch between light and dark modes.')}</p>
                        <ThemeToggle />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm text-[var(--app-text)] mb-1">{t('navbar.language')}</h3>
                        <p className="text-xs text-[var(--app-text-muted)] mb-4">{t('common.language_choice', 'Choose your preferred language.')}</p>
                        <LanguageSwitcher variant="light" />
                      </div>
                    </div>

                    {/* Toggle rows */}
                    {[
                      { key: 'notifications', titleKey: 'settings.notifications.title', bodyKey: 'settings.notifications.body' },
                      { key: 'emailUpdates',  titleKey: 'settings.emails.title',        bodyKey: 'settings.emails.body'        },
                    ].map(({ key, titleKey, bodyKey }) => (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-sm text-[var(--app-text)]">{t(titleKey)}</h3>
                          <p className="text-xs text-[var(--app-text-muted)]">{t(bodyKey)}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences[key]}
                            onChange={() => handleToggle(key)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-[var(--app-surface-soft)] border border-[var(--app-border)] rounded-full peer peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--brand-accent)] peer-checked:bg-[var(--brand-accent)] after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:after:translate-x-5 peer-checked:after:bg-[var(--brand-accent-on)]" />
                        </label>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}

            {activeTab === 'danger' && (
              <motion.div
                key="danger"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <Card elevation={0} className="border border-[var(--app-danger-border)] bg-[var(--app-danger-bg)]">
                  <h2 className="text-base font-bold text-[var(--app-danger)] mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {t('settings.danger_zone', 'Dangerous Action Zone')}
                  </h2>
                  <p className="text-xs text-[var(--app-danger)] mb-6 opacity-90 leading-relaxed">
                    {t('settings.delete_warning', 'Deleting your account is permanent and cannot be undone. All your health data, symptoms, and medical reports will be permanently purged.')}
                  </p>
                  <Button
                    intent="secondary"
                    size="md"
                    onClick={() => setShowDeleteModal(true)}
                    className="bg-transparent border-[var(--app-danger-border)] text-[var(--app-danger)] hover:bg-[var(--app-danger)] hover:text-white transition-all"
                  >
                    {t('settings.delete_account_btn', 'Delete Account')}
                  </Button>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[var(--app-surface)] rounded-[var(--radius-2xl)] p-6 shadow-[var(--shadow-l3)] border border-[var(--app-border)]"
            >
              <h3 className="text-xl font-bold text-[var(--app-text)] mb-2">
                {t('settings.confirm_delete_title', 'Delete your account?')}
              </h3>
              <p className="text-[var(--app-text-muted)] text-sm mb-6 leading-relaxed">
                {t('settings.confirm_delete_body', 'This action is irreversible. Please type "DELETE" below to proceed.')}
              </p>

              <Input
                label={t('settings.confirm_type_label', 'Type DELETE to confirm')}
                placeholder="DELETE"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value.toUpperCase())}
                autoFocus
                className="mb-6"
              />

              <div className="flex gap-3">
                <Button
                  intent="secondary"
                  size="md"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  intent="primary"
                  size="md"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirm !== 'DELETE' || isDeleting}
                  loading={isDeleting}
                  className="flex-1 bg-danger hover:bg-danger text-white border-transparent"
                >
                  {t('settings.confirm_delete_btn', 'Delete Permanently')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageFrame>
  );
}

export default Settings;

