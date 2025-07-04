import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, User, Lock, Bell, Languages } from 'lucide-react';
import { authApiService, userApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const SettingsPage: React.FC = () => {
  const { user, refreshUser, changeLanguage } = useAuth();
  const { addToast } = useToast();
  const { t, i18n } = useTranslation();
  // Profile state
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Notifications state
  const [emailNotifications, setEmailNotifications] = useState(user?.email_notifications ?? true);
  const [notifMsg, setNotifMsg] = useState<string | null>(null);
  const [notifLoading, setNotifLoading] = useState(false);

  // Language state
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);
  const [languageMsg, setLanguageMsg] = useState<string | null>(null);
  const [languageLoading, setLanguageLoading] = useState(false);

  // Синхронизация username/email с user после обновления
  useEffect(() => {
    setUsername(user?.username || '');
    setEmail(user?.email || '');
    setEmailNotifications(user?.email_notifications ?? true);
    setSelectedLanguage(i18n.language);
  }, [user, i18n.language]);

  // Handlers
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg(null);
    try {
      await authApiService.updateUsername(username);
      setProfileMsg(t('settingsPage.profileUpdated'));
      await refreshUser();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        setProfileMsg(detail.map((d: any) => d.msg).join(', '));
      } else if (typeof detail === 'string') {
        setProfileMsg(detail);
      } else {
        setProfileMsg(t('settingsPage.failedToUpdateProfile'));
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => setAvatar(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordMsg(t('settingsPage.fillAllFields'));
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg(t('settingsPage.newPasswordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg(t('settingsPage.passwordsDoNotMatch'));
      return;
    }
    setPasswordLoading(true);
    try {
      await authApiService.changePassword(oldPassword, newPassword);
      setPasswordMsg(t('settingsPage.passwordChanged'));
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        setPasswordMsg(detail.map((d: any) => d.msg).join(', '));
      } else if (typeof detail === 'string') {
        setPasswordMsg(detail);
      } else {
        setPasswordMsg(t('settingsPage.failedToChangePassword'));
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleNotifSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotifLoading(true);
    setNotifMsg(null);
    try {
        await userApi.post('/notifications', { email_notifications: emailNotifications });
        setNotifMsg(t('settingsPage.notificationPreferencesSaved'));
        addToast({
            type: 'success',
            title: t('settingsPage.settingsUpdated'),
            message: t('settingsPage.notificationPreferencesSaved'),
            duration: 3000,
        });
    } catch (err: any) {
        console.error('Failed to save notification preferences:', err);
        const errorMessage = err.response?.data?.detail || t('settingsPage.failedToSavePreferences');
        setNotifMsg(errorMessage);
        addToast({
            type: 'error',
            title: t('settingsPage.errorSavingSettings'),
            message: errorMessage,
            duration: 5000,
        });
    } finally {
        setNotifLoading(false);
    }
  };

  const handleLanguageChange = async (lang: string) => {
    setLanguageLoading(true);
    setLanguageMsg(null);
    try {
        await changeLanguage(lang); // Call the changeLanguage from AuthContext
        setSelectedLanguage(lang);
        setLanguageMsg(t('settingsPage.languageSaved'));
        addToast({
            type: 'success',
            title: t('settingsPage.settingsUpdated'),
            message: t('settingsPage.languageSaved'),
            duration: 3000,
        });
    } catch (err: any) {
        console.error('Failed to save language preference:', err);
        const errorMessage = err.response?.data?.detail || t('settingsPage.failedToSaveLanguage');
        setLanguageMsg(errorMessage);
        addToast({
            type: 'error',
            title: t('settingsPage.errorSavingSettings'),
            message: errorMessage,
            duration: 5000,
        });
    } finally {
        setLanguageLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden flex flex-col items-center py-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-gray-900 rounded-xl shadow-lg p-8"
      >
        <div className="flex items-center gap-3 mb-8">
          <Settings size={28} className="text-arena-accent" />
          <h1 className="text-2xl font-bold tracking-wider">{t('settingsPage.title')}</h1>
        </div>

        {/* Profile Section */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <User size={20} />
            <h2 className="text-lg font-semibold">{t('settingsPage.profileSectionTitle')}</h2>
          </div>
          <form className="bg-gray-800 rounded-lg p-4 mb-2 flex flex-col gap-4" onSubmit={handleProfileSave}>
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16">
                <img
                  src={avatar || '/logo.svg'}
                  alt="avatar"
                  className="w-16 h-16 rounded-full object-cover border border-gray-700"
                />
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleAvatarChange}
                  title={t('settingsPage.changeAvatar')}
                  disabled
                />
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <input
                  type="text"
                  className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder={t('common.username')}
                  required
                />
                <input
                  type="email"
                  className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none"
                  value={email}
                  disabled
                  placeholder={t('common.email')}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="mt-2 bg-arena-accent hover:bg-arena-accent/80 text-black font-bold py-2 px-4 rounded transition-colors disabled:opacity-60"
              disabled={profileLoading}
            >
              {profileLoading ? t('common.saving') : t('settingsPage.saveProfile')}
            </button>
            {profileMsg && <div className={profileMsg === t('settingsPage.profileUpdated') ? 'text-green-400 text-sm mt-1' : 'text-red-400 text-sm mt-1'}>{profileMsg}</div>}
          </form>
        </section>

        {/* Password Section */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <Lock size={20} />
            <h2 className="text-lg font-semibold">{t('settingsPage.changePasswordSectionTitle')}</h2>
          </div>
          <form className="bg-gray-800 rounded-lg p-4 mb-2 flex flex-col gap-3" onSubmit={handlePasswordSave}>
            <input
              type="password"
              className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none"
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              placeholder={t('settingsPage.currentPassword')}
              required
            />
            <input
              type="password"
              className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder={t('settingsPage.newPassword')}
              required
            />
            <input
              type="password"
              className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder={t('settingsPage.confirmNewPassword')}
              required
            />
            <button
              type="submit"
              className="mt-2 bg-arena-accent hover:bg-arena-accent/80 text-black font-bold py-2 px-4 rounded transition-colors disabled:opacity-60"
              disabled={passwordLoading}
            >
              {passwordLoading ? t('common.saving') : t('settingsPage.changePasswordButton')}
            </button>
            {passwordMsg && <div className={passwordMsg === t('settingsPage.passwordChanged') ? 'text-green-400 text-sm mt-1' : 'text-red-400 text-sm mt-1'}>{passwordMsg}</div>}
          </form>
        </section>

        {/* Notifications Section */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <Bell size={20} />
            <h2 className="text-lg font-semibold">{t('settingsPage.notificationsSectionTitle')}</h2>
          </div>
          <form className="bg-gray-800 rounded-lg p-4 mb-2 flex flex-col gap-3" onSubmit={handleNotifSave}>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={e => setEmailNotifications(e.target.checked)}
                className="form-checkbox h-4 w-4 text-white bg-gray-700 border-gray-600 rounded focus:ring-0 focus:outline-none"
              />
              <span className="text-gray-400 font-mono">{t('settingsPage.receiveEmailNotifications')}</span>
            </label>
            <button
              type="submit"
              className="mt-2 bg-arena-accent hover:bg-arena-accent/80 text-black font-bold py-2 px-4 rounded transition-colors disabled:opacity-60"
              disabled={notifLoading}
            >
              {notifLoading ? t('common.saving') : t('settingsPage.savePreferences')}
            </button>
            {notifMsg && <div className={notifMsg === t('settingsPage.notificationPreferencesSaved') ? 'text-green-400 text-sm mt-1' : 'text-red-400 text-sm mt-1'}>{notifMsg}</div>}
          </form>
        </section>

        {/* Language Section */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <Languages size={20} />
            <h2 className="text-lg font-semibold">{t('settingsPage.languageSectionTitle')}</h2>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 mb-2 flex flex-col gap-3">
            <label className="block text-gray-400 font-mono text-sm mb-2">{t('settingsPage.selectLanguage')}</label>
            <Select onValueChange={handleLanguageChange} value={selectedLanguage}>
              <SelectTrigger className="w-full bg-gray-900 border-gray-700 text-white focus:outline-none focus:border-green-500">
                <SelectValue placeholder="Select a language" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ru">Русский</SelectItem>
              </SelectContent>
            </Select>
            <button
              type="button"
              className="mt-2 bg-arena-accent hover:bg-arena-accent/80 text-black font-bold py-2 px-4 rounded transition-colors disabled:opacity-60"
              onClick={() => handleLanguageChange(selectedLanguage)}
              disabled={languageLoading}
            >
              {languageLoading ? t('common.saving') : t('common.save')}
            </button>
            {languageMsg && <div className={languageMsg === t('settingsPage.languageSaved') ? 'text-green-400 text-sm mt-1' : 'text-red-400 text-sm mt-1'}>{languageMsg}</div>}
          </div>
        </section>

        {/* Delete Account Section */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <User size={20} />
            <h2 className="text-lg font-semibold">{t('settingsPage.deleteAccountSectionTitle')}</h2>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 mb-2">
            <p className="text-gray-400 mb-4 font-mono">{t('settingsPage.deleteAccountWarning')}</p>
            <button
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              {t('settingsPage.deleteAccountButton')}
            </button>
          </div>
        </section>
      </motion.div>
    </div>
  );
};

export default SettingsPage; 