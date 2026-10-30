import React, { useState, useEffect } from 'react';
import { NavLink, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/supabase';
import { Subscription, SubscriptionCategory, SubscriptionStatus } from '../../types';
import { MerchantLogo } from '../../components/common/MerchantLogo';
import { formatCurrencyAmount, convertCurrency } from '../../lib/currency';
import {
  Search,
  Filter,
  Plus,
  Download,
  MoreVertical,
  MoreHorizontal,
  CheckCircle,
  HelpCircle,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  PauseCircle,
  PlayCircle,
  ShieldAlert,
  CreditCard,
  Clock,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  X,
  Check,
} from 'lucide-react';

export const SubscriptionsList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [cycleFilter, setCycleFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Modal states
  const [selectedSubForDetails, setSelectedSubForDetails] = useState<Subscription | null>(null);
  const [subToDelete, setSubToDelete] = useState<Subscription | null>(null);
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  useEffect(() => {
    loadSubscriptions();
  }, [user]);

  const loadSubscriptions = async () => {
    setLoading(true);
    const data = await db.getSubscriptions(user?.id || 'default-user');
    setSubscriptions(data);
    setLoading(false);
  };

  // KPI Calculations
  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const trialSubs = subscriptions.filter(s => s.status === 'trial');
  const unconfirmedSubs = subscriptions.filter(s => s.status === 'needs_review' || s.confidence_status === 'unconfirmed_estimate');

  const calculateMonthlyAmount = (sub: Subscription): number => {
    const rawAmt = Number(sub.amount) || 0;
    const amt = convertCurrency(rawAmt, (sub.currency as any) || 'USD', 'USD');
    const interval = sub.billing_interval || 1;
    switch (sub.billing_interval_unit) {
      case 'years':
        return amt / (12 * interval);
      case 'weeks':
        return (amt * 52) / (12 * interval);
      case 'days':
        return (amt * 30.4) / interval;
      case 'months':
      default:
        return amt / interval;
    }
  };

  const monthlyRunRate = activeSubs.reduce((acc, curr) => acc + calculateMonthlyAmount(curr), 0);

  // Filter application
  const filteredSubscriptions = subscriptions.filter(s => {
    const matchesSearch = s.merchant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.notes && s.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.payment_source?.display_name && s.payment_source.display_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === 'All' || s.category === categoryFilter;
    const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
    const matchesCycle = cycleFilter === 'All' || s.billing_interval_unit.startsWith(cycleFilter.toLowerCase());

    return matchesSearch && matchesCategory && matchesStatus && matchesCycle;
  });

  // Pagination State & Logic
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const totalItems = filteredSubscriptions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, statusFilter, cycleFilter]);

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedSubscriptions = filteredSubscriptions.slice(startIndex, startIndex + pageSize);
  const startItem = totalItems === 0 ? 0 : startIndex + 1;
  const endItem = Math.min(startIndex + pageSize, totalItems);

  const handleDelete = async () => {
    if (!subToDelete) return;
    await db.deleteSubscription(subToDelete.id);
    setSubToDelete(null);
    loadSubscriptions();
  };

  const handleTogglePause = async (sub: Subscription) => {
    const newStatus: SubscriptionStatus = sub.status === 'paused' ? 'active' : 'paused';
    await db.updateSubscription(sub.id, { status: newStatus });
    setActionMenuOpenId(null);
    loadSubscriptions();
  };

  const handleExportAudit = () => {
    const headers = ['Merchant', 'Category', 'Amount', 'Currency', 'Interval', 'Unit', 'Next Billing Date', 'Status', 'Confidence'];
    const rows = filteredSubscriptions.map(s => [
      `"${s.merchant_name}"`,
      `"${s.category}"`,
      s.amount,
      s.currency,
      s.billing_interval,
      s.billing_interval_unit,
      s.next_billing_date || '',
      s.status,
      s.confidence_status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RecurSight_Audit_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (val: number, cur: string = 'USD') => {
    return formatCurrencyAmount(val, user?.preferred_currency || 'USD', cur as any);
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-200">
      
      {/* ========================================================= */}
      {/* HEADER & TOP STAT CARDS (EXACT FIGMA REPLICATION)         */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#151B2D] dark:text-white tracking-tight">
            My Subscriptions
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <button
            onClick={handleExportAudit}
            className="py-2 px-3 sm:px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs flex items-center gap-1.5 transition-all shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Audit</span>
          </button>

          {/* Add Subscription Button */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="py-2 px-3.5 sm:px-4 rounded-xl bg-[#2446D8] hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-600/30 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Subscription</span>
            </button>

            {showAddMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50">
                <NavLink
                  to="/subscriptions/new"
                  onClick={() => setShowAddMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Edit2 className="w-4 h-4 text-[#2446D8]" />
                  <span>Manual Entry Form</span>
                </NavLink>
                <NavLink
                  to="/subscriptions/upload"
                  onClick={() => setShowAddMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Upload Invoice / Statement</span>
                </NavLink>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4 TOP STAT CARDS MATCHING SCREENSHOT */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Monthly Run-Rate */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              MONTHLY RUN-RATE
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-[#2446D8] shrink-0">
              <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 mt-3">
            <span className="text-xl sm:text-2xl font-black text-[#151B2D] dark:text-white truncate">
              {formatCurrency(monthlyRunRate, 'USD')}
            </span>
            <span className="text-xs text-slate-400 font-normal shrink-0">/mo</span>
          </div>
        </div>

        {/* Card 2: Active Subscriptions */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              ACTIVE SUBSCRIPTIONS
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 mt-3">
            <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {String(activeSubs.length).padStart(2, '0')}
            </span>
            <span className="text-xs text-slate-400 font-normal">mandates</span>
          </div>
        </div>

        {/* Card 3: Trials In Window */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              TRIALS IN WINDOW
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 shrink-0">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 mt-3">
            <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
              {String(trialSubs.length).padStart(2, '0')}
            </span>
            <span className="text-xs text-slate-400 font-normal">expiring</span>
          </div>
        </div>

        {/* Card 4: Unconfirmed AutoPay */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              UNCONFIRMED AUTOPAY
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 shrink-0">
              <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 mt-3">
            <span className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400">
              {String(unconfirmedSubs.length).padStart(2, '0')}
            </span>
            <span className="text-xs text-slate-400 font-normal">/estimates</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* FILTER TABS & TOOLBAR MATCHING FIGMA SCREENSHOT           */}
      {/* ========================================================= */}
      <div className="space-y-3">
        {/* Row 1: Pill Status Tabs & View Switcher */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scrollbar-none pb-1 flex-1 min-w-0 pr-1">
            <button
              type="button"
              onClick={() => setStatusFilter('All')}
              className={`shrink-0 whitespace-nowrap py-1.5 px-3 sm:px-3.5 rounded-full text-xs font-bold transition-all ${
                statusFilter === 'All'
                  ? 'bg-[#2446D8] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 border border-slate-200 dark:border-slate-700'
              }`}
            >
              All Subscriptions <span className="ml-1 opacity-90">{subscriptions.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`shrink-0 whitespace-nowrap py-1.5 px-3 sm:px-3.5 rounded-full text-xs font-semibold transition-all ${
                statusFilter === 'active'
                  ? 'bg-[#2446D8] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 border border-slate-200 dark:border-slate-700'
              }`}
            >
              Active <span className="ml-1 opacity-90">{activeSubs.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('paused')}
              className={`shrink-0 whitespace-nowrap py-1.5 px-3 sm:px-3.5 rounded-full text-xs font-semibold transition-all ${
                statusFilter === 'paused'
                  ? 'bg-[#2446D8] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 border border-slate-200 dark:border-slate-700'
              }`}
            >
              Inactive / Paused <span className="ml-1 opacity-90">{subscriptions.filter(s => s.status === 'paused' || s.status === 'cancelled').length}</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('trial')}
              className={`shrink-0 whitespace-nowrap py-1.5 px-3 sm:px-3.5 rounded-full text-xs font-semibold transition-all ${
                statusFilter === 'trial'
                  ? 'bg-[#2446D8] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 border border-slate-200 dark:border-slate-700'
              }`}
            >
              Free Trials <span className="ml-1 text-amber-600 dark:text-amber-400 font-bold">{trialSubs.length}</span>
            </button>
          </div>

          {/* Table / Grid view switcher */}
          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/80 dark:border-slate-700 shrink-0">
            <button
              onClick={() => setViewMode('table')}
              aria-label="Table View"
              className={`p-1.5 rounded-md ${
                viewMode === 'table'
                  ? 'bg-[#EEF2FF] text-[#2446D8] dark:bg-blue-950/60 dark:text-blue-300 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              aria-label="Grid View"
              className={`p-1.5 rounded-md ${
                viewMode === 'grid'
                  ? 'bg-[#EEF2FF] text-[#2446D8] dark:bg-blue-950/60 dark:text-blue-300 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Row 2: Search Input & Filter Dropdowns */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Service,Payment...."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-transparent dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#2446D8]/20 focus:border-slate-300"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar scrollbar-none pb-1">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="shrink-0 py-2 px-3 sm:px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none shadow-xs"
            >
              <option value="All">Category : All</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Design">Design</option>
              <option value="Ai Assist">Ai Assist</option>
              <option value="Productivity">Productivity</option>
              <option value="Software & Tools">Software & Tools</option>
            </select>

            <select
              value={cycleFilter}
              onChange={(e) => setCycleFilter(e.target.value)}
              className="shrink-0 py-2 px-3 sm:px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none shadow-xs"
            >
              <option value="All">Cycle : All</option>
              <option value="month">Monthly</option>
              <option value="year">Annual</option>
            </select>

            <select
              className="shrink-0 py-2 px-3 sm:px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none shadow-xs"
            >
              <option value="All">Mode : All Accounts</option>
              <option value="HDFC">HDFC Visa •••• 4090</option>
              <option value="SBI">SBI Visa •••• 2345</option>
              <option value="UPI">UPI Autopay (Gpay)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SUBSCRIPTIONS TABLE VIEW                                  */}
      {/* ========================================================= */}
      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-[#F1F4F9] dark:bg-slate-800/70 text-[11px] font-semibold text-[#64748B] dark:text-slate-300">
                  <th className="py-3 pl-6 whitespace-nowrap">Service</th>
                  <th className="py-3 px-4 whitespace-nowrap">Category</th>
                  <th className="py-3 px-4 whitespace-nowrap">Amount</th>
                  <th className="py-3 px-4 whitespace-nowrap">Cycle</th>
                  <th className="py-3 px-4 whitespace-nowrap">Renewal Date</th>
                  <th className="py-3 px-4 whitespace-nowrap">Payment Mode</th>
                  <th className="py-3 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3 pr-6 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {paginatedSubscriptions.map((sub) => {
                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Service name & Brand Logo */}
                      <td className="py-4 pl-6 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <MerchantLogo name={sub.merchant_name} size="md" />
                          <span className="font-bold text-[#151B2D] dark:text-white text-[13px] block">
                            {sub.merchant_name}
                          </span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-300 font-normal whitespace-nowrap">
                        {sub.category}
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-bold text-[#151B2D] dark:text-white text-[13px]">
                          {formatCurrency(sub.amount, sub.currency)}
                        </span>
                        <span className="text-slate-400 text-xs font-normal ml-0.5">/mo</span>
                      </td>

                      {/* Cycle */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {sub.billing_interval_unit === 'years' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#E0E7FF] dark:bg-indigo-950/60 text-[#3730A3] dark:text-indigo-300">
                            Annual
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            Monthly
                          </span>
                        )}
                      </td>

                      {/* Renewal Date */}
                      <td className="py-4 px-4 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {sub.next_billing_date || 'N/A'}
                      </td>

                      {/* Payment Mode & AutoPay Sub-badge */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="text-[#151B2D] dark:text-white font-medium text-xs whitespace-nowrap">
                          {sub.payment_mode_label || sub.payment_source?.display_name || 'HDFC Visa •••• 4090'}
                        </div>
                        <div className="mt-1">
                          {sub.payment_mode_badge?.includes('InActive') ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[#FEE2E2] dark:bg-red-950/40 text-[#991B1B] dark:text-red-300 whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400 shrink-0" />
                              <span>{sub.payment_mode_badge}</span>
                            </span>
                          ) : sub.payment_mode_badge?.includes('Annual') ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[#EEF2FF] dark:bg-blue-950/50 text-[#2446D8] dark:text-blue-300 whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#2446D8] dark:bg-blue-400 shrink-0" />
                              <span>{sub.payment_mode_badge}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[#E8F7EE] dark:bg-emerald-950/50 text-[#126639] dark:text-emerald-300 whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
                              <span>{sub.payment_mode_badge || 'UPI AutoPay: Active'}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {sub.status === 'active' && (
                          <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#E8F7EE] dark:bg-emerald-950/50 text-[#126639] dark:text-emerald-300">
                            Active
                          </span>
                        )}
                        {sub.status === 'trial' && (
                          <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#FEF3C7] dark:bg-amber-950/50 text-[#92400E] dark:text-amber-300">
                            Free Trial
                          </span>
                        )}
                        {sub.status === 'paused' && (
                          <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#FEE2E2] dark:bg-red-950/40 text-[#991B1B] dark:text-red-300">
                            Inactive
                          </span>
                        )}
                        {sub.status === 'needs_review' && (
                          <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#F1EDFB] dark:bg-purple-950/50 text-[#5B3FB0] dark:text-purple-300">
                            Needs Review
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 pr-6 text-right relative whitespace-nowrap">
                        <button
                          onClick={() => setActionMenuOpenId(actionMenuOpenId === sub.id ? null : sub.id)}
                          aria-label={`Actions for ${sub.merchant_name}`}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {/* Dropdown Options */}
                        {actionMenuOpenId === sub.id && (
                          <div className="absolute right-6 mt-1 w-44 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 text-left">
                            <button
                              onClick={() => {
                                setActionMenuOpenId(null);
                                setSelectedSubForDetails(sub);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>View Details</span>
                            </button>
                            <NavLink
                              to={`/cancellation-guidance?service=${encodeURIComponent(sub.merchant_name)}`}
                              className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                              <span>Cancel Guidance</span>
                            </NavLink>
                            <button
                              onClick={() => {
                                handleTogglePause(sub);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              {sub.status === 'paused' ? (
                                <>
                                  <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Resume Tracking</span>
                                </>
                              ) : (
                                <>
                                  <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Pause Tracking</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setActionMenuOpenId(null);
                                setSubToDelete(sub);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Record</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Footer matching Screenshot */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>Showing {startItem}-{endItem} of {totalItems} tracked recurring commitments</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className={`py-1 px-3 rounded-md border text-xs font-medium transition-colors ${
                  currentPage <= 1
                    ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer'
                }`}
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                const isActive = currentPage === pageNum;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-md text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#2446D8] text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className={`py-1 px-3 rounded-md border text-xs font-medium transition-colors ${
                  currentPage >= totalPages
                    ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* GRID CARDS VIEW */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedSubscriptions.map((sub) => (
              <div
                key={sub.id}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <MerchantLogo name={sub.merchant_name} size="md" />
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                          {sub.merchant_name}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300">
                          {sub.category}
                        </span>
                      </div>
                    </div>
                    <span className="text-base font-black text-slate-900 dark:text-white">
                      {formatCurrency(sub.amount, sub.currency)}
                    </span>
                  </div>

                  <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Renewal:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{sub.next_billing_date || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Instrument:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{sub.payment_source?.display_name || 'Card ••4821'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedSubForDetails(sub)}
                    className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-[#2446D8] dark:hover:text-blue-400"
                  >
                    View Details
                  </button>
                  <NavLink
                    to={`/cancellation-guidance?service=${encodeURIComponent(sub.merchant_name)}`}
                    className="py-1 px-2.5 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-800 flex items-center gap-1"
                  >
                    <ShieldAlert className="w-3 h-3" />
                    <span>Cancel Guide</span>
                  </NavLink>
                </div>
              </div>
            ))}
          </div>

          {/* Grid View Pagination Footer */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div>
              Showing <span className="font-bold text-slate-900 dark:text-white">{startItem}-{endItem}</span> of{' '}
              <span className="font-bold text-slate-900 dark:text-white">{filteredSubscriptions.length}</span> tracked recurring commitments
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className={`py-1 px-3 rounded-md border text-xs font-medium transition-colors ${
                  currentPage <= 1
                    ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer'
                }`}
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                const isActive = currentPage === pageNum;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-md text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#2446D8] text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className={`py-1 px-3 rounded-md border text-xs font-medium transition-colors ${
                  currentPage >= totalPages
                    ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBSCRIPTION DETAILS MODAL                                */}
      {/* ========================================================= */}
      {selectedSubForDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <MerchantLogo name={selectedSubForDetails.merchant_name} size="md" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedSubForDetails.merchant_name}
                  </h3>
                  <span className="text-xs text-slate-400">{selectedSubForDetails.category}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedSubForDetails(null)}
                aria-label="Close"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Recurring Amount:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatCurrency(selectedSubForDetails.amount, selectedSubForDetails.currency)} / {selectedSubForDetails.billing_interval_unit}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Next Billing Date:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedSubForDetails.next_billing_date || 'None'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Payment Instrument:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedSubForDetails.payment_source?.display_name || 'Card •••• 4821'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Status & Confidence:</span>
                <span className="font-semibold uppercase text-slate-900 dark:text-white">
                  {selectedSubForDetails.status} ({selectedSubForDetails.confidence_status})
                </span>
              </div>
              {selectedSubForDetails.notes && (
                <div className="py-2">
                  <span className="text-slate-400 block mb-1">Notes:</span>
                  <p className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                    {selectedSubForDetails.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <NavLink
                to={`/cancellation-guidance?service=${encodeURIComponent(selectedSubForDetails.merchant_name)}`}
                className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Cancellation Guidance</span>
              </NavLink>
              <button
                onClick={() => setSelectedSubForDetails(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs text-slate-700 dark:text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DELETE CONFIRMATION DIALOG                                */}
      {/* ========================================================= */}
      {subToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Subscription</h3>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              Are you sure you want to delete <strong>{subToDelete.merchant_name}</strong>? This will remove all scheduled reminders for this subscription.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSubToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
