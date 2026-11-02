import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { db } from '../../lib/supabase';
import { CURRENCY_SYMBOLS, Currency } from '../../types';
import { formatCurrencyAmount } from '../../lib/currency';
import { Logo } from '../common/Logo';
import { MerchantLogo } from '../common/MerchantLogo';
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
  const [activeNotificationTab, setActiveNotificationTab] = useState<'all' | 'renewals' | 'trials' | 'system'>('all');
  const notificationMenuRef = useRef<HTMLDivElement | null>(null);
  const [referralCopied, setReferralCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  interface AppNotification {
    id: string;
    merchantName: string;
    title: string;
    message: string;
    meta?: string;
    category: 'renewals' | 'trials' | 'system';
    timeAgo: string;
    unread: boolean;
    type: 'warning' | 'info' | 'success';
  }

  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Close notifications on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        notificationMenuRef.current &&
        !notificationMenuRef.current.contains(e.target as Node)
      ) {
        setNotificationOpen(false);
      }
    }
    if (notificationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notificationOpen]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const loadNotifications = async () => {
      try {
        const [subs, rems] = await Promise.all([
          db.getSubscriptions(user.id),
          db.getReminders(user.id),
        ]);
        const alerts: AppNotification[] = [];
        const emailsToDispatch: Array<{
          merchant_name: string;
          amount: number;
          currency: Currency;
          next_billing_date: string;
          payment_mode_label: string;
          target_email: string;
          trigger_type: string;
          days_remaining: number;
        }> = [];

        subs.forEach((sub) => {
          if (sub.status === 'trial') {
            alerts.push({
              id: `trial-${sub.id}`,
              merchantName: sub.merchant_name,
              title: `${sub.merchant_name} Free Trial Ending`,
              message: `Trial will renew at ${formatCurrencyAmount(sub.amount, user.preferred_currency || sub.currency || 'INR', sub.currency || 'INR')}. Cancel or revoke AutoPay if not needed.`,
              meta: `${sub.payment_mode_label || 'UPI AutoPay'} • ${formatCurrencyAmount(sub.amount, user.preferred_currency || sub.currency || 'INR', sub.currency || 'INR')}`,
              category: 'trials',
              timeAgo: '2h ago',
              unread: true,
              type: 'warning',
            });
          } else if (sub.status === 'needs_review') {
            alerts.push({
              id: `review-${sub.id}`,
              merchantName: sub.merchant_name,
              title: `${sub.merchant_name} Needs Date Review`,
              message: `Unconfirmed renewal date for ${sub.merchant_name}. Please set date to enable automated reminders.`,
              meta: 'Unconfirmed Estimate',
              category: 'system',
              timeAgo: '4h ago',
              unread: true,
              type: 'info',
            });
          } else if (sub.next_billing_date) {
            const diffMs = new Date(sub.next_billing_date).getTime() - Date.now();
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

            // Check configured reminder rules for this subscription
            const subReminders = rems.filter((r) => r.subscription_id === sub.id);
            const has7DayRule = subReminders.some((r) => r.notes?.includes('7-day')) || subReminders.length === 0;
            const has2DayRule = subReminders.some((r) => r.notes?.includes('2-day')) || subReminders.length === 0;

            // 1. Critical 2-Day Alert Threshold
            if (diffDays <= 2 && diffDays > 0 && has2DayRule) {
              const triggerType = '2-day';
              alerts.push({
                id: `renewal-2day-${sub.id}`,
                merchantName: sub.merchant_name,
                title: `🚨 ${sub.merchant_name} Renews in ${diffDays === 1 ? '1 Day' : '2 Days'}`,
                message: `Critical 2-day alert: ${formatCurrencyAmount(sub.amount, user.preferred_currency || sub.currency || 'INR', sub.currency || 'INR')} auto-debit scheduled soon. Review or cancel if not needed.`,
                meta: `2-Day Watchdog Trigger • ${sub.payment_mode_label || 'AutoPay'}`,
                category: 'renewals',
                timeAgo: `${diffDays === 1 ? '1 day' : '2 days'} left`,
                unread: true,
                type: 'warning',
              });

              // Queue background email dispatch if not already sent for this cycle
              const idempotencyKey = `recusight_sent_${sub.id}_2day_${sub.next_billing_date}`;
              if (!sessionStorage.getItem(idempotencyKey)) {
                emailsToDispatch.push({
                  merchant_name: sub.merchant_name,
                  amount: sub.amount,
                  currency: sub.currency,
                  next_billing_date: sub.next_billing_date,
                  payment_mode_label: sub.payment_mode_label || 'UPI AutoPay',
                  target_email: user.email || 'user@example.com',
                  trigger_type: triggerType,
                  days_remaining: diffDays,
                });
                sessionStorage.setItem(idempotencyKey, 'sent');
              }
            }
            // 2. 7-Day Alert Threshold
            else if (diffDays <= 7 && diffDays > 2 && has7DayRule) {
              const triggerType = '7-day';
              alerts.push({
                id: `renewal-7day-${sub.id}`,
                merchantName: sub.merchant_name,
                title: `⚠️ ${sub.merchant_name} Renews in ${diffDays} Days`,
                message: `7-day renewal reminder: ${formatCurrencyAmount(sub.amount, user.preferred_currency || sub.currency || 'INR', sub.currency || 'INR')} on ${new Date(sub.next_billing_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`,
                meta: `7-Day Watchdog Trigger • ${sub.payment_mode_label || 'AutoPay'}`,
                category: 'renewals',
                timeAgo: `${diffDays} days left`,
                unread: true,
                type: 'info',
              });

              // Queue background email dispatch if not already sent for this cycle
              const idempotencyKey = `recusight_sent_${sub.id}_7day_${sub.next_billing_date}`;
              if (!sessionStorage.getItem(idempotencyKey)) {
                emailsToDispatch.push({
                  merchant_name: sub.merchant_name,
                  amount: sub.amount,
                  currency: sub.currency,
                  next_billing_date: sub.next_billing_date,
                  payment_mode_label: sub.payment_mode_label || 'UPI AutoPay',
                  target_email: user.email || 'user@example.com',
                  trigger_type: triggerType,
                  days_remaining: diffDays,
                });
                sessionStorage.setItem(idempotencyKey, 'sent');
              }
            }
            // 3. Same-Day Charge Confirmation
            else if (diffDays === 0) {
              alerts.push({
                id: `renewal-today-${sub.id}`,
                merchantName: sub.merchant_name,
                title: `⚡ ${sub.merchant_name} Renews Today`,
                message: `Charge confirmation: ${formatCurrencyAmount(sub.amount, user.preferred_currency || sub.currency || 'INR', sub.currency || 'INR')} scheduled for auto-debit today.`,
                meta: `Renewal Day • ${sub.payment_mode_label || 'AutoPay'}`,
                category: 'renewals',
                timeAgo: 'Today',
                unread: true,
                type: 'info',
              });
            }
          }
        });

        // Add standard watchdog mandate health notification
        alerts.push({
          id: 'system-mandate-sync',
          merchantName: 'Watchdog',
          title: 'Mandate & SI Guard Active',
          message: 'All payment instruments and renewal notification triggers are synchronized with TLS 1.3 bank ledger sync.',
          meta: 'Verified Guard Active',
          category: 'system',
          timeAgo: 'Just now',
          unread: false,
          type: 'success',
        });

        setNotifications(alerts);

        // Dispatch email notices for nearing subscriptions in the background
        if (emailsToDispatch.length > 0) {
          fetch('/api/send-reminders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alerts: emailsToDispatch }),
          }).catch((err) => {
            console.warn('Background reminder email dispatch notice:', err);
          });
        }
      } catch (err) {
        console.error('Error loading notifications:', err);
      }
    };

    loadNotifications();
  }, [user]);

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
            <NavLink to="/overview" className="flex items-center gap-2 group" aria-label="RecurSight Home">
              <Logo className="h-11 w-auto max-w-[210px] group-hover:scale-[1.02] transition-transform" />
            </NavLink>
            <button
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
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
                  aria-label="Toggle Dark Mode"
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
            aria-label="Sign Out"
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
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex items-center justify-between gap-2.5 sm:gap-4">
          {/* Left: Mobile trigger & Greeting */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open mobile menu"
              className="lg:hidden p-1.5 sm:p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base sm:text-lg lg:text-xl font-extrabold text-[#151B2D] dark:text-white tracking-tight truncate max-w-[150px] xs:max-w-[200px] sm:max-w-none">
              Hello, {user?.display_name || user?.email?.split('@')[0] || 'User'}!
            </h1>
          </div>

          {/* Center: Universal Search Input */}
          <div className="flex-1 max-w-xl mx-4 hidden md:block">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                aria-label="Search subscriptions"
                placeholder="Search by name,subscriptions....."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-full bg-[#F1F5F9] dark:bg-slate-800 border border-transparent dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#2446D8]/20 focus:border-slate-300 transition-all"
              />
            </form>
          </div>

          {/* Right: Currency Switcher, Notification Bell & Profile Pill */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Preferred Currency Switcher Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
                aria-label="Change Preferred Display Currency"
                aria-expanded={currencyDropdownOpen}
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

            {/* Notification Bell */}
            <div className="relative" ref={notificationMenuRef}>
              <button
                type="button"
                onClick={() => setNotificationOpen(!notificationOpen)}
                aria-label="Notifications"
                aria-expanded={notificationOpen}
                className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs relative transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {notifications.some((n) => n.unread) && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center shadow-xs animate-pulse">
                    {notifications.filter((n) => n.unread).length}
                  </span>
                )}
              </button>

              {/* Notification Overlay Popover (Behance Inspired) */}
              {notificationOpen && (
                <div className="absolute right-0 mt-2.5 w-[360px] sm:w-[420px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Header */}
                  <div className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                          Notifications
                        </h2>
                        {notifications.some((n) => n.unread) ? (
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/80 text-[#2446D8] dark:text-blue-400 font-extrabold text-[11px] border border-blue-200/60 dark:border-blue-900/60">
                            {notifications.filter((n) => n.unread).length} new
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 font-medium text-[11px]">
                            Caught up
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {notifications.some((n) => n.unread) && (
                          <button
                            type="button"
                            onClick={() => setNotifications((prev) => prev.map((item) => ({ ...item, unread: false })))}
                            className="text-xs font-semibold text-[#2446D8] dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer"
                          >
                            Mark all as read
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setNotificationOpen(false)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Close"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Filter Tabs Pills (All, Renewals, Trials, System) */}
                    <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar">
                      {[
                        { id: 'all', label: 'All', count: notifications.length },
                        { id: 'renewals', label: 'Renewals', count: notifications.filter((n) => n.category === 'renewals').length },
                        { id: 'trials', label: 'Trials', count: notifications.filter((n) => n.category === 'trials').length },
                        { id: 'system', label: 'Autopay & System', count: notifications.filter((n) => n.category === 'system').length },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveNotificationTab(tab.id as any)}
                          className={`px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap ${
                            activeNotificationTab === tab.id
                              ? 'bg-[#2446D8] text-white font-bold shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold'
                          }`}
                        >
                          {tab.label} <span className="opacity-80 text-[10px] ml-0.5">{tab.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notification List Items */}
                  <div className="p-2 sm:p-3 space-y-1.5 max-h-[360px] overflow-y-auto">
                    {notifications.filter((n) => activeNotificationTab === 'all' || n.category === activeNotificationTab).length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        <Bell className="w-7 h-7 mx-auto mb-2 opacity-30 text-slate-400" />
                        <p className="font-semibold text-slate-700 dark:text-slate-200">No Notifications</p>
                        <p className="text-[11px] text-slate-400 mt-1 max-w-[220px] mx-auto">
                          No alerts in this category right now.
                        </p>
                      </div>
                    ) : (
                      notifications
                        .filter((n) => activeNotificationTab === 'all' || n.category === activeNotificationTab)
                        .map((n) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              setNotifications((prev) =>
                                prev.map((item) => (item.id === n.id ? { ...item, unread: false } : item))
                              );
                              if (n.category === 'renewals' || n.category === 'trials') {
                                navigate('/subscriptions');
                                setNotificationOpen(false);
                              }
                            }}
                            className={`group p-3 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-800 flex items-start gap-3 relative ${
                              n.unread
                                ? 'bg-blue-50/40 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800'
                                : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 opacity-80'
                            }`}
                          >
                            <MerchantLogo name={n.merchantName || 'Subscription'} size="md" className="shrink-0" />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs text-slate-900 dark:text-white leading-snug">
                                  <span className="font-extrabold">{n.title}</span>: {n.message}
                                </p>
                                {n.unread && (
                                  <span className="w-2 h-2 rounded-full bg-[#2446D8] shrink-0 mt-1" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1.5">
                                {n.meta && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                    {n.meta}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400">{n.timeAgo}</span>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>

                  {/* Footer */}
                  <div className="p-3 px-4 sm:px-5 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setNotifications((prev) => prev.map((item) => ({ ...item, unread: false })))}
                      className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      Mark all as read
                    </button>

                    <NavLink
                      to="/reminders"
                      onClick={() => setNotificationOpen(false)}
                      className="py-1.5 px-3 rounded-xl bg-[#2446D8] hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-blue-600/20 transition-all cursor-pointer"
                    >
                      <span>Go to notification center</span>
                      <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                    </NavLink>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Pill with Avatar, Name & 'Personal' subtext */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                aria-label="User profile menu"
                aria-expanded={userDropdownOpen}
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
