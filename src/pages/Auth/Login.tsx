import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { SocialAccountChooserModal } from '../../components/common/SocialAccountChooserModal';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Smartphone,
  AlertCircle,
  CheckCircle2,
  AtSign,
} from 'lucide-react';

export const Login: React.FC = () => {
  const { signInWithEmail, signUpWithEmail, signInWithOAuth } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [socialModalProvider, setSocialModalProvider] = useState<'google' | 'apple' | 'microsoft' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);
    setLoading(true);

    const { error } = await signInWithEmail(email, password, rememberMe);
    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
    } else {
      navigate('/overview');
    }
  };

  const handleQuickSignUp = async () => {
    if (!email || !password) return;
    setErrorMessage(null);
    setSuccessNotice(null);
    setLoading(true);

    const { error, needsEmailConfirmation } = await signUpWithEmail(email, password, email.split('@')[0]);
    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
    } else if (needsEmailConfirmation) {
      setSuccessNotice(`Account created for ${email}! A confirmation link was dispatched. (Tip: Turn off "Confirm email" in Supabase Auth settings to log in immediately).`);
    } else {
      navigate('/overview');
    }
  };

  const handleSocialClick = (provider: 'google' | 'apple' | 'microsoft') => {
    setSocialModalProvider(provider);
  };

  const handleConfirmSocialAccount = async (account: { name: string; email: string; provider: string }) => {
    await signInWithOAuth(account.provider as any, { name: account.name, email: account.email });
    setSocialModalProvider(null);
    navigate('/overview');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-[#1C36B6] via-[#2446D8] to-[#1D3CBF] p-4 sm:p-6 lg:p-8 font-sans">
      
      {/* Outer Card Container matching Screenshot 5 */}
      <div className="w-full max-w-[960px] bg-white rounded-[28px] shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 border border-slate-100">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: Young Man with Phone & Subscriptions Card     */}
        {/* ========================================================= */}
        <div className="hidden md:block relative h-full w-full bg-slate-900 overflow-hidden min-h-[580px]">
          <img
            src="/auth-side-banner.png"
            alt="RecurSight Vault 2.0 Subscriptions"
            className="w-full h-full object-cover object-left"
          />
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Sign In Form                                */}
        {/* ========================================================= */}
        <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center bg-white">
          <div className="max-w-sm w-full mx-auto">
            
            {/* Branded Logo */}
            <div className="text-center mb-1">
              <img
                src="/logo.png"
                alt="RecurSight"
                className="h-10 mx-auto object-contain"
              />
            </div>

            {/* Title & Subtitle */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Sign In
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Choose your login method to access your subscriptions
              </p>
            </div>

            {/* Segmented Method Switcher Pill */}
            <div className="flex rounded-xl bg-[#F0F4FA] p-1 mb-6 border border-slate-100">
              <button
                type="button"
                className="flex-1 py-2 rounded-lg bg-white text-xs font-bold text-slate-900 shadow-xs flex items-center justify-center gap-2 transition-all"
              >
                <Mail className="w-4 h-4 text-[#2446D8]" />
                <span>Email</span>
              </button>
              
              <NavLink
                to="/login"
                className="flex-1 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center justify-center gap-2 transition-all"
              >
                <Smartphone className="w-4 h-4 text-slate-500" />
                <span>Mobile Number</span>
              </NavLink>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 animate-in fade-in space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <div>
                    <span className="font-semibold block">{errorMessage}</span>
                    {errorMessage.toLowerCase().includes('invalid login credentials') && (
                      <span className="text-[11px] text-red-600 block mt-0.5">
                        This account may not be registered yet in Supabase.
                      </span>
                    )}
                  </div>
                </div>

                {errorMessage.toLowerCase().includes('invalid login credentials') && email && password && (
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleQuickSignUp}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-lg bg-[#2446D8] hover:bg-blue-700 text-white font-bold text-[11px] transition-colors shadow-xs cursor-pointer"
                    >
                      {loading ? 'Creating Account...' : `Sign Up as ${email.split('@')[0]}`}
                    </button>
                    <NavLink
                      to="/signup"
                      className="text-[11px] font-bold text-[#2446D8] hover:underline"
                    >
                      Go to Sign Up page →
                    </NavLink>
                  </div>
                )}
              </div>
            )}

            {/* Success / OTP / Confirmation Notice */}
            {successNotice && (
              <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{successNotice}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 bg-[#F8FAFC] text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2446D8]/20 focus:border-[#2446D8] transition-all"
                  />
                  <AtSign className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 bg-[#F8FAFC] text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2446D8]/20 focus:border-[#2446D8] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me & Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-[#2446D8] focus:ring-[#2446D8] border-slate-300"
                  />
                  <span>Remember me</span>
                </label>
                <NavLink
                  to="/forgot-password"
                  className="font-bold text-[#2446D8] hover:underline"
                >
                  Forgot Password ?
                </NavLink>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-[#2446D8] hover:bg-blue-700 disabled:opacity-70 text-white text-xs font-bold shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 transition-all mt-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Sign in</span>
                )}
              </button>
            </form>

            {/* Terms text */}
            <p className="text-[10px] text-center text-slate-400 mt-4 leading-relaxed">
              By Signing in, you agree to RecurSight{' '}
              <a href="#terms" className="text-slate-600 font-medium hover:underline">
                Terms of Use
              </a>{' '}
              and{' '}
              <a href="#privacy" className="text-slate-600 font-medium hover:underline">
                Privacy Policy
              </a>
              .
            </p>

            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider text-slate-400">
                <span className="bg-white px-3">OR SIGN IN WITH</span>
              </div>
            </div>

            {/* Social Logins: Google, Microsoft, Apple */}
            <div className="flex items-center justify-center gap-3">
              {/* Google */}
              <button
                type="button"
                onClick={() => handleSocialClick('google')}
                className="w-11 h-11 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                title="Sign in with Google"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
                  />
                </svg>
              </button>

              {/* Microsoft */}
              <button
                type="button"
                onClick={() => handleSocialClick('microsoft')}
                className="w-11 h-11 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                title="Sign in with Microsoft"
              >
                <svg className="w-4 h-4" viewBox="0 0 23 23">
                  <path fill="#f35325" d="M1 1h10v10H1z" />
                  <path fill="#81bc06" d="M12 1h10v10H12z" />
                  <path fill="#05a6f0" d="M1 12h10v10H1z" />
                  <path fill="#ffba08" d="M12 12h10v10H12z" />
                </svg>
              </button>

              {/* Apple */}
              <button
                type="button"
                onClick={() => handleSocialClick('apple')}
                className="w-11 h-11 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                title="Sign in with Apple"
              >
                <svg className="w-4 h-4 fill-slate-900" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.6-7.85-11.75-14.42-6-9.5-10.59-20.08-13.78-31.74-3.19-11.66-4.78-22.84-4.78-33.55 0-14.18 3.52-26.06 10.57-35.63 7.05-9.57 16.02-14.47 26.9-14.7 4.93 0 10.22 1.3 15.87 3.89 5.65 2.6 9.4 3.95 11.25 4.07 1.48-.12 5.48-1.54 12-4.26 6.52-2.72 12.03-3.86 16.54-3.41 12.28.61 22.06 5.09 29.33 13.43-10.74 6.52-16 15.48-15.79 26.88.22 8.92 3.63 16.32 10.23 22.21 6.6 5.89 14.52 9.28 23.76 10.17-2.17 6.74-4.78 13.04-7.82 18.91zM119.22 33.15c0-7.39 2.6-14.07 7.82-20.04 5.21-5.97 11.6-9.67 19.16-11.11.22 1.09.33 2.17.33 3.26 0 7.39-2.72 14.18-8.15 20.37-5.43 6.19-11.95 9.78-19.16 10.76v-3.24z" />
                </svg>
              </button>
            </div>

            {/* Account Chooser Confirmation Modal */}
            <SocialAccountChooserModal
              isOpen={Boolean(socialModalProvider)}
              provider={socialModalProvider}
              onClose={() => setSocialModalProvider(null)}
              onConfirm={handleConfirmSocialAccount}
            />

            {/* Bottom Links */}
            <div className="mt-6 text-center space-y-1">
              <p className="text-xs text-slate-500">
                Don't have an account?{' '}
                <NavLink to="/signup" className="font-bold text-[#2446D8] hover:underline">
                  Sign Up
                </NavLink>
              </p>
              <p className="text-xs text-slate-500">
                Need help? Contact{' '}
                <NavLink to="/help" className="font-bold text-[#2446D8] hover:underline">
                  IT Support
                </NavLink>
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
