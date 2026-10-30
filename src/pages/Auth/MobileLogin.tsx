import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { SocialAccountChooserModal } from '../../components/common/SocialAccountChooserModal';
import {
  Mail,
  Smartphone,
  ChevronDown,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Edit2,
  Lock,
} from 'lucide-react';
import { AuthSideBanner } from '../../components/common/AuthSideBanner';
import { Logo } from '../../components/common/Logo';

export const MobileLogin: React.FC = () => {
  const { signInWithPhone, verifyPhoneOtp, signInWithOAuth } = useAuth();
  const navigate = useNavigate();

  // Step 1: 'enter_phone', Step 2: 'enter_otp'
  const [step, setStep] = useState<'enter_phone' | 'enter_otp'>('enter_phone');
  const [fullName, setFullName] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [socialModalProvider, setSocialModalProvider] = useState<'google' | 'apple' | 'microsoft' | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);

  // Resend OTP Countdown
  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // Step 1: Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);
    const fullPhone = `${countryCode} ${cleanPhone}`;
    const { error } = await signInWithPhone(fullPhone);
    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setStep('enter_otp');
      setOtpValues(['', '', '', '', '', '']);
      setCooldown(45);
      setSuccessNotice(`6-digit OTP sent to ${countryCode} ${cleanPhone}`);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  };

  // Handle single digit and multi-digit paste in OTP boxes
  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) {
      const digits = val.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = ['', '', '', '', '', ''];
      digits.forEach((d, idx) => {
        newOtp[idx] = d;
      });
      setOtpValues(newOtp);
      const nextIndex = Math.min(digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const cleanChar = val.replace(/\D/g, '');
    const newOtp = [...otpValues];
    newOtp[index] = cleanChar;
    setOtpValues(newOtp);

    if (cleanChar && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = otpValues.join('');
    if (token.length < 6) {
      setErrorMessage('Please enter the complete 6-digit OTP code.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);
    const fullPhone = `${countryCode} ${phoneNumber.replace(/\s+/g, '')}`;
    const { error } = await verifyPhoneOtp(fullPhone, token, fullName);
    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
    } else {
      navigate('/overview');
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (cooldown > 0) return;
    setErrorMessage(null);
    setCooldown(45);
    setOtpValues(['', '', '', '', '', '']);
    const fullPhone = `${countryCode} ${phoneNumber.replace(/\s+/g, '')}`;
    await signInWithPhone(fullPhone);
    setSuccessNotice(`New OTP sent to ${fullPhone}`);
    inputRefs.current[0]?.focus();
  };

  // Switch back to Step 1 (change phone number)
  const handleEditPhone = () => {
    setStep('enter_phone');
    setSuccessNotice(null);
    setErrorMessage(null);
    setOtpValues(['', '', '', '', '', '']);
    setTimeout(() => {
      phoneInputRef.current?.focus();
    }, 100);
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
      
      {/* Outer Card Container matching Screenshot 6 */}
      <div className="w-full max-w-[960px] bg-white rounded-[28px] shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 border border-slate-100">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: Uploaded Photo with Subscription Card Overlay */}
        {/* ========================================================= */}
        <AuthSideBanner />

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Mobile & OTP Sign In Form                   */}
        {/* ========================================================= */}
        <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center bg-white">
          <div className="max-w-sm w-full mx-auto">
            
            {/* Branded Logo */}
            <div className="flex justify-center mb-2">
              <Logo className="h-11 w-auto max-w-[220px]" />
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
              <NavLink
                to="/login/email"
                className="flex-1 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center justify-center gap-2 transition-all"
              >
                <Mail className="w-4 h-4 text-slate-500" />
                <span>Email</span>
              </NavLink>

              <button
                type="button"
                className="flex-1 py-2 rounded-lg bg-white text-xs font-bold text-slate-900 shadow-xs flex items-center justify-center gap-2 transition-all"
              >
                <Smartphone className="w-4 h-4 text-[#2446D8]" />
                <span>Mobile Number</span>
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success / OTP Sent Notice */}
            {successNotice && step === 'enter_otp' && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={handleEditPhone}
                  className="font-bold underline text-[#2446D8] hover:text-blue-700 ml-2 cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Change</span>
                </button>
              </div>
            )}

            {/* ========================================================= */}
            {/* STEP 1: ENTER MOBILE NUMBER                               */}
            {/* ========================================================= */}
            {step === 'enter_phone' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Your Name <span className="text-slate-400 font-normal text-[11px]">(Optional — shown on your dashboard)</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Yashwanth"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F8FAFC] text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2446D8]/20 focus:border-[#2446D8] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mobile Number
                  </label>
                  <div className="relative flex rounded-xl border border-slate-200 bg-[#F8FAFC] overflow-hidden focus-within:ring-2 focus-within:ring-[#2446D8]/20 focus-within:border-[#2446D8] transition-all">
                    {/* Country Selector */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                        className="h-full px-3 py-2.5 flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 border-r border-slate-200 transition-colors"
                      >
                        <span>{countryCode}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      </button>

                      {isCountryDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg z-30 py-1 min-w-[130px]">
                          {[
                            { code: '+91', name: 'India (+91)' },
                            { code: '+1', name: 'USA (+1)' },
                            { code: '+44', name: 'UK (+44)' },
                            { code: '+65', name: 'Singapore (+65)' },
                            { code: '+971', name: 'UAE (+971)' },
                          ].map((c) => (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => {
                                setCountryCode(c.code);
                                setIsCountryDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                                countryCode === c.code
                                  ? 'bg-blue-50 text-[#2446D8] font-bold'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {c.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Phone input */}
                    <input
                      ref={phoneInputRef}
                      type="tel"
                      required
                      autoFocus
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Enter 10-digit mobile number"
                      className="w-full px-3.5 py-2.5 bg-transparent text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    We will send a 6-digit one-time password (OTP) via SMS.
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || phoneNumber.replace(/\D/g, '').length < 10}
                  className="w-full py-3 px-4 rounded-xl bg-[#2446D8] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 transition-all mt-2 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Get OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* ========================================================= */
              /* STEP 2: ENTER OTP (CLEAN, EMPTY, NO PRE-FILLED DIGITS)    */
              /* ========================================================= */
              <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in fade-in duration-200">
                {/* OTP Row Header */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <span className="font-bold text-slate-700">Enter 6-Digit OTP</span>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={cooldown > 0}
                    className={`font-bold transition-colors cursor-pointer ${
                      cooldown > 0
                        ? 'text-[#2446D8] opacity-70 cursor-default'
                        : 'text-[#2446D8] hover:underline'
                    }`}
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                  </button>
                </div>

                {/* 6-Digit OTP Boxes: Clean & Empty */}
                <div className="grid grid-cols-6 gap-2 pt-1">
                  {otpValues.map((digit, index) => {
                    const isFocused = Boolean(inputRefs.current[index] && document.activeElement === inputRefs.current[index]);
                    return (
                      <input
                        key={index}
                        ref={(el) => (inputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        placeholder="•"
                        className={`h-12 w-full rounded-xl text-center text-sm font-bold transition-all focus:outline-none ${
                          digit
                            ? 'border-2 border-[#2446D8] bg-white text-slate-900 shadow-xs'
                            : 'border border-slate-200 bg-[#F8FAFC] text-slate-900 focus:border-[#2446D8] focus:bg-white focus:ring-2 focus:ring-[#2446D8]/20'
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Change Number Option */}
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-400">Didn't get the code?</span>
                  <button
                    type="button"
                    onClick={handleEditPhone}
                    className="font-bold text-slate-600 hover:text-[#2446D8] transition-colors cursor-pointer"
                  >
                    Change phone number
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || otpValues.join('').length < 6}
                  className="w-full py-3 px-4 rounded-xl bg-[#2446D8] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 transition-all mt-2 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Verify OTP & Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Terms text */}
            <p className="text-[10px] text-center text-slate-400 mt-4 leading-relaxed">
              By signing in, you agree to RecurSight{' '}
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

            {/* Social Logins */}
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
