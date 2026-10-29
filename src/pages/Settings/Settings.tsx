import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { db } from '../../lib/supabase';
import { Currency, NotificationPreferences } from '../../types';
import {
  User,
  Bell,
  Globe,
  Moon,
  Sun,
  Shield,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Save,
  Camera,
  Upload,
  Sparkles,
  X,
  Image as ImageIcon,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { user, updateProfile, signOut } = useAuth();
  const { theme, toggleTheme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [currency, setCurrency] = useState<Currency>(user?.preferred_currency || 'USD');
  const [timezone, setTimezone] = useState(user?.timezone || 'America/Los_Angeles');
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const [prefs, setPrefs] = useState<NotificationPreferences>({
    id: 'default',
    user_id: user?.id || 'default',
    email_enabled: true,
    in_app_enabled: true,
    sms_enabled: false,
    default_lead_days: 2,
    reminder_dispatch_time: '09:00',
    notify_on_trial_expiry: true,
    notify_on_renewal: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [photoMessage, setPhotoMessage] = useState<string | null>(null);

  const PRESET_AVATARS = [
    { name: 'Executive Pro', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80' },
    { name: 'Tech Lead', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80' },
    { name: 'Creative Designer', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&auto=format&fit=crop&q=80' },
    { name: 'Product Manager', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&auto=format&fit=crop&q=80' },
    { name: 'Strategist', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=160&auto=format&fit=crop&q=80' },
    { name: 'Engineer', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=160&auto=format&fit=crop&q=80' },
  ];

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '');
      setAvatarUrl(user.avatar_url || '');
      setCurrency(user.preferred_currency || 'USD');
      setTimezone(user.timezone || 'UTC');
      db.getNotificationPreferences(user.id).then(setPrefs);
    }
  }, [user]);

  // Handle Photo File Upload
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = async () => {
        const result = reader.result as string;
        setAvatarUrl(result);
        await updateProfile({ avatar_url: result });
        setPhotoMessage('Profile photo updated successfully!');
        setTimeout(() => setPhotoMessage(null), 3500);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectPresetAvatar = async (url: string) => {
    setAvatarUrl(url);
    await updateProfile({ avatar_url: url });
    setShowAvatarModal(false);
    setPhotoMessage('Avatar updated successfully!');
    setTimeout(() => setPhotoMessage(null), 3500);
  };

  const handleRemovePhoto = async () => {
    setAvatarUrl('');
    await updateProfile({ avatar_url: '' });
    setPhotoMessage('Profile picture removed (reverted to initials).');
    setTimeout(() => setPhotoMessage(null), 3500);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      display_name: displayName,
      avatar_url: avatarUrl,
      preferred_currency: currency,
      timezone,
    });
    await db.updateNotificationPreferences(user?.id || 'default-user', prefs);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleExportData = async () => {
    const subs = await db.getSubscriptions(user?.id || 'default-user');
    const rems = await db.getReminders(user?.id || 'default-user');
    const history = await db.getCancellationHistory(user?.id || 'default-user');

    const data = {
      user,
      subscriptions: subs,
      reminders: rems,
      cancellation_history: history,
      export_date: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RecurSight_Complete_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleResetData = () => {
    if (confirm('Are you sure you want to reset all mock subscriptions and reminders to initial defaults?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Account & Preferences
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Manage your personal profile, notification thresholds, and security preferences
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Your settings and preferences have been successfully updated.</span>
        </div>
      )}

      {photoMessage && (
        <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex items-center gap-2.5 text-xs text-blue-800 dark:text-blue-300">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{photoMessage}</span>
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="space-y-6">
        
        {/* User Profile & Profile Picture Section */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-[#2446D8] dark:text-blue-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Profile Details & Photo</h2>
              <p className="text-xs text-slate-400">Personalize your avatar, display name, and preferred currency</p>
            </div>
          </div>

          {/* PROFILE PICTURE EDITING INTERACTION */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row items-center gap-5">
            <div className="relative group shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-[#2446D8] text-white font-extrabold text-2xl flex items-center justify-center shadow-md border-2 border-white dark:border-slate-700 ring-2 ring-blue-500/20">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  displayName.charAt(0).toUpperCase() || 'H'
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                title="Change Photo"
              >
                <Camera className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Profile Photo</h3>
                <p className="text-xs text-slate-400">
                  Upload a custom image or choose from curated avatars. PNG, JPG or WEBP (Max 5MB).
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="py-1.5 px-3 rounded-lg bg-[#2446D8] hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAvatarModal(true)}
                  className="py-1.5 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Choose Preset</span>
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="py-1.5 px-3 rounded-lg border border-red-200 dark:border-red-900/60 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={user?.email || 'hendry.sujon@example.com'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Preferred Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
              >
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
              >
                <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                <option value="America/New_York">Eastern Time (US & Canada)</option>
                <option value="Asia/Kolkata">India Standard Time (IST - +05:30)</option>
                <option value="Europe/London">Greenwich Mean Time (London)</option>
                <option value="Europe/Paris">Central European Time (Paris)</option>
                <option value="UTC">Universal Coordinated Time (UTC)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Alert Delivery Schedule</h2>
              <p className="text-xs text-slate-400">Configure delivery channels and alert thresholds</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 cursor-pointer">
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">Email Notifications</span>
                <span className="text-slate-500">Receive advance warnings via email before renewal</span>
              </div>
              <input
                type="checkbox"
                checked={prefs.email_enabled}
                onChange={(e) => setPrefs({ ...prefs, email_enabled: e.target.checked })}
                className="w-4 h-4 rounded text-[#2446D8]"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 cursor-pointer">
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">In-App Command Bar Alerts</span>
                <span className="text-slate-500">Display notifications inside dashboard header</span>
              </div>
              <input
                type="checkbox"
                checked={prefs.in_app_enabled}
                onChange={(e) => setPrefs({ ...prefs, in_app_enabled: e.target.checked })}
                className="w-4 h-4 rounded text-[#2446D8]"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Default Lead Time (Days Prior)
                </label>
                <select
                  value={prefs.default_lead_days}
                  onChange={(e) => setPrefs({ ...prefs, default_lead_days: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                >
                  <option value={1}>1 day before (24h SLA)</option>
                  <option value={2}>2 days before (48h Standard SLA)</option>
                  <option value={3}>3 days before (72h Safety buffer)</option>
                  <option value={7}>7 days before (1 week advance)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alert Dispatch Time
                </label>
                <input
                  type="time"
                  value={prefs.reminder_dispatch_time}
                  onChange={(e) => setPrefs({ ...prefs, reminder_dispatch_time: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Display & Appearance */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Display & Theme</h2>
              <p className="text-xs text-slate-400">Toggle between Light, Dark, or System mode</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-3.5 rounded-2xl border text-center font-bold flex flex-col items-center gap-2 transition-all ${
                theme === 'light'
                  ? 'bg-blue-50/50 dark:bg-slate-800 border-[#2446D8] text-[#2446D8] shadow-sm'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>Light Mode</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-3.5 rounded-2xl border text-center font-bold flex flex-col items-center gap-2 transition-all ${
                theme === 'dark'
                  ? 'bg-blue-50/50 dark:bg-slate-800 border-[#2446D8] text-[#2446D8] shadow-sm'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>Dark Mode</span>
            </button>

            <button
              type="button"
              onClick={() => toggleTheme()}
              className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-center font-bold flex flex-col items-center gap-2"
            >
              <Globe className="w-4 h-4" />
              <span>Quick Toggle</span>
            </button>
          </div>
        </div>

        {/* Data Management & Ledger Controls */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Data Management & Ledger Controls</h2>
              <p className="text-xs text-slate-400">Backup your database ledger or restore demo environment</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <button
              type="button"
              onClick={handleExportData}
              className="py-3 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4 text-[#2446D8]" />
              <span>Export Full JSON Ledger</span>
            </button>

            <button
              type="button"
              onClick={handleResetData}
              className="py-3 px-4 rounded-2xl border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Reset Mock Database</span>
            </button>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => signOut()}
            className="text-xs font-bold text-red-600 hover:underline px-2 py-1"
          >
            Sign Out of Account
          </button>

          <button
            type="submit"
            className="py-3 px-6 rounded-2xl bg-[#2446D8] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save All Preferences</span>
          </button>
        </div>
      </form>

      {/* Preset Avatar Selection Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Choose a Profile Avatar
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAvatarModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Select one of our curated high-resolution avatars to personalize your RecurSight profile:
            </p>

            <div className="grid grid-cols-3 gap-4">
              {PRESET_AVATARS.map((av) => (
                <button
                  key={av.name}
                  type="button"
                  onClick={() => handleSelectPresetAvatar(av.url)}
                  className="flex flex-col items-center gap-2 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-[#2446D8] hover:scale-105 transition-all group"
                >
                  <div className="w-16 h-16 rounded-full overflow-hidden shadow-sm ring-2 ring-transparent group-hover:ring-[#2446D8]">
                    <img src={av.url} alt={av.name} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    {av.name}
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAvatarModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
