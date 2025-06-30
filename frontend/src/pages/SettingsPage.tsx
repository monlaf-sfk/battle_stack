import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, User, Lock, Bell } from 'lucide-react';
import { authApiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const SettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
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
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [notifMsg, setNotifMsg] = useState<string | null>(null);
  const [notifLoading, setNotifLoading] = useState(false);

  // Синхронизация username/email с user после обновления
  useEffect(() => {
    setUsername(user?.username || '');
    setEmail(user?.email || '');
  }, [user]);

  // Handlers
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg(null);
    try {
      await authApiService.updateUsername(username);
      setProfileMsg('Profile updated!');
      await refreshUser();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        setProfileMsg(detail.map((d: any) => d.msg).join(', '));
      } else if (typeof detail === 'string') {
        setProfileMsg(detail);
      } else {
        setProfileMsg('Failed to update profile');
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
      setPasswordMsg('Fill all fields');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg('Passwords do not match');
      return;
    }
    setPasswordLoading(true);
    try {
      await authApiService.changePassword(oldPassword, newPassword);
      setPasswordMsg('Password changed!');
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
        setPasswordMsg('Failed to change password');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleNotifSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotifLoading(true);
    setNotifMsg(null);
    // TODO: Replace with real API call
    setTimeout(() => {
      setNotifMsg('Notification preferences saved!');
      setNotifLoading(false);
    }, 600);
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
          <h1 className="text-2xl font-bold tracking-wider">Settings</h1>
        </div>

        {/* Profile Section */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <User size={20} />
            <h2 className="text-lg font-semibold">Profile</h2>
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
                  title="Change avatar"
                  disabled
                />
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <input
                  type="text"
                  className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Username"
                  required
                />
                <input
                  type="email"
                  className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none"
                  value={email}
                  disabled
                  placeholder="Email"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="mt-2 bg-arena-accent hover:bg-arena-accent/80 text-black font-bold py-2 px-4 rounded transition-colors disabled:opacity-60"
              disabled={profileLoading}
            >
              {profileLoading ? 'Saving...' : 'Save Profile'}
            </button>
            {profileMsg && <div className={profileMsg === 'Profile updated!' ? 'text-green-400 text-sm mt-1' : 'text-red-400 text-sm mt-1'}>{profileMsg}</div>}
          </form>
        </section>

        {/* Password Section */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <Lock size={20} />
            <h2 className="text-lg font-semibold">Change Password</h2>
          </div>
          <form className="bg-gray-800 rounded-lg p-4 mb-2 flex flex-col gap-3" onSubmit={handlePasswordSave}>
            <input
              type="password"
              className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none"
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              placeholder="Current password"
              required
            />
            <input
              type="password"
              className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="New password"
              required
            />
            <input
              type="password"
              className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
            />
            <button
              type="submit"
              className="mt-2 bg-arena-accent hover:bg-arena-accent/80 text-black font-bold py-2 px-4 rounded transition-colors disabled:opacity-60"
              disabled={passwordLoading}
            >
              {passwordLoading ? 'Saving...' : 'Change Password'}
            </button>
            {passwordMsg && <div className={passwordMsg === 'Password changed!' ? 'text-green-400 text-sm mt-1' : 'text-red-400 text-sm mt-1'}>{passwordMsg}</div>}
          </form>
        </section>

        {/* Notifications Section */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <Bell size={20} />
            <h2 className="text-lg font-semibold">Notifications</h2>
          </div>
          <form className="bg-gray-800 rounded-lg p-4 mb-2 flex flex-col gap-3" onSubmit={handleNotifSave}>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={e => setEmailNotifications(e.target.checked)}
                className="accent-arena-accent w-4 h-4"
              />
              <span className="text-sm">Receive email notifications</span>
            </label>
            <button
              type="submit"
              className="mt-2 bg-arena-accent hover:bg-arena-accent/80 text-black font-bold py-2 px-4 rounded transition-colors disabled:opacity-60"
              disabled={notifLoading}
            >
              {notifLoading ? 'Saving...' : 'Save Preferences'}
            </button>
            {notifMsg && <div className="text-green-400 text-sm mt-1">{notifMsg}</div>}
          </form>
        </section>
      </motion.div>
    </div>
  );
};

export default SettingsPage; 