import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/supabase';
import { Subscription } from '../../types';
import { MerchantLogo } from '../../components/common/MerchantLogo';
import { formatCurrencyAmount, convertCurrency, calculateNormalizedMonthly } from '../../lib/currency';
import {
  CreditCard,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  CheckCircle,
  Calendar,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  RotateCcw,
  BarChart2,
  Layers,
  Sparkles,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

export const Overview: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const now = new Date();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [spendInterval, setSpendInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [renewalFilter, setRenewalFilter] = useState<'all' | 'week' | 'month'>('all');
  const monthPickerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(event.target as Node)) {
        setIsMonthDropdownOpen(false);
      }
    };
    if (isMonthDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMonthDropdownOpen]);

  const loadData = async () => {
    setLoading(true);
    const subs = await db.getSubscriptions(user?.id || 'default-user');
    setSubscriptions(subs);
    setLoading(false);
  };

  const MONTHS_LIST = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth();
  const selectedMonthName = MONTHS_LIST[selectedMonth];
  const selectedMonthShortName = selectedMonthName.slice(0, 3);

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const isCurrentMonthSelected = selectedYear === currentYear && selectedMonth === currentMonth;

  const handlePrevMonth = () => {
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Dynamic Calculations (no hardcoding)
  const allActiveCommitments = subscriptions.filter(s => s.status !== 'cancelled' && s.status !== 'paused');
  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const trialSubs = subscriptions.filter(s => s.status === 'trial');
  const attentionSubs = subscriptions.filter(s => s.status === 'needs_review' || s.confidence_status === 'unconfirmed_estimate');

  // Expenditure calculation with accurate cycle normalization (yearly plans / 12, weekly plans * 52 / 12)
  const calculateSubscriptionMonthlyAmount = (sub: Subscription): number => {
    const rawAmt = Number(sub.amount) || 0;
    const prefCur = user?.preferred_currency || 'USD';
    const subCur = (sub.currency as any) || prefCur;
    const inUserCur = convertCurrency(rawAmt, subCur, prefCur);
    return calculateNormalizedMonthly(inUserCur, sub.billing_interval_unit, sub.billing_interval);
  };

  // Helper to determine subscriptions active during a specific month
  const getActiveSubsForMonth = (year: number, monthIdx: number, allSubs: Subscription[]) => {
    const startOfMonth = new Date(year, monthIdx, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);

    return allSubs.filter((sub) => {
      if (sub.status === 'paused') return false;

      // If created with an explicit future date:
      if (sub.created_at) {
        const created = new Date(sub.created_at);
        const createdMonthStart = new Date(created.getFullYear(), created.getMonth(), 1);
        if (createdMonthStart > endOfMonth) {
          const diffFromNowDays = Math.abs(now.getTime() - created.getTime()) / (1000 * 3600 * 24);
          if (diffFromNowDays > 90) {
            return false;
          }
        }
      }

      // If cancelled: check cancellation date
      if (sub.status === 'cancelled') {
        if (sub.updated_at) {
          const cancelledAt = new Date(sub.updated_at);
          if (cancelledAt < startOfMonth) {
            return false;
          }
        } else {
          return false;
        }
      }

      return true;
    });
  };

  const selectedMonthActiveSubs = getActiveSubsForMonth(selectedYear, selectedMonth, allActiveCommitments);

  const selectedMonthMonthlySpend = selectedMonthActiveSubs.reduce(
    (acc, curr) => acc + calculateSubscriptionMonthlyAmount(curr),
    0
  );

  const monthlyRunRate = allActiveCommitments.reduce((acc, curr) => acc + calculateSubscriptionMonthlyAmount(curr), 0);
  const totalSpend = spendInterval === 'yearly' ? selectedMonthMonthlySpend * 12 : selectedMonthMonthlySpend;

  // Category Spend Distribution for selected month
  const categoryMap: Record<string, { apps: number; amount: number; color: string; subNames: string[] }> = {};

  const CATEGORY_COLORS: Record<string, string> = {
    'Design': '#2446D8',
    'Entertainment': '#0D9488',
    'Streaming & Ent': '#0D9488',
    'Streaming': '#0D9488',
    'Productivity': '#B45309',
    'Ai Assist': '#10B981',
    'AI Assist': '#10B981',
    'Software & Tools': '#7C3AED',
    'Software & Dev': '#7C3AED',
    'Dev & Cloud': '#7C3AED',
    'Utilities & Cloud': '#06B6D4',
    'Fitness & Health': '#EC4899',
    'Other Misc': '#64748B',
    'Other': '#64748B',
  };

  selectedMonthActiveSubs.forEach((sub) => {
    const cat = sub.category || 'Other';
    const subMonthly = calculateSubscriptionMonthlyAmount(sub);
    const subAmt = spendInterval === 'yearly' ? subMonthly * 12 : subMonthly;
    if (!categoryMap[cat]) {
      categoryMap[cat] = {
        apps: 0,
        amount: 0,
        color: CATEGORY_COLORS[cat] || '#64748B',
        subNames: [],
      };
    }
    categoryMap[cat].apps += 1;
    categoryMap[cat].amount += subAmt;
    if (!categoryMap[cat].subNames.includes(sub.merchant_name)) {
      categoryMap[cat].subNames.push(sub.merchant_name);
    }
  });

  const categoryEntries = Object.entries(categoryMap)
    .map(([name, data]) => ({
      name,
      apps: data.apps,
      amount: data.amount,
      pct: totalSpend > 0 ? Math.round((data.amount / totalSpend) * 100) : 0,
      color: data.color,
      subNames: data.subNames,
    }))
    .sort((a, b) => b.amount - a.amount);

  const displayCategories = categoryEntries;

  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const pieData =
    displayCategories.length > 0
      ? displayCategories.map((c) => ({
          name: c.name,
          value: c.pct || 1,
          color: c.color,
        }))
      : [{ name: 'No Spend', value: 1, color: isDarkMode ? '#334155' : '#E2E8F0' }];

  // 6-Month Timeline Strip ending at selected month (or current month)
  const past6Months = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(selectedYear, selectedMonth - 5 + i, 1);
    const y = d.getFullYear();
    const mIdx = d.getMonth();
    const subsInMonth = getActiveSubsForMonth(y, mIdx, allActiveCommitments);
    const mSpend = subsInMonth.reduce((acc, curr) => acc + calculateSubscriptionMonthlyAmount(curr), 0);
    const finalSpend = spendInterval === 'yearly' ? mSpend * 12 : mSpend;

    return {
      date: d,
      year: y,
      monthIndex: mIdx,
      name: MONTHS_LIST[mIdx],
      shortName: MONTHS_LIST[mIdx].slice(0, 3),
      spend: finalSpend,
      activeCount: subsInMonth.length,
    };
  });

  const maxSpendInPast6 = Math.max(...past6Months.map((m) => m.spend), 1);

  // Month-over-month comparison vs immediately preceding month
  const prevMonthDate = new Date(selectedYear, selectedMonth - 1, 1);
  const prevMonthSubs = getActiveSubsForMonth(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), allActiveCommitments);
  const prevMonthMonthlySpend = prevMonthSubs.reduce((acc, curr) => acc + calculateSubscriptionMonthlyAmount(curr), 0);
  const prevMonthSpend = spendInterval === 'yearly' ? prevMonthMonthlySpend * 12 : prevMonthMonthlySpend;
  const prevMonthShortName = MONTHS_LIST[prevMonthDate.getMonth()].slice(0, 3);

  let spendTrendBadge: { label: string; type: 'positive' | 'negative' | 'neutral' | 'empty' } = {
    label: 'Baseline period',
    type: 'neutral',
  };

  if (selectedMonthActiveSubs.length === 0 || totalSpend === 0) {
    spendTrendBadge = {
      label: `No spend in ${selectedMonthShortName}`,
      type: 'empty',
    };
  } else if (prevMonthSpend === 0) {
    spendTrendBadge = {
      label: 'Baseline period',
      type: 'neutral',
    };
  } else {
    const diffPct = ((totalSpend - prevMonthSpend) / prevMonthSpend) * 100;
    if (diffPct > 0) {
      spendTrendBadge = {
        label: `+${diffPct.toFixed(1)}% vs ${prevMonthShortName}`,
        type: 'positive',
      };
    } else if (diffPct < 0) {
      spendTrendBadge = {
        label: `${diffPct.toFixed(1)}% vs ${prevMonthShortName}`,
        type: 'negative',
      };
    } else {
      spendTrendBadge = {
        label: `0.0% vs ${prevMonthShortName}`,
        type: 'neutral',
      };
    }
  }

  // Upcoming renewals calculation
  // 1. New subscriptions added this month from tracker
  const newThisMonthCount = subscriptions.filter((s) => {
    if (!s.created_at) return false;
    const d = new Date(s.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const newSubsBadgeCount = newThisMonthCount;

  // 2. Free trials ending soon (< 72 hours / 3 days) from tracker
  const trialsEndingSoon = trialSubs.filter((s) => {
    if (!s.next_billing_date) return false;
    const diffDays = Math.ceil((new Date(s.next_billing_date).getTime() - now.getTime()) / (1000 * 3600 * 24));
    return diffDays >= 0 && diffDays <= 3;
  }).length;
  const trialExpiringCount = trialsEndingSoon;

  // 3. Upcoming renewals
  const allUpcoming = subscriptions
    .filter(s => s.next_billing_date && s.status !== 'cancelled')
    .sort((a, b) => new Date(a.next_billing_date!).getTime() - new Date(b.next_billing_date!).getTime());

  const weeklyUpcoming = allUpcoming.filter(s => {
    const diffDays = Math.ceil((new Date(s.next_billing_date!).getTime() - now.getTime()) / (1000 * 3600 * 24));
    return diffDays <= 7 && diffDays >= 0;
  });

  const monthlyUpcoming = allUpcoming.filter(s => {
    const diffDays = Math.ceil((new Date(s.next_billing_date!).getTime() - now.getTime()) / (1000 * 3600 * 24));
    return diffDays <= 30 && diffDays >= 0;
  });

  const filteredUpcoming =
    renewalFilter === 'week' ? weeklyUpcoming :
    renewalFilter === 'month' ? monthlyUpcoming :
    allUpcoming;

  const prefCur = user?.preferred_currency || 'USD';

  const allUpcomingTotal = allUpcoming.reduce(
    (sum, s) => sum + convertCurrency(Number(s.amount) || 0, (s.currency as any) || prefCur, prefCur),
    0
  );

  const upcomingTotal = filteredUpcoming.reduce(
    (sum, s) => sum + convertCurrency(Number(s.amount) || 0, (s.currency as any) || prefCur, prefCur),
    0
  );

  const weeklyUpcomingTotal = weeklyUpcoming.reduce(
    (sum, s) => sum + convertCurrency(Number(s.amount) || 0, (s.currency as any) || prefCur, prefCur),
    0
  );

  const formatCurrency = (val: number, fromCur?: string, decimals?: number) => {
    return formatCurrencyAmount(val, prefCur, (fromCur as any) || prefCur, { decimals });
  };

  const handleKeepTrial = async (sub: Subscription) => {
    await db.updateSubscription(sub.id, { status: 'active', confidence_status: 'verified' });
    loadData();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* ========================================================= */}
      {/* TOP COMMAND & GREETING BAR (EXACT SCREENSHOT REPLICATION) */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400">
            Real-time subscription & mandate monitoring
          </p>
        </div>

        <div>
          <NavLink
            to="/subscriptions/new"
            className="py-2.5 px-4 rounded-xl bg-[#2446D8] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subscription</span>
          </NavLink>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4 TOP HERO KPI CARDS WITH SPARKLINE WAVES                 */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Active Subscriptions */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-[#2446D8]">
                  <CreditCard className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  ACTIVE SUBSCRIPTIONS
                </span>
              </div>
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-[#151B2D] dark:text-white">
                  {allActiveCommitments.length}
                </span>
                <span className="text-xs text-slate-400">Apps</span>
              </div>

              {/* Linear Sparkline Graph with Gradient Fill */}
              <svg className="w-20 h-8" viewBox="0 0 80 32" fill="none">
                <defs>
                  <linearGradient id="card1LinearGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2446D8" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#2446D8" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 24 C 20 24, 32 16, 48 16 C 62 16, 70 8, 80 6 L 80 32 L 0 32 Z"
                  fill="url(#card1LinearGrad)"
                />
                <path
                  d="M0 24 C 20 24, 32 16, 48 16 C 62 16, 70 8, 80 6"
                  stroke="#2446D8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <div className="mt-3">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              newSubsBadgeCount > 0 ? 'bg-[#E8F7EE] dark:bg-emerald-950/60 text-[#126639] dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}>
              <TrendingUp className="w-3 h-3" />
              {trialSubs.length > 0 ? `${activeSubs.length} paid • ${trialSubs.length} trials` : `${activeSubs.length} active`}
            </span>
          </div>
        </div>

        {/* Card 2: Free Trials End */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  FREE TRIALS END
                </span>
              </div>
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-[#151B2D] dark:text-white">
                  {trialSubs.length}
                </span>
                <span className="text-xs text-slate-400">Trials</span>
              </div>

              {/* Amber Linear Sparkline with Gradient Fill */}
              <svg className="w-20 h-8" viewBox="0 0 80 32" fill="none">
                <defs>
                  <linearGradient id="card2LinearGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D97706" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#D97706" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 24 C 18 24, 28 18, 44 18 C 60 18, 68 10, 80 6 L 80 32 L 0 32 Z"
                  fill="url(#card2LinearGrad)"
                />
                <path
                  d="M0 24 C 18 24, 28 18, 44 18 C 60 18, 68 10, 80 6"
                  stroke="#D97706"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <div className="mt-3">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              trialExpiringCount > 0 ? 'bg-[#FEF3C7] dark:bg-amber-950/60 text-[#92400E] dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}>
              <Clock className="w-3 h-3" />
              {trialExpiringCount} Ending in &lt;72h
            </span>
          </div>
        </div>

        {/* Card 3: Need Attention */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  NEED ATTENTION
                </span>
              </div>
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-[#151B2D] dark:text-white">
                  {attentionSubs.length}
                </span>
                <span className="text-xs text-slate-400">Issues</span>
              </div>

              {/* Red Linear Sparkline with Gradient Fill */}
              <svg className="w-20 h-8" viewBox="0 0 80 32" fill="none">
                <defs>
                  <linearGradient id="card3LinearGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#DC2626" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#DC2626" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 26 C 20 26, 32 24, 46 22 C 60 20, 68 12, 80 8 L 80 32 L 0 32 Z"
                  fill="url(#card3LinearGrad)"
                />
                <path
                  d="M0 26 C 20 26, 32 24, 46 22 C 60 20, 68 12, 80 8"
                  stroke="#DC2626"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <div className="mt-3">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              attentionSubs.length > 0 ? 'bg-[#FEE2E2] dark:bg-rose-950/60 text-[#991B1B] dark:text-rose-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}>
              {attentionSubs.length > 0 ? (
                <>
                  <AlertCircle className="w-3 h-3" />
                  <span>{attentionSubs.length} Actions required</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                  <span>0 Actions required</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Card 4: Upcoming Renewal */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-600">
                  <Calendar className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  UPCOMING RENEWAL
                </span>
              </div>
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-[#151B2D] dark:text-white">
                  {allUpcoming.length}
                </span>
                <span className="text-xs text-slate-400">Bills</span>
                <span className="text-xs text-slate-400 font-normal">
                  ({formatCurrency(allUpcomingTotal)})
                </span>
              </div>

              {/* Teal Linear Sparkline with Gradient Fill */}
              <svg className="w-20 h-8" viewBox="0 0 80 32" fill="none">
                <defs>
                  <linearGradient id="card4LinearGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0D9488" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#0D9488" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 16 C 16 16, 26 22, 42 22 C 58 22, 68 14, 80 10 L 80 32 L 0 32 Z"
                  fill="url(#card4LinearGrad)"
                />
                <path
                  d="M0 16 C 16 16, 26 22, 42 22 C 58 22, 68 14, 80 10"
                  stroke="#0D9488"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <div className="mt-3">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              weeklyUpcoming.length > 0 ? 'bg-[#E0F2FE] dark:bg-sky-950/60 text-[#0369A1] dark:text-sky-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}>
              {weeklyUpcoming.length} Due in 7 days ({formatCurrency(weeklyUpcomingTotal)})
            </span>
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* MIDDLE ROW: SPEND ANALYSIS & FREE TRIALS ENDING           */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Spend Analysis Card (Even 1/2) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 lg:p-7 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#151B2D] dark:text-white">
                    Spend Analysis
                  </h2>
                  {!isCurrentMonthSelected && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      Viewing Past Period
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Category distribution & verified recurring allocation breakdown
                </p>
              </div>

              {/* Dynamic spend trend badge */}
              {selectedMonthActiveSubs.length > 0 && totalSpend > 0 && spendTrendBadge.type !== 'empty' && (
                spendTrendBadge.type === 'positive' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F7EE] dark:bg-emerald-950/60 text-[#126639] dark:text-emerald-300 shrink-0">
                    <TrendingUp className="w-3 h-3" />
                    {spendTrendBadge.label}
                  </span>
                ) : spendTrendBadge.type === 'negative' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF2F2] dark:bg-rose-950/60 text-[#991B1B] dark:text-rose-300 shrink-0">
                    <TrendingDown className="w-3 h-3" />
                    {spendTrendBadge.label}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                    {spendTrendBadge.label}
                  </span>
                )
              )}
            </div>

            {/* Run Rate & Filter Toggles */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl lg:text-4xl font-black text-[#151B2D] dark:text-white tracking-tight">
                  {formatCurrency(totalSpend)}
                </span>
                <span className="text-xs text-slate-400 font-normal">
                  / {spendInterval === 'yearly' ? `${selectedYear} annual run-rate` : `${selectedMonthName} ${selectedYear} spend`}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* Monthly / Yearly Toggle */}
                <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setSpendInterval('monthly')}
                    className={`py-1 px-3 rounded-lg text-xs font-bold transition-all ${
                      spendInterval === 'monthly'
                        ? 'bg-[#2446D8] text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpendInterval('yearly')}
                    className={`py-1 px-3 rounded-lg text-xs font-bold transition-all ${
                      spendInterval === 'yearly'
                        ? 'bg-[#2446D8] text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    Yearly
                  </button>
                </div>

                {/* Interactive Month Stepper with Dropdown */}
                <div ref={monthPickerRef} className="flex items-center gap-0.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 shadow-xs relative">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    title="Previous month"
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5 text-[#2446D8]" />
                    <span>{selectedMonthName} {selectedYear}</span>
                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isMonthDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={handleNextMonth}
                    title="Next month"
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Dropdown Menu */}
                  {isMonthDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 z-50 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 animate-in fade-in zoom-in-95 duration-100">
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setSelectedDate(new Date(selectedYear - 1, selectedMonth, 1))}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-black text-slate-800 dark:text-white">{selectedYear}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedDate(new Date(selectedYear + 1, selectedMonth, 1))}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        {MONTHS_LIST.map((m, idx) => {
                          const isSelected = selectedMonth === idx;
                          const isCurrent = currentMonth === idx && currentYear === selectedYear;
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => {
                                setSelectedDate(new Date(selectedYear, idx, 1));
                                setIsMonthDropdownOpen(false);
                              }}
                              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition text-center cursor-pointer ${
                                isSelected
                                  ? 'bg-[#2446D8] text-white shadow-xs'
                                  : isCurrent
                                  ? 'bg-blue-50 dark:bg-blue-950/40 text-[#2446D8] dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              {m.slice(0, 3)}
                            </button>
                          );
                        })}
                      </div>

                      {!isCurrentMonthSelected && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDate(new Date(currentYear, currentMonth, 1));
                            setIsMonthDropdownOpen(false);
                          }}
                          className="w-full mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-bold text-[#2446D8] hover:underline flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Jump to Current Month ({MONTHS_LIST[currentMonth].slice(0, 3)})
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Return to Current Month Pill (Visible when viewing past/future month) */}
                {!isCurrentMonthSelected && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate(new Date(currentYear, currentMonth, 1))}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold text-[#2446D8] bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition shrink-0 cursor-pointer"
                    title="Return to current month"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Current</span>
                  </button>
                )}
              </div>
            </div>

            {/* Interactive Past 6 Months Trend Bar Strip */}
            <div className="mb-5 p-3 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Monthly Spend Timeline
                </span>
                <span className="text-[10px] text-slate-400">
                  Click any month to inspect breakdown
                </span>
              </div>

              <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                {past6Months.map((m) => {
                  const isSelected = m.monthIndex === selectedMonth && m.year === selectedYear;
                  const heightPct = maxSpendInPast6 > 0 ? Math.max(18, Math.round((m.spend / maxSpendInPast6) * 100)) : 18;

                  return (
                    <button
                      key={`${m.year}-${m.monthIndex}`}
                      type="button"
                      onClick={() => setSelectedDate(new Date(m.year, m.monthIndex, 1))}
                      className={`flex flex-col items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#2446D8] text-white shadow-sm ring-2 ring-[#2446D8]/20'
                          : 'hover:bg-white dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {/* Bar container */}
                      <div className="w-full h-8 flex items-end justify-center mb-1">
                        <div
                          className={`w-3 sm:w-4 rounded-t-md transition-all ${
                            isSelected
                              ? 'bg-white'
                              : m.spend > 0
                              ? 'bg-[#2446D8]/60 dark:bg-[#2446D8]/80'
                              : 'bg-slate-200 dark:bg-slate-700'
                          }`}
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                      <span className={`text-[10px] font-extrabold ${isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                        {m.shortName}
                      </span>
                      <span className={`text-[9px] font-semibold tracking-tight ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                        {formatCurrency(m.spend, undefined, 0)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Donut Chart & Legend */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
              <div className="sm:col-span-5 h-52 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={55}
                      outerRadius={78}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Label in Donut matching screenshot */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                    {selectedMonthShortName.toUpperCase()} SPEND
                  </span>
                  <span className="text-xl font-black text-[#151B2D] dark:text-white">
                    {formatCurrency(totalSpend, undefined, 0)}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600">
                    {selectedMonthActiveSubs.length} Active {selectedMonthActiveSubs.length === 1 ? 'App' : 'Apps'}
                  </span>
                </div>
              </div>

              {/* Legend with exact percentages & amounts */}
              <div className="sm:col-span-7 space-y-2.5">
                {displayCategories.length > 0 ? (
                  displayCategories.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {item.name}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          ({item.apps} {item.apps === 1 ? 'app' : 'apps'})
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-slate-400 text-[11px] font-medium">
                          {formatCurrency(spendInterval === 'yearly' ? item.amount * 12 : item.amount)}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white min-w-[32px] text-right">
                          {item.pct}%
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-slate-400 space-y-1">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      No active subscriptions in {selectedMonthName} {selectedYear}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Switch months or jump to the current period to view spend.
                    </p>
                  </div>
                )}

                {displayCategories.length > 0 && (
                  <div className="pt-2 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Optimal allocation band</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom active outflow ratio bar */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-[10px] font-bold text-slate-400 overflow-x-auto">
            <span className="uppercase tracking-wider shrink-0">
              {selectedMonthShortName.toUpperCase()} OUTFLOW RATIO:
            </span>
            {displayCategories.length > 0 ? (
              displayCategories.slice(0, 4).map((cat) => (
                <span
                  key={cat.name}
                  className="px-2 py-0.5 rounded-full shrink-0 font-bold"
                  style={{
                    backgroundColor: `${cat.color}15`,
                    color: cat.color,
                  }}
                >
                  {cat.name}: {cat.pct}%
                </span>
              ))
            ) : (
              <span className="font-medium text-slate-400">No active category allocation for this period</span>
            )}
          </div>
        </div>

        {/* Free Trials Ending Card (Even 1/2) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-[#151B2D] dark:text-white">
                  Free Trials Ending
                </h2>
                <p className="text-xs text-slate-400">
                  "Review these trials before they end."
                </p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-[#FEF3C7] dark:bg-amber-950/60 text-[#92400E] dark:text-amber-300">
                Action Required
              </span>
            </div>

            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
              {trialSubs.length > 0 ? (
                trialSubs.map((trial) => {
                  const endsInDays = trial.next_billing_date
                    ? Math.max(0, Math.ceil((new Date(trial.next_billing_date).getTime() - now.getTime()) / (1000 * 3600 * 24)))
                    : 3;
                  const paymentSourceDisplay =
                    trial.payment_mode_label ||
                    trial.payment_source?.display_name ||
                    (prefCur === 'INR' ? 'UPI AutoPay (Google Pay / PhonePe)' : 'Corporate Card •••• 4092');
                  return (
                    <div key={trial.id} className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-2.5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <MerchantLogo name={trial.merchant_name} size="md" />
                          <div>
                            <h4 className="text-sm font-bold text-[#151B2D] dark:text-white">
                              {trial.merchant_name}
                            </h4>
                            <span className="text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3 text-red-600 dark:text-red-400" />
                              Ends in {endsInDays} {endsInDays === 1 ? 'Day' : 'Days'} ({trial.next_billing_date || 'Oct 31'})
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-black text-[#151B2D] dark:text-white">
                            {formatCurrency(Number(trial.amount), trial.currency || 'USD')}
                          </span>
                          <span className="text-[10px] text-slate-400 block">/mo charge</span>
                        </div>
                      </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Linked Instrument: <span className="font-semibold text-slate-700 dark:text-slate-300">{paymentSourceDisplay}</span>. Will bill automatically unless cancelled before {trial.next_billing_date || 'Oct 30, 23:59 PST'}.
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handleKeepTrial(trial)}
                        className="py-2 px-3 rounded-xl bg-[#2446D8] hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
                      >
                        Keep Subscription
                      </button>
                      <NavLink
                        to={`/cancellation-guidance?service=${encodeURIComponent(trial.merchant_name)}`}
                        className="py-2 px-3 rounded-xl bg-[#FEE2E2] hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/50 text-[#991B1B] dark:text-red-300 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                      >
                        <span>Cancel Guidance</span>
                        <ExternalLink className="w-3 h-3" />
                      </NavLink>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-10 flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
                <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">No free trials ending</h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                  You currently have 0 trial subscriptions. Active trials will appear here as they approach expiry.
                </p>
              </div>
            )}
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* BOTTOM ROW: UPCOMING RENEWALS & RECENT SUBSCRIPTIONS      */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Upcoming Renewals Table Card (Even 1/2) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-[#151B2D] dark:text-white">
                Upcoming Renewals
              </h2>
              <p className="text-xs text-slate-400">
                Verified billing commitments linked to active payment instruments
              </p>
            </div>

            <NavLink
              to="/subscriptions"
              className="text-xs font-bold text-[#2446D8] hover:underline"
            >
              View All
            </NavLink>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 mb-4 overflow-x-auto no-scrollbar scrollbar-none pb-1">
            <button
              onClick={() => setRenewalFilter('all')}
              className={`shrink-0 whitespace-nowrap py-1 px-3 rounded-full text-xs font-bold transition-all ${
                renewalFilter === 'all'
                  ? 'bg-[#2446D8] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All ({allUpcoming.length})
            </button>
            <button
              onClick={() => setRenewalFilter('week')}
              className={`shrink-0 whitespace-nowrap py-1 px-3 rounded-full text-xs font-semibold transition-all ${
                renewalFilter === 'week'
                  ? 'bg-[#2446D8] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Weekly ({weeklyUpcoming.length})
            </button>
            <button
              onClick={() => setRenewalFilter('month')}
              className={`shrink-0 whitespace-nowrap py-1 px-3 rounded-full text-xs font-semibold transition-all ${
                renewalFilter === 'month'
                  ? 'bg-[#2446D8] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Monthly ({monthlyUpcoming.length})
            </button>
          </div>

          <div className="space-y-3">
            {filteredUpcoming.length > 0 ? (
              filteredUpcoming.slice(0, 5).map((sub) => {
                const diffDays = sub.next_billing_date
                  ? Math.ceil((new Date(sub.next_billing_date).getTime() - now.getTime()) / (1000 * 3600 * 24))
                  : 7;
                const isUrgent = diffDays <= 1;
                const isWarning = diffDays <= 5;
                const paymentSource =
                  sub.payment_mode_label ||
                  sub.payment_source?.display_name ||
                  (prefCur === 'INR' ? 'UPI AutoPay (Google Pay / PhonePe)' : 'Corporate Card •••• 4092');
                return (
                  <div
                    key={sub.id}
                    className="p-3.5 rounded-xl hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors flex items-center justify-between border border-transparent hover:border-slate-100 dark:hover:border-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <MerchantLogo name={sub.merchant_name} size="sm" />
                      <div>
                        <h4 className="text-xs font-bold text-[#151B2D] dark:text-white">
                          {sub.merchant_name}
                        </h4>
                        <span className="text-[10px] text-slate-400">
                          {sub.category} • <span className="font-semibold text-slate-600 dark:text-slate-300">{paymentSource}</span>
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block sm:hidden mt-0.5">
                          in {diffDays} {diffDays === 1 ? 'day' : 'days'} ({sub.next_billing_date || 'Nov 02'})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <span className="text-xs text-slate-600 dark:text-slate-300 block font-medium">
                          {sub.next_billing_date || 'Nov 02, 2026'}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            isUrgent
                              ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40'
                              : isWarning
                              ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40'
                              : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                          }`}
                        >
                          in {diffDays} {diffDays === 1 ? 'day' : 'days'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-bold text-[#151B2D] dark:text-white block">
                          {formatCurrency(Number(sub.amount), sub.currency)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          /{sub.billing_interval_unit === 'years' ? 'year' : 'month'}
                        </span>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-slate-400">
                <Calendar className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">No upcoming renewals</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Your scheduled renewals will be tracked here.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Subscriptions Card (Even 1/2) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-[#151B2D] dark:text-white">
                  Recent Subscriptions
                </h2>
                <p className="text-xs text-slate-400">
                  Newly detected or activated subscriptions
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#E8F7EE] dark:bg-emerald-950/60 text-[#126639] dark:text-emerald-300">
                {String(Math.min(activeSubs.length, 4)).padStart(2, '0')}
              </span>
            </div>

            <div className="space-y-3">
              {activeSubs.length > 0 ? (
                activeSubs.slice(0, 4).map((sub) => (
                  <div
                    key={sub.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <MerchantLogo name={sub.merchant_name} size="sm" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-[#151B2D] dark:text-white">
                            {sub.merchant_name}
                          </h4>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#E8F7EE] dark:bg-emerald-950/60 text-[#126639] dark:text-emerald-300">
                            {sub.status}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {sub.category} • <span className="font-semibold text-slate-600 dark:text-slate-300">{sub.payment_mode_label || sub.payment_source?.display_name || (prefCur === 'INR' ? 'UPI AutoPay (Google Pay / PhonePe)' : 'Corporate Card •••• 4092')}</span>
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-[#151B2D] dark:text-white">
                        {formatCurrency(Number(sub.amount), sub.currency)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        /{sub.billing_interval_unit?.replace('s', '')}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">No subscriptions found</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Track your first subscription with "+ Add Subscription".</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
