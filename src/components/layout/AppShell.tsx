import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { CURRENCY_SYMBOLS, Currency } from '../../types';
import { formatCurrencyAmount } from '../../lib/currency';
import {
  LayoutDashboard,
  CreditCard,
  Bell,
  ShieldAlert,
  RotateCcw,
  Settings,
  HelpCircle,
  Moon,
  Sun,
  Search,
  LogOut,
  Menu,
  X,
  Share2,
  Check,
  ChevronDown,
  Sparkles,
  ExternalLink,
  Lock,
  Gift,
} from 'lucide-react';

export const AppShell: React.FC = () => {
  const { user, signOut, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(`${window.location.origin}/signup?ref=${user?.id || 'recusight50'}`);
    setReferralCopied(true);
    setTimeout(() => setReferralCopied(false), 2500);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/subscriptions?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navItems = [
    { name: 'Overview', path: '/overview', icon: LayoutDashboard },
    { name: 'Subscriptions', path: '/subscriptions', icon: CreditCard },
    { name: 'Reminders', path: '/reminders', icon: Bell },
    { name: 'Cancellation & Autopay', path: '/cancellation-guidance', icon: RotateCcw },
  ];

  const supportItems = [
    { name: 'Settings', path: '/settings', icon: Settings },
    { name: 'Help & Support', path: '/help', icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ========================================================= */}
      {/* SIDEBAR NAVIGATION                                       */}
      {/* ========================================================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto px-5 py-6">
          {/* Logo Header */}
          <div className="flex items-center justify-between mb-8 px-2">
            <NavLink to="/overview" className="flex items-center gap-2 group">
              <img
                src="/logo.png"
                alt="RecurSight"
                className="h-11 w-auto max-w-[200px] object-contain dark:brightness-110 group-hover:scale-[1.02] transition-transform"
              />
            </NavLink>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* MAIN NAV SECTION */}
          <div className="mb-6">
            <div className="px-3 mb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              MAIN
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#EEF2FF] text-[#2446D8] dark:bg-blue-950/60 dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#2446D8] dark:text-blue-400' : 'text-slate-400'}`} />
                      <span>{item.name}</span>
                    </div>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2446D8] dark:bg-blue-400 shrink-0" />
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* SUPPORT NAV SECTION */}
          <div className="mb-6">
            <div className="px-3 mb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              SUPPORT
            </div>
            <nav className="space-y-1">
              {supportItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#EEF2FF] text-[#2446D8] dark:bg-blue-950/60 dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#2446D8] dark:text-blue-400' : 'text-slate-400'}`} />
                      <span>{item.name}</span>
                    </div>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2446D8] dark:bg-blue-400 shrink-0" />
                    )}
                  </NavLink>
                );
              })}

              {/* Dark Mode Toggle Switch */}
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-3">
                  <Moon className="w-4 h-4 text-slate-400" />
                  <span>Dark Mode</span>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`w-10 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    theme === 'dark' ? 'bg-[#2446D8]' : 'bg-slate-200'
                  }`}
                  title="Toggle Dark Mode"
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </nav>
          </div>

          {/* Bottom Referral Card from Figma */}
          <div className="mt-auto pt-4">
            <div className="p-4 rounded-2xl bg-[#2446D8] text-white relative overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-4 h-4 text-white" />
                <span className="font-bold text-xs text-white">
                  Earn {user?.preferred_currency === 'INR' ? '₹500' : formatCurrencyAmount(50, user?.preferred_currency || 'USD', 'USD')} when you refer!
                </span>
              </div>
              <p className="text-[11px] text-blue-100 mb-3 leading-relaxed">
                Refer a friend and get instant cashback on your tracking subscription.
              </p>
              <button
                onClick={handleCopyReferral}
                className="w-full py-2 px-3 rounded-xl bg-white hover:bg-blue-50 text-[#2446D8] text-xs font-bold transition-colors shadow-xs"
              >
                {referralCopied ? 'Link Copied!' : 'Invite friends'}
              </button>
            </div>

            {/* TLS 1.3 Bank Sync Active */}
            <div className="flex items-center gap-2 px-2 mt-4 text-[11px] font-medium text-slate-400">
              <Lock className="w-3.5 h-3.5 text-[#2446D8]" />
              <span>TLS 1.3 Bank Sync Active</span>
            </div>
          </div>
        </div>

        {/* User Profile Mini Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-blue-100 dark:bg-blue-950 text-[#2446D8] dark:text-blue-300 font-bold flex items-center justify-center text-sm border border-blue-200 dark:border-blue-800 shrink-0 shadow-xs">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.display_name} className="w-full h-full object-cover" />
              ) : (
                (user?.display_name || user?.email || 'U').charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex flex-col truncate max-w-[130px]">
              <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {user?.display_name || user?.email?.split('@')[0] || 'User'}
              </span>
              <span className="text-[11px] text-slate-400 truncate">{user?.email || user?.phone_number || ''}</span>
            </div>
          </div>
          <button
            onClick={async () => {
              await signOut();
              navigate('/login', { replace: true });
            }}
            title="Sign Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* MAIN APPLICATION CONTENT                                 */}
      {/* ========================================================= */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        {/* TOP COMMAND & GREETING HEADER */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          {/* Left: Mobile trigger & Greeting */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg lg:text-xl font-extrabold text-[#151B2D] dark:text-white tracking-tight">
              Hello, {user?.display_name || user?.email?.split('@')[0] || 'User'}!
            </h1>
          </div>

          {/* Center: Universal Search Input */}
          <div className="flex-1 max-w-xl mx-4 hidden md:block">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name,subscriptions....."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-full bg-[#F1F5F9] dark:bg-slate-800 border border-transparent dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#2446D8]/20 focus:border-slate-300 transition-all"
              />
            </form>
          </div>

          {/* Right: Currency Switcher, Notification Bell & Profile Pill */}
          <div className="flex items-center gap-2.5">
            {/* Preferred Currency Switcher Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition-colors"
                title="Change Preferred Display Currency"
              >
                <span className="text-[#2446D8] dark:text-blue-400 font-black text-sm">
                  {CURRENCY_SYMBOLS[user?.preferred_currency || 'USD']}
                </span>
                <span>{user?.preferred_currency || 'USD'}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {currencyDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 mb-1">
                    Display Currency
                  </div>
                  {[
                    { code: 'INR', symbol: '₹', label: 'INR (Indian Rupee)' },
                    { code: 'USD', symbol: '$', label: 'USD (US Dollar)' },
                    { code: 'EUR', symbol: '€', label: 'EUR (Euro)' },
                    { code: 'GBP', symbol: '£', label: 'GBP (British Pound)' },
                  ].map((cur) => (
                    <button
                      key={cur.code}
                      type="button"
                      onClick={() => {
                        updateProfile({ preferred_currency: cur.code as any });
                        setCurrencyDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                        (user?.preferred_currency || 'USD') === cur.code
                          ? 'bg-blue-50 text-[#2446D8] dark:bg-blue-950/60 dark:text-blue-300 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-4 font-bold text-center text-[#2446D8]">{cur.symbol}</span>
                        <span>{cur.label}</span>
                      </span>
                      {(user?.preferred_currency || 'USD') === cur.code && (
                        <Check className="w-3.5 h-3.5 text-[#2446D8]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Bell with Red Badge '8' */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationOpen(!notificationOpen)}
                className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs relative transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                  8
                </span>
              </button>

              {/* Notification Dropdown */}
              {notificationOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Recent Alerts
                    </span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold cursor-pointer">
                      Mark all read
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
                      <p className="font-semibold text-amber-900 dark:text-amber-200">
                        Figma trial ends in 3 days
                      </p>
                      <p className="text-amber-700 dark:text-amber-300 text-[11px] mt-0.5">
                        Card ••4821 will be charged {formatCurrencyAmount(15.00, user?.preferred_currency || 'USD', 'USD')} on Oct 31 unless cancelled.
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                      <p className="font-semibold text-blue-900 dark:text-blue-200">
                        Notion AI Plus Renewal
                      </p>
                      <p className="text-blue-700 dark:text-blue-300 text-[11px] mt-0.5">
                        Upcoming renewal scheduled in 5 days ({formatCurrencyAmount(10.00, user?.preferred_currency || 'USD', 'USD')}).
                      </p>
                    </div>
                  </div>
                  <NavLink
                    to="/reminders"
                    onClick={() => setNotificationOpen(false)}
                    className="block text-center text-xs font-semibold text-[#2446D8] dark:text-blue-400 pt-3 hover:underline"
                  >
                    View All Reminders →
                  </NavLink>
                </div>
              )}
            </div>

            {/* Profile Pill with Avatar, Name & 'Personal' subtext */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="w-9 h-9 rounded-full overflow-hidden bg-blue-100 dark:bg-blue-950 text-[#2446D8] dark:text-blue-300 font-bold text-xs flex items-center justify-center shadow-xs shrink-0 border border-slate-200 dark:border-slate-700">
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.display_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{(user?.display_name || user?.email || 'U').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="text-left leading-tight hidden sm:block">
                  <span className="text-xs font-bold text-[#151B2D] dark:text-white block">
                    {user?.display_name || user?.email?.split('@')[0] || 'User'}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-normal truncate max-w-[120px]">
                    {user?.email || user?.phone_number || 'Personal'}
                  </span>
                </div>
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {user?.display_name || 'User'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{user?.email || user?.phone_number || ''}</p>
                  </div>
                  <NavLink
                    to="/settings"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    Account Settings
                  </NavLink>
                  <NavLink
                    to="/help"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <HelpCircle className="w-4 h-4 text-slate-400" />
                    Help & FAQs
                  </NavLink>
                  <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                  <button
                    onClick={async () => {
                      setUserDropdownOpen(false);
                      await signOut();
                      navigate('/login', { replace: true });
                    }}
                    className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Outlet */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
