import React, { useState } from 'react';
import { X, Check, Shield, User, Plus, ExternalLink } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export interface SocialAccount {
  name: string;
  email: string;
  avatarColor: string;
}

interface SocialAccountChooserModalProps {
  isOpen: boolean;
  provider: 'google' | 'apple' | 'microsoft' | null;
  onClose: () => void;
  onConfirm: (account: { name: string; email: string; provider: string }) => Promise<void>;
}

export const SocialAccountChooserModal: React.FC<SocialAccountChooserModalProps> = ({
  isOpen,
  provider,
  onClose,
  onConfirm,
}) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appleEmailOption, setAppleEmailOption] = useState<'share' | 'hide'>('share');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [customAccounts, setCustomAccounts] = useState<SocialAccount[]>([]);

  if (!isOpen || !provider) return null;

  const accountsByProvider: Record<'google' | 'apple' | 'microsoft', SocialAccount[]> = {
    google: [
      ...customAccounts,
      { name: 'Yashwanth Chandran', email: 'yashwanthchandran@gmail.com', avatarColor: 'bg-blue-600' },
      { name: 'Personal Google Account', email: 'yashwanth@gmail.com', avatarColor: 'bg-emerald-600' },
    ],
    microsoft: [
      ...customAccounts,
      { name: 'Yashwanth (Outlook)', email: 'yashwanth@outlook.com', avatarColor: 'bg-sky-600' },
    ],
    apple: [
      ...customAccounts,
      { name: 'Yashwanth (Apple ID)', email: 'yashwanth@icloud.com', avatarColor: 'bg-slate-900' },
    ],
  };

  const accounts = accountsByProvider[provider] || accountsByProvider.google;
  const activeAccount = accounts[selectedIdx] || accounts[0];

  const handleAddCustomAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;
    const newAcc: SocialAccount = {
      name: customName.trim() || customEmail.split('@')[0],
      email: customEmail.trim(),
      avatarColor: 'bg-[#2446D8]',
    };
    setCustomAccounts([newAcc, ...customAccounts]);
    setSelectedIdx(0);
    setShowCustomInput(false);
    setCustomName('');
    setCustomEmail('');
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    const emailToUse =
      provider === 'apple' && appleEmailOption === 'hide'
        ? `yashwanth.privaterelay@appleid.com`
        : activeAccount.email;

    await onConfirm({
      name: activeAccount.name,
      email: emailToUse,
      provider,
    });
    setIsSubmitting(false);
  };

  const handleDirectOAuth = async () => {
    if (isSupabaseConfigured && supabase) {
      setIsSubmitting(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider === 'microsoft' ? 'azure' : (provider || 'google'),
        options: {
          redirectTo: window.location.origin + '/overview',
        },
      });
      if (error) {
        alert(`Supabase OAuth notice: ${error.message}\n\nPlease ensure ${provider} provider is enabled in your Supabase Dashboard ➔ Authentication ➔ Providers.`);
        setIsSubmitting(false);
      }
    } else {
      alert('Supabase credentials (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) are not configured yet in this environment.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-[440px] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            {provider === 'google' && (
              <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shadow-xs">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                  <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9z" />
                  <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z" />
                </svg>
              </div>
            )}
            {provider === 'microsoft' && (
              <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shadow-xs">
                <svg className="w-4 h-4" viewBox="0 0 23 23">
                  <path fill="#f35325" d="M1 1h10v10H1z" />
                  <path fill="#81bc06" d="M12 1h10v10H12z" />
                  <path fill="#05a6f0" d="M1 12h10v10H1z" />
                  <path fill="#ffba08" d="M12 12h10v10H12z" />
                </svg>
              </div>
            )}
            {provider === 'apple' && (
              <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center shadow-xs text-white">
                <svg className="w-4 h-4 fill-white" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.6-7.85-11.75-14.42-6-9.5-10.59-20.08-13.78-31.74-3.19-11.66-4.78-22.84-4.78-33.55 0-14.18 3.52-26.06 10.57-35.63 7.05-9.57 16.02-14.47 26.9-14.7 4.93 0 10.22 1.3 15.87 3.89 5.65 2.6 9.4 3.95 11.25 4.07 1.48-.12 5.48-1.54 12-4.26 6.52-2.72 12.03-3.86 16.54-3.41 12.28.61 22.06 5.09 29.33 13.43-10.74 6.52-16 15.48-15.79 26.88.22 8.92 3.63 16.32 10.23 22.21 6.6 5.89 14.52 9.28 23.76 10.17-2.17 6.74-4.78 13.04-7.82 18.91zM119.22 33.15c0-7.39 2.6-14.07 7.82-20.04 5.21-5.97 11.6-9.67 19.16-11.11.22 1.09.33 2.17.33 3.26 0 7.39-2.72 14.18-8.15 20.37-5.43 6.19-11.95 9.78-19.16 10.76v-3.24z" />
                </svg>
              </div>
            )}

            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                {provider === 'google' && 'Sign in with Google'}
                {provider === 'microsoft' && 'Pick a Microsoft Account'}
                {provider === 'apple' && 'Sign in with Apple ID'}
              </h2>
              <p className="text-xs text-slate-500">
                Choose an account to continue to <span className="font-semibold text-slate-800">RecurSight</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Account Selection Body */}
        <div className="p-6 pt-4 space-y-3">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Select Account
          </p>

          <div className="space-y-2">
            {accounts.map((acc, index) => {
              const isSelected = selectedIdx === index;
              return (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => setSelectedIdx(index)}
                  className={`w-full p-3 rounded-2xl flex items-center justify-between text-left transition-all border ${
                    isSelected
                      ? 'border-[#2446D8] bg-blue-50/60 ring-2 ring-[#2446D8]/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full ${acc.avatarColor} text-white font-bold flex items-center justify-center text-xs shadow-xs`}
                    >
                      {acc.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{acc.name}</span>
                        {index === 0 && (
                          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">{acc.email}</div>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-[#2446D8] text-white shadow-xs'
                        : 'border border-slate-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}

            {/* Add custom account form or button */}
            {showCustomInput ? (
              <form onSubmit={handleAddCustomAccount} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 animate-in fade-in">
                <span className="text-[11px] font-bold text-slate-700 block">Add your account:</span>
                <input
                  type="text"
                  placeholder="Your Name (e.g. Yashwanth)"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#2446D8]"
                />
                <input
                  type="email"
                  required
                  placeholder="Your Email (e.g. yashwanthchandran@gmail.com)"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#2446D8]"
                />
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-1.5 rounded-lg bg-[#2446D8] text-white text-xs font-bold hover:bg-blue-700 transition-colors"
                  >
                    Select this Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(false)}
                    className="py-1.5 px-3 rounded-lg border border-slate-200 text-slate-600 text-xs hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                className="w-full p-2.5 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 flex items-center justify-center gap-2 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Use another account (Enter your custom name & email)</span>
              </button>
            )}
          </div>

          {/* Apple ID Privacy Option */}
          {provider === 'apple' && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-[11px] font-bold text-slate-700">Email privacy</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAppleEmailOption('share')}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border text-left flex items-center justify-between ${
                    appleEmailOption === 'share'
                      ? 'border-[#2446D8] bg-blue-50 text-[#2446D8] font-bold'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <span>Share My Email</span>
                  {appleEmailOption === 'share' && <Check className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => setAppleEmailOption('hide')}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border text-left flex items-center justify-between ${
                    appleEmailOption === 'hide'
                      ? 'border-[#2446D8] bg-blue-50 text-[#2446D8] font-bold'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <span>Hide My Email</span>
                  {appleEmailOption === 'hide' && <Check className="w-3 h-3" />}
                </button>
              </div>
            </div>
          )}

          {/* Privacy Note */}
          <div className="pt-2 flex items-start gap-2 text-[10px] text-slate-400 leading-relaxed">
            <Shield className="w-3.5 h-3.5 shrink-0 text-emerald-600 mt-0.5" />
            <span>
              To continue, {provider === 'google' ? 'Google' : provider === 'apple' ? 'Apple' : 'Microsoft'} will share your name and email with RecurSight.
            </span>
          </div>

          {/* Official Provider Redirect Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleDirectOAuth}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-600 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              <span>Or redirect to official {provider === 'google' ? 'Google' : provider === 'apple' ? 'Apple' : 'Microsoft'} OAuth login</span>
            </button>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-[#2446D8] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Confirm & Continue</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
