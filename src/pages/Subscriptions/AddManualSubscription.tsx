import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/supabase';
import {
  SubscriptionCategory,
  BillingIntervalUnit,
  PaymentSource,
  Currency,
} from '../../types';
import {
  Sparkles,
  ArrowLeft,
  Calendar,
  CreditCard,
  Bell,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Layers,
  ChevronDown,
} from 'lucide-react';

export const AddManualSubscription: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [paymentSources, setPaymentSources] = useState<PaymentSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [merchantName, setMerchantName] = useState('Figma Organization');
  const [category, setCategory] = useState<SubscriptionCategory>('Design');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [amount, setAmount] = useState('15.00');
  const [billingCadence, setBillingCadence] = useState<'monthly' | 'annually' | 'quarterly' | 'weekly' | 'custom'>('monthly');
  const [customInterval, setCustomInterval] = useState('1');
  const [customUnit, setCustomUnit] = useState<BillingIntervalUnit>('months');
  const [nextBillingDate, setNextBillingDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [paymentSourceId, setPaymentSourceId] = useState('');
  const [notes, setNotes] = useState('Design team seat allocation');
  const [cancellationUrl, setCancellationUrl] = useState('https://help.figma.com');

  // Trial Toggle
  const [isTrial, setIsTrial] = useState(false);
  const [trialStartDate, setTrialStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [trialEndDate, setTrialEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });

  // Reminder Settings
  const [reminderDays, setReminderDays] = useState(2);
  const [deliveryChannel, setDeliveryChannel] = useState<'in_app' | 'email'>('in_app');

  // New Payment Source Modal
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [newPsProvider, setNewPsProvider] = useState('HDFC Bank');
  const [newPsDisplayName, setNewPsDisplayName] = useState('HDFC Credit Card');
  const [newPsType, setNewPsType] = useState<'credit_card' | 'upi_autopay' | 'net_banking'>('credit_card');
  const [newPsLastFour, setNewPsLastFour] = useState('4291');

  useEffect(() => {
    loadPaymentSources();
  }, [user]);

  const loadPaymentSources = async () => {
    const list = await db.getPaymentSources(user?.id || 'default-user');
    setPaymentSources(list);
    if (list.length > 0) {
      setPaymentSourceId(list[0].id);
    }
  };

  const PRESETS = [
    { name: 'Netflix', cat: 'Entertainment' as SubscriptionCategory, amt: '19.99', url: 'https://netflix.com/youraccount' },
    { name: 'Adobe Creative Cloud', cat: 'Design' as SubscriptionCategory, amt: '54.99', url: 'https://account.adobe.com/plans' },
    { name: 'Spotify Premium', cat: 'Entertainment' as SubscriptionCategory, amt: '10.99', url: 'https://spotify.com/account' },
    { name: 'ChatGPT Plus', cat: 'AI Assist' as SubscriptionCategory, amt: '20.00', url: 'https://chatgpt.com/#settings' },
    { name: 'Figma Organization', cat: 'Design' as SubscriptionCategory, amt: '15.00', url: 'https://figma.com/settings' },
    { name: 'GitHub Copilot', cat: 'Software & Dev' as SubscriptionCategory, amt: '10.00', url: 'https://github.com/settings/billing' },
    { name: 'Canva Pro', cat: 'Design' as SubscriptionCategory, amt: '12.99', url: 'https://canva.com/settings/billing' },
    { name: 'Notion AI', cat: 'Productivity' as SubscriptionCategory, amt: '10.00', url: 'https://notion.so/settings' },
  ];

  const handleSelectPreset = (p: typeof PRESETS[0]) => {
    setMerchantName(p.name);
    setCategory(p.cat);
    setAmount(p.amt);
    setCancellationUrl(p.url);
  };

  const handleCreatePaymentSource = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await db.createPaymentSource({
      user_id: user?.id || 'default-user',
      provider_name: newPsProvider,
      display_name: newPsDisplayName,
      source_type: newPsType,
      last_four: newPsLastFour,
      is_active: true,
    });
    setPaymentSources(prev => [...prev, created]);
    setPaymentSourceId(created.id);
    setShowAddPaymentModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      setError('Please provide a valid recurring amount.');
      return;
    }

    if (!merchantName.trim()) {
      setError('Merchant or Service name is required.');
      return;
    }

    setLoading(true);

    let interval = 1;
    let unit: BillingIntervalUnit = 'months';

    if (billingCadence === 'monthly') {
      interval = 1;
      unit = 'months';
    } else if (billingCadence === 'annually') {
      interval = 1;
      unit = 'years';
    } else if (billingCadence === 'quarterly') {
      interval = 3;
      unit = 'months';
    } else if (billingCadence === 'weekly') {
      interval = 1;
      unit = 'weeks';
    } else if (billingCadence === 'custom') {
      interval = parseInt(customInterval, 10) || 1;
      unit = customUnit;
    }

    const createdSub = await db.createSubscription({
      user_id: user?.id || 'default-user',
      merchant_name: merchantName.trim(),
      category,
      amount: numAmount,
      currency,
      billing_interval: interval,
      billing_interval_unit: unit,
      next_billing_date: nextBillingDate,
      trial_start_date: isTrial ? trialStartDate : undefined,
      trial_end_date: isTrial ? trialEndDate : undefined,
      payment_source_id: paymentSourceId || undefined,
      status: isTrial ? 'trial' : 'active',
      confidence_status: 'verified',
      notes,
      cancellation_url: cancellationUrl,
    });

    // Create Reminder record
    if (createdSub && nextBillingDate) {
      const reminderTime = new Date(nextBillingDate);
      reminderTime.setDate(reminderTime.getDate() - reminderDays);
      await db.createReminder({
        user_id: user?.id || 'default-user',
        subscription_id: createdSub.id,
        scheduled_at: reminderTime.toISOString(),
        reminder_type: isTrial ? 'trial_expiry' : 'renewal_notice',
        delivery_channel: deliveryChannel,
        status: 'scheduled',
        timezone: user?.timezone || 'UTC',
        notes: `Alert for ${merchantName} renewal in ${reminderDays} days`,
      });
    }

    setLoading(false);
    navigate('/subscriptions');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-7 animate-in fade-in duration-200">
      
      {/* ========================================================= */}
      {/* HEADER & TOP BAR                                          */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <NavLink
            to="/subscriptions"
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </NavLink>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Add New Subscription
            </h1>
            <p className="text-xs text-slate-400">
              Register recurring commitment manually with custom renewal reminders
            </p>
          </div>
        </div>

        {/* Switch to Invoice upload */}
        <NavLink
          to="/subscriptions/upload"
          className="py-2 px-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 text-[#2446D8] dark:text-blue-300 text-xs font-bold flex items-center gap-2 hover:bg-blue-100 transition-colors"
        >
          <Layers className="w-4 h-4" />
          <span>Or Upload Invoice / Statement</span>
        </NavLink>
      </div>

      {/* QUICK PRESET SELECTOR FROM FIGMA */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
          Common Service Suggestions (Click to Autofill)
        </span>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => handleSelectPreset(p)}
              className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* MAIN FORM & LEDGER PREVIEW GRID                           */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        
        {/* LEFT COLUMN: Form Fields */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 lg:p-7 border border-slate-200 dark:border-slate-800 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Merchant / Service Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Merchant or Service Name *
              </label>
              <input
                type="text"
                required
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                placeholder="e.g. Figma Organization, Netflix"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2446D8]/20 focus:border-[#2446D8]"
              />
            </div>

            {/* Expenditure Category */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Expenditure Category *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  'Software & Dev',
                  'Streaming & Ent',
                  'Productivity',
                  'Design',
                  'AI Assist',
                  'Utilities & Cloud',
                ].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat as SubscriptionCategory)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                      category === cat
                        ? 'bg-[#2446D8] border-[#2446D8] text-white shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Currency & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2446D8]"
                >
                  <option value="USD">USD ($)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>

              <div className="sm:col-span-8">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Recurring Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                    {currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$'}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="15.00"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2446D8]/20 focus:border-[#2446D8]"
                  />
                </div>
              </div>
            </div>

            {/* Billing Cadence */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Billing Cadence
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'monthly', label: 'Monthly', sub: 'Every 30 days' },
                  { id: 'annually', label: 'Annually', sub: 'Billed yearly' },
                  { id: 'quarterly', label: 'Quarterly', sub: 'Every 3 mos' },
                  { id: 'custom', label: 'Custom', sub: 'Custom days' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setBillingCadence(item.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      billingCadence === item.id
                        ? 'bg-blue-50 border-[#2446D8] dark:bg-blue-950/60 dark:border-blue-500'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">
                      {item.label}
                    </span>
                    <span className="text-[10px] text-slate-400 block">{item.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Next Billing Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Next Billing Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  required
                  value={nextBillingDate}
                  onChange={(e) => setNextBillingDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2446D8] dark:[color-scheme:dark]"
                />
              </div>
            </div>

            {/* Payment Source Account */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Payment Instrument
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddPaymentModal(true)}
                  className="text-xs font-bold text-[#2446D8] dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Instrument</span>
                </button>
              </div>

              <select
                value={paymentSourceId}
                onChange={(e) => setPaymentSourceId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2446D8]"
              >
                {paymentSources.map((ps) => (
                  <option key={ps.id} value={ps.id}>
                    {ps.display_name} {ps.last_four ? `(•••• ${ps.last_four})` : ''} - {ps.source_type}
                  </option>
                ))}
              </select>
            </div>

            {/* Free Trial Toggle */}
            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Free Trial Enabled
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Track trial expiry and trigger alert prior to auto-conversion
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isTrial}
                  onChange={(e) => setIsTrial(e.target.checked)}
                  className="w-5 h-5 rounded text-[#2446D8] focus:ring-[#2446D8]"
                />
              </div>

              {isTrial && (
                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-amber-200/60 dark:border-amber-900/40">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Trial Start Date
                    </label>
                    <input
                      type="date"
                      value={trialStartDate}
                      onChange={(e) => setTrialStartDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:[color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Trial End Date *
                    </label>
                    <input
                      type="date"
                      value={trialEndDate}
                      onChange={(e) => setTrialEndDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-amber-700 dark:text-amber-400 dark:[color-scheme:dark]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Renewal Reminder Settings */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-900 dark:text-white block mb-2">
                Renewal Alert Lead Time
              </span>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 7].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setReminderDays(days)}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition-all text-center ${
                      reminderDays === days
                        ? 'bg-[#2446D8] border-[#2446D8] text-white shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {days} {days === 1 ? 'day' : 'days'} before
                  </button>
                ))}
              </div>
            </div>

            {/* Notes & Cancellation link */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Notes & Description (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Design license allocation for team member"
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2446D8]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#2446D8] hover:bg-blue-700 disabled:opacity-70 text-white text-sm font-bold shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 transition-all mt-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Subscription & Schedule Reminders</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Ledger-Style Live Preview Card */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm sticky top-24">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-4">
              Ledger Preview & Projected Schedule
            </span>

            {/* Preview Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-800 dark:to-slate-800/40 border border-blue-100 dark:border-slate-700 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#2446D8] text-white font-extrabold flex items-center justify-center text-lg shadow-sm">
                    {merchantName.charAt(0) || 'S'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {merchantName || 'Untitled Service'}
                    </h3>
                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                      {category}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xl font-black text-slate-900 dark:text-white block">
                    {currency === 'INR' ? '₹' : '$'}{amount || '0.00'}
                  </span>
                  <span className="text-[11px] text-slate-400 capitalize">
                    / {billingCadence}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700 text-xs space-y-2">
                <div className="flex justify-between text-slate-500">
                  <span>Projected Renewal:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{nextBillingDate}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Payment Method:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {paymentSources.find(p => p.id === paymentSourceId)?.display_name || 'Card •••• 4821'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Reminder Dispatch:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {reminderDays} days prior at 09:00 AM
                  </span>
                </div>
                {isTrial && (
                  <div className="flex justify-between text-amber-700 dark:text-amber-300 font-bold bg-amber-100/60 dark:bg-amber-950/40 p-2 rounded-xl">
                    <span>Trial Expiry:</span>
                    <span>{trialEndDate}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Security Guarantee Note */}
            <div className="mt-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Zero Credential Guarantee
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                RecurSight strictly tracks metadata and standing instruction references. Full card numbers, PINs, and banking credentials are never requested or stored.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* QUICK ADD PAYMENT SOURCE MODAL                            */}
      {/* ========================================================= */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Add Payment Instrument
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter non-sensitive display label for organizing your debits
            </p>

            <form onSubmit={handleCreatePaymentSource} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Provider Name *
                </label>
                <input
                  type="text"
                  required
                  value={newPsProvider}
                  onChange={(e) => setNewPsProvider(e.target.value)}
                  placeholder="e.g. Chase Bank, HDFC, Google Pay"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Display Label *
                </label>
                <input
                  type="text"
                  required
                  value={newPsDisplayName}
                  onChange={(e) => setNewPsDisplayName(e.target.value)}
                  placeholder="e.g. Chase Sapphire Reserve"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Instrument Type
                  </label>
                  <select
                    value={newPsType}
                    onChange={(e) => setNewPsType(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="credit_card">Credit Card</option>
                    <option value="upi_autopay">UPI AutoPay</option>
                    <option value="net_banking">NetBanking</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Last 4 Digits
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={newPsLastFour}
                    onChange={(e) => setNewPsLastFour(e.target.value)}
                    placeholder="4291"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddPaymentModal(false)}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 rounded-xl bg-[#2446D8] text-white font-bold"
                >
                  Save Instrument
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
