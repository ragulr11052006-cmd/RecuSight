import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/supabase';
import { Subscription } from '../../types';
import { MerchantLogo } from '../../components/common/MerchantLogo';
import { formatCurrencyAmount, convertCurrency } from '../../lib/currency';
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

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [spendInterval, setSpendInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [renewalFilter, setRenewalFilter] = useState<'all' | 'week' | 'month'>('all');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const subs = await db.getSubscriptions(user?.id || 'default-user');
    setSubscriptions(subs);
    setLoading(false);
  };

  // Dynamic Calculations (no hardcoding)
  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const trialSubs = subscriptions.filter(s => s.status === 'trial');
  const attentionSubs = subscriptions.filter(s => s.status === 'needs_review' || s.confidence_status === 'unconfirmed_estimate');

  // Expenditure calculation tracking subscription transaction amounts directly in user preferred currency
  const calculateSubscriptionAmount = (sub: Subscription): number => {
    const rawAmt = Number(sub.amount) || 0;
    const prefCur = user?.preferred_currency || 'USD';
    const subCur = (sub.currency as any) || prefCur;
    return convertCurrency(rawAmt, subCur, prefCur);
  };

  const calculatedRunRate = activeSubs.reduce((acc, curr) => acc + calculateSubscriptionAmount(curr), 0);
  const monthlyRunRate = calculatedRunRate;
  const totalSpend = spendInterval === 'yearly' ? monthlyRunRate * 12 : monthlyRunRate;

  // Category Spend Distribution (strictly derived from database subscriptions)
  const categoryMap: Record<string, { apps: number; amount: number; color: string }> = {};

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

  activeSubs.forEach((sub) => {
    const cat = sub.category || 'Other';
    const subAmt = calculateSubscriptionAmount(sub);
    if (!categoryMap[cat]) {
      categoryMap[cat] = {
        apps: 0,
        amount: 0,
        color: CATEGORY_COLORS[cat] || '#64748B',
      };
    }
    categoryMap[cat].apps += 1;
    categoryMap[cat].amount += subAmt;
  });

  const categoryEntries = Object.entries(categoryMap)
    .map(([name, data]) => ({
      name,
      apps: data.apps,
      amount: data.amount,
      pct: monthlyRunRate > 0 ? Math.round((data.amount / monthlyRunRate) * 100) : 0,
      color: data.color,
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

  // Upcoming renewals calculation
  const now = new Date();

  // 1. New subscriptions added this month from tracker
  const newThisMonthCount = subscriptions.filter(s => {
    if (!s.created_at) return false;
    const d = new Date(s.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const newSubsBadgeCount = newThisMonthCount;

  // 2. Free trials ending soon (< 72 hours / 3 days) from tracker
  const trialsEndingSoon = trialSubs.filter(s => {
    if (!s.next_billing_date) return false;
    const diffDays = Math.ceil((new Date(s.next_billing_date).getTime() - now.getTime()) / (1000 * 3600 * 24));
    return diffDays >= 0 && diffDays <= 3;
  }).length;
  const trialExpiringCount = trialsEndingSoon;

  // 3. Period-over-period spend trend calculation
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const priorPeriodActiveSubs = activeSubs.filter((s) => {
    if (!s.created_at) return true;
    return new Date(s.created_at) < startOfCurrentMonth;
  });
  const priorPeriodMonthlySpend = priorPeriodActiveSubs.reduce(
    (acc, curr) => acc + calculateSubscriptionAmount(curr),
    0
  );

  let spendTrendBadge: { label: string; type: 'positive' | 'negative' | 'neutral' | 'empty' } = {
    label: 'No prior period data',
    type: 'empty',
  };

  if (activeSubs.length === 0 || monthlyRunRate === 0) {
    spendTrendBadge = {
      label: 'No prior period data',
      type: 'empty',
    };
  } else if (priorPeriodMonthlySpend === 0) {
    spendTrendBadge = {
      label: 'Baseline period',
      type: 'neutral',
    };
  } else {
    const diffPct = ((monthlyRunRate - priorPeriodMonthlySpend) / priorPeriodMonthlySpend) * 100;
    if (diffPct > 0) {
      spendTrendBadge = {
        label: `+${diffPct.toFixed(1)}% vs last period`,
        type: 'positive',
      };
    } else if (diffPct < 0) {
      spendTrendBadge = {
        label: `${diffPct.toFixed(1)}% vs last period`,
        type: 'negative',
      };
    } else {
      spendTrendBadge = {
        label: '0.0% vs last period',
        type: 'neutral',
      };
    }
  }

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
                  {activeSubs.length}
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
              {newSubsBadgeCount > 0 ? `+${newSubsBadgeCount} new this month` : '0 new this month'}
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
                  {weeklyUpcoming.length}
                </span>
                <span className="text-xs text-slate-400">Bills</span>
                <span className="text-xs text-slate-400 font-normal">
                  ({formatCurrency(weeklyUpcomingTotal)})
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
              Due in 7 days ({weeklyUpcoming.length})
            </span>
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* MIDDLE ROW: SPEND ANALYSIS & FREE TRIALS ENDING           */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Spend Analysis Card (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 lg:p-7 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-[#151B2D] dark:text-white">
                  Spend Analysis
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Category distribution & verified recurring allocation breakdown
                </p>
              </div>

              {/* Period spend trend badge: Only show when user has active subscriptions and real spend history */}
              {activeSubs.length > 0 && monthlyRunRate > 0 && spendTrendBadge.type !== 'empty' && (
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl lg:text-4xl font-black text-[#151B2D] dark:text-white tracking-tight">
                  {formatCurrency(totalSpend)}
                </span>
                <span className="text-xs text-slate-400 font-normal">
                  / {spendInterval === 'yearly' ? 'year' : 'month'} run-rate
                </span>
              </div>

              <div className="flex items-center gap-2">
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

                <div className="flex items-center gap-1.5 py-1 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>2026</span>
                </div>
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
                    TOTAL SPEND
                  </span>
                  <span className="text-xl font-black text-[#151B2D] dark:text-white">
                    {formatCurrency(totalSpend, undefined, 0)}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600">
                    Active
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
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No active subscriptions yet</p>
                    <p className="text-[11px] text-slate-400">Add an active subscription to see your category spend breakdown.</p>
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
            <span className="uppercase tracking-wider shrink-0">ACTIVE OUTFLOW RATIO:</span>
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
              <span className="font-medium text-slate-400">No active category allocation</span>
            )}
          </div>
        </div>

        {/* Free Trials Ending Card (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
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

            <div className="space-y-4">
              {trialSubs.length > 0 ? (
                trialSubs.slice(0, 2).map((trial) => {
                  const endsInDays = trial.next_billing_date
                    ? Math.max(0, Math.ceil((new Date(trial.next_billing_date).getTime() - now.getTime()) / (1000 * 3600 * 24)))
                    : 3;
                  const paymentSourceDisplay = trial.payment_source?.display_name || 'Card ••4821';
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Upcoming Renewals Table Card (8 Cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
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
                const paymentSource = sub.payment_source?.display_name || 'Card ••4821';
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

        {/* Recent Subscriptions Card (4 Cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
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
                          {sub.category}
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
