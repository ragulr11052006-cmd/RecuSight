import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  AtSign,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { AuthSideBanner } from '../../components/common/AuthSideBanner';
import { Logo } from '../../components/common/Logo';

export const SignUp: React.FC = () => {
  const { signUpWithEmail, signInWithOAuth } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);
    setLoading(true);

    const { error, needsEmailConfirmation } = await signUpWithEmail(email, password, displayName);
    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
    } else if (needsEmailConfirmation) {
      setSuccessNotice(
        `Account created for ${email}! A confirmation link was sent to your email. (Tip: Turn off "Confirm email" in Supabase Auth settings to log in immediately).`
      );
    } else {
      navigate('/overview');
    }
  };

  const handleGoogleSignUp = async () => {
    setErrorMessage(null);
    setGoogleLoading(true);
    const { error } = await signInWithOAuth('google');
    if (error) {
      setErrorMessage(error.message);
      setGoogleLoading(false);
    } else {
      navigate('/overview');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-[#1C36B6] via-[#2446D8] to-[#1D3CBF] p-4 sm:p-6 lg:p-8 font-sans">
      
      {/* Outer Card Container matching Sign In Layout */}
      <div className="w-full max-w-[960px] bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 border border-slate-100 dark:border-slate-800">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: Uploaded Photo with Subscription Card Overlay */}
        {/* ========================================================= */}
        <AuthSideBanner />

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Sign Up Form                                */}
        {/* ========================================================= */}
        <div className="p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-white dark:bg-slate-900">
          <div className="max-w-sm w-full mx-auto">
            
            {/* Branded Logo */}
            <div className="flex justify-center mb-2">
              <Logo className="h-11 w-auto max-w-[220px]" />
            </div>

            {/* Title & Subtitle */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Sign Up
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Create your account to start tracking your subscriptions
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-700 dark:text-red-300 animate-in fade-in space-y-1.5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                  <div>
                    <span className="font-semibold block">{errorMessage}</span>
                    {errorMessage.toLowerCase().includes('rate limit') && (
                      <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 leading-relaxed">
                        Supabase free tier limits confirmation emails to 3/hour. Disable "Confirm email" in Supabase Auth to register instantly.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Success Notice */}
            {successNotice && (
              <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                <span>{successNotice}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2446D8]/20 focus:border-[#2446D8] transition-all"
                  />
                  <User className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2446D8]/20 focus:border-[#2446D8] transition-all"
                  />
                  <AtSign className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Password (min 6 characters)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2446D8]/20 focus:border-[#2446D8] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-[#2446D8] hover:bg-blue-700 disabled:opacity-70 text-white text-xs font-bold shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 transition-all mt-2 cursor-pointer"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Terms text */}
            <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 mt-4 leading-relaxed">
              By Signing up, you agree to RecurSight{' '}
              <a href="#terms" className="text-slate-600 dark:text-slate-400 font-medium hover:underline">
                Terms of Use
              </a>{' '}
              and{' '}
              <a href="#privacy" className="text-slate-600 dark:text-slate-400 font-medium hover:underline">
                Privacy Policy
              </a>
              .
            </p>

            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider text-slate-400">
                <span className="bg-white dark:bg-slate-900 px-3">OR</span>
              </div>
            </div>

            {/* Google Direct OAuth Button */}
            <button
              type="button"
              disabled={googleLoading}
              onClick={handleGoogleSignUp}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs flex items-center justify-center gap-2.5 transition-all cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 disabled:opacity-60"
            >
              {googleLoading ? (
                <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
              )}
              <span>{googleLoading ? 'Redirecting to Google...' : 'Continue with Google'}</span>
            </button>

            {/* Bottom Links */}
            <div className="mt-6 text-center space-y-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Already have an account?{' '}
                <NavLink to="/login" className="font-bold text-[#2446D8] dark:text-blue-400 hover:underline">
                  Sign In
                </NavLink>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Need help? Contact{' '}
                <NavLink to="/help" className="font-bold text-[#2446D8] dark:text-blue-400 hover:underline">
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
