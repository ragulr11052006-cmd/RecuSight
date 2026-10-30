import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/supabase';
import { Reminder, Subscription, ReminderType, DeliveryChannel } from '../../types';
import { MerchantLogo } from '../../components/common/MerchantLogo';
import { formatCurrencyAmount } from '../../lib/currency';
import {
  Bell,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Plus,
  Send,
  Mail,
  Monitor,
  ShieldCheck,
  Shield,
  HelpCircle,
  AlertTriangle,
  SlidersHorizontal,
  ChevronDown,
  Edit2,
  BellOff,
  Check,
  X,
  Sparkles,
  ArrowRight,
  Activity,
} from 'lucide-react';

export const Reminders: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'scheduled' | 'failed' | 'cannot_schedule'>('all');

  // Custom Lead Time Preference
  const [leadTimeOption, setLeadTimeOption] = useState('2 days before confirmed date (default)');
  const [isLeadTimeOpen, setIsLeadTimeOpen] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showSetDateModal, setShowSetDateModal] = useState(false);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [selectedSubForDate, setSelectedSubForDate] = useState<string>('Notion AI');
  const [manualDateInput, setManualDateInput] = useState('2026-11-20');

  // Form State for Custom Alert
  const [selectedSubId, setSelectedSubId] = useState('');
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [reminderType, setReminderType] = useState<ReminderType>('renewal_notice');
  const [deliveryChannel, setDeliveryChannel] = useState<DeliveryChannel>('in_app');
  const [customNotes, setCustomNotes] = useState('');

  // Diagnostic Test Banner
  const [diagnosticAlert, setDiagnosticAlert] = useState<{
    show: boolean;
    channel: string;
    message: string;
  } | null>(null);

  // Filter confirmed vs unconfirmed subscriptions
  const scheduledSubscriptions = subscriptions.filter(s => Boolean(s.next_billing_date));
  const unconfirmedSubs = subscriptions.filter(s => !s.next_billing_date || s.status === 'needs_review');
  const allScheduledCount = reminders.filter(r => r.status === 'scheduled').length + scheduledSubscriptions.length;

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const [rems, subs] = await Promise.all([
      db.getReminders(user?.id || 'default-user'),
      db.getSubscriptions(user?.id || 'default-user'),
    ]);
    setReminders(rems);
    setSubscriptions(subs);
    if (subs.length > 0) {
      setSelectedSubId(subs[0].id);
    }
    setLoading(false);
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();

    const created = await db.createReminder({
      user_id: user?.id || 'default-user',
      subscription_id: selectedSubId,
      scheduled_at: scheduledAt,
      reminder_type: reminderType,
      delivery_channel: deliveryChannel,
      status: 'scheduled',
      timezone: 'EST',
      notes: customNotes,
    });

    setReminders((prev) => [...prev, created]);
    setShowCreateModal(false);
    setCustomNotes('');
    loadData();
  };

  const handleSendDiagnosticTest = () => {
    setDiagnosticAlert({
      show: true,
      channel: 'Email & In-Dashboard',
      message: 'Diagnostic test alert successfully delivered to shubham@example.com and dashboard notification bell (8 items).',
    });
    setShowDiagnosticModal(true);
  };

  const handleSetManualDate = async (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate updating Notion AI renewal date
    setShowSetDateModal(false);
    setDiagnosticAlert({
      show: true,
      channel: 'Schedule Engine',
      message: `Renewal date for ${selectedSubForDate} updated to ${manualDateInput}. Reminder schedule activated for 2 days prior.`,
    });
    setTimeout(() => setDiagnosticAlert(null), 5000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* ========================================================= */}
      {/* HEADER SECTION (Matching Figma Screenshot 4)              */}
      {/* ========================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#2446D8] dark:text-blue-400 text-xs font-semibold mb-2">
            <Bell className="w-3.5 h-3.5" />
            <span>Alert Operations</span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Reminders & Alert Schedule
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review scheduled reminders, notification delivery status, and alert lead times.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowRulesModal(true)}
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 shadow-xs transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span>Rules Config</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#2446D8] hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Custom Alert</span>
          </button>
        </div>
      </div>

      {/* Diagnostic Alert Notification Banner */}
      {diagnosticAlert && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5 flex-wrap">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{diagnosticAlert.message}</span>
            <button
              onClick={() => navigate('/')}
              className="font-bold underline text-[#2446D8] dark:text-blue-400 hover:text-blue-700 ml-1 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View in Overview</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <button
            onClick={() => setDiagnosticAlert(null)}
            className="text-emerald-600 hover:text-emerald-800 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* FILTER TABS                                               */}
      {/* ========================================================= */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`shrink-0 whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
            activeTab === 'all'
              ? 'bg-[#2446D8] text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          All Reminders <span className="ml-1 opacity-90">{allScheduledCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('scheduled')}
          className={`shrink-0 whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'scheduled'
              ? 'bg-[#2446D8] text-white font-bold shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#2446D8] shrink-0" />
          <span>Scheduled {allScheduledCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('failed')}
          className={`shrink-0 whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'failed'
              ? 'bg-red-600 text-white font-bold shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20'
          }`}
        >
          <span className="w-4 h-4 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-[10px] font-black shrink-0">!</span>
          <span>Failed / Blocked {reminders.filter(r => r.status === 'failed').length}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cannot_schedule')}
          className={`shrink-0 whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'cannot_schedule'
              ? 'bg-[#6B46C1] text-white font-bold shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30'
          }`}
        >
          <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-black shrink-0">?</span>
          <span>Cannot Schedule {unconfirmedSubs.length}</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* MAIN TWO-COLUMN CONTENT GRID                              */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: UPCOMING & CANNOT SCHEDULE (7 Cols)          */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* CARD 1: Upcoming Reminders */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs">
            {/* Card Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#2446D8]" />
                <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                  Upcoming Reminders
                </h2>
              </div>
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                AUTOMATED DISPATCH
              </span>
            </div>

            {/* List of Scheduled Items matching real subscriptions */}
            <div className="space-y-6">
              {allScheduledCount === 0 ? (
                <div className="py-12 px-4 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#2446D8] flex items-center justify-center mx-auto">
                    <Bell className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      No Reminders Scheduled
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      You have no active subscriptions or reminders. Add your subscriptions to schedule automated renewal reminders before bank debits occur.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/subscriptions/new')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2446D8] hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Subscription</span>
                  </button>
                </div>
              ) : (
                scheduledSubscriptions.map((sub) => {
                  const daysUntil = sub.next_billing_date
                    ? Math.ceil((new Date(sub.next_billing_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                    : 0;
                  return (
                    <div key={sub.id} className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#2446D8]" />
                          <span>{sub.next_billing_date} • 9:00 AM</span>
                        </div>
                        <span className="text-[11px] font-normal text-slate-400">
                          {daysUntil > 0 ? `${daysUntil} days prior` : 'Renewal due soon'}
                        </span>
                      </div>

                      <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                        <div className="flex items-center gap-3.5">
                          <MerchantLogo name={sub.merchant_name} size="md" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900 dark:text-white">
                                {sub.merchant_name}
                              </span>
                              {sub.status === 'trial' ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FEF3C7] dark:bg-amber-950/60 text-[#92400E] dark:text-amber-300 border border-[#FDE68A] dark:border-amber-800">
                                  Trial Expire Soon
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EEF2FF] dark:bg-blue-950/60 text-[#2446D8] dark:text-blue-300 border border-blue-100 dark:border-blue-900">
                                  Renewal Notice
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              Recurring commitment: {formatCurrencyAmount(sub.amount, user?.preferred_currency || 'INR', sub.currency)}/mo
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-2">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3.5 h-3.5 text-slate-500" />
                                <span>Email</span>
                              </span>
                              <span>+</span>
                              <span className="flex items-center gap-1">
                                <Monitor className="w-3.5 h-3.5 text-slate-500" />
                                <span>In-Dashboard</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-3 shrink-0 ml-3">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#EEF2FF] dark:bg-blue-950/60 text-[#2446D8] dark:text-blue-300 font-bold text-xs">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Scheduled</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* CARD 2: Cannot Schedule Reminder (Lavender Box) */}
          {unconfirmedSubs.length > 0 && (
            <div className="p-5 rounded-3xl bg-[#F8F7FF] dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3.5 border-b border-purple-100/80 dark:border-purple-900/30">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                    ?
                  </div>
                  <h3 className="font-bold text-sm text-[#4338CA] dark:text-purple-300">
                    Cannot Schedule Reminder
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/90 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Unconfirmed Date
                </span>
              </div>

              {unconfirmedSubs.map(sub => (
                <div key={sub.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <MerchantLogo name={sub.merchant_name} size="md" />
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                        {sub.merchant_name} ({formatCurrencyAmount(sub.amount, user?.preferred_currency || 'INR', sub.currency)}/mo)
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-md">
                        Cadence date is unconfirmed. Set date manually to enable automated renewal reminders.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSubForDate(sub.merchant_name);
                      setShowSetDateModal(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-[#2446D8] dark:text-blue-400 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs shrink-0 transition-colors cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Set Date Manually</span>
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: NOTIFICATION PREFERENCES & SAFETY POLICY    */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* CARD 1: Notification Preferences */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs">
            {/* Header */}
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
              <SlidersHorizontal className="w-4 h-4 text-[#2446D8]" />
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                Notification Preferences
              </h2>
            </div>

            {/* Default Renewal Notice Timing */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Default Renewal Notice Timing
                </span>
                <button
                  type="button"
                  onClick={() => setIsLeadTimeOpen(!isLeadTimeOpen)}
                  className="font-bold text-[#2446D8] dark:text-blue-400 hover:underline"
                >
                  Configurable
                </button>
              </div>

              {/* Timing Selector Box */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsLeadTimeOpen(!isLeadTimeOpen)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between hover:border-slate-300 transition-colors"
                >
                  <span>{leadTimeOption}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {isLeadTimeOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl z-20 overflow-hidden py-1">
                    {[
                      '1 day before confirmed date',
                      '2 days before confirmed date (default)',
                      '3 days before confirmed date',
                      '7 days before confirmed date (Recommended for Trials)',
                    ].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setLeadTimeOption(opt);
                          setIsLeadTimeOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs transition-colors ${
                          leadTimeOption === opt
                            ? 'bg-blue-50 text-[#2446D8] font-bold dark:bg-blue-950/60 dark:text-blue-300'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-400 leading-tight">
                Applies globally to newly detected or connected subscription profiles.
              </p>
            </div>

            {/* Supported Delivery Channels */}
            <div className="mt-6 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Supported Delivery Channels
              </h3>

              {/* Channel 1: Email */}
              <div className="p-3 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#2446D8] shadow-xs">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                      <span>Email Notifications</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <span className="text-[11px] text-slate-400">shubham@example.com</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Active
                </span>
              </div>

              {/* Channel 2: In-Dashboard Feed */}
              <div className="p-3 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#2446D8] shadow-xs">
                    <Monitor className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                      <span>In-Dashboard Feed</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <span className="text-[11px] text-slate-400">Top bell + Overview widget</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* CARD 2: Reminder Safety Policy */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs">
            <div className="flex items-center gap-2 pb-3 mb-2">
              <Shield className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Reminder Safety Policy
              </h3>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              RecurSight monitors recurring commitments automatically. A reminder alert triggers 48hours prior to settlement to allow sufficient cancellation processing time before payment locks.
            </p>

            {/* Pre-Debit Transparency Box */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Pre-Debit Transparency</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                Card charges settle between 00:00 - 04:00 merchant local time. All reminders dispatch at 09:00 AM recipient local time.
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================= */}
      {/* MODAL: CREATE CUSTOM ALERT                                */}
      {/* ========================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Schedule Custom Alert
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                aria-label="Close"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateReminder} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Target Subscription *
                </label>
                <select
                  value={selectedSubId}
                  onChange={(e) => setSelectedSubId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                >
                  {subscriptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.merchant_name} ({formatCurrencyAmount(s.amount, user?.preferred_currency || 'USD', (s.currency as any) || 'USD')}/{s.billing_interval_unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Alert Date
                  </label>
                  <input
                    type="date"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white dark:[color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Dispatch Time
                  </label>
                  <input
                    type="time"
                    required
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reminder Type
                </label>
                <select
                  value={reminderType}
                  onChange={(e) => setReminderType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="renewal_notice">Renewal Notice</option>
                  <option value="trial_expiry">Trial Expiry Alert</option>
                  <option value="autopay_alert">AutoPay Mandate Lock</option>
                  <option value="custom">Custom Milestone</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Delivery Channel
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryChannel('in_app')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold transition-all ${
                      deliveryChannel === 'in_app'
                        ? 'bg-[#2446D8] border-[#2446D8] text-white'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    In-App Notification
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryChannel('email')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold transition-all ${
                      deliveryChannel === 'email'
                        ? 'bg-[#2446D8] border-[#2446D8] text-white'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Email Notification
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Custom Alert Message (Optional)
                </label>
                <input
                  type="text"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="e.g. Check if annual budget covers license extension"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 rounded-xl bg-[#2446D8] text-white font-bold hover:bg-blue-700"
                >
                  Schedule Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: RULES CONFIG                                       */}
      {/* ========================================================= */}
      {showRulesModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Reminder Rule Configurations
              </h3>
              <button
                onClick={() => setShowRulesModal(false)}
                aria-label="Close"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Global Alert Lead Window
                </label>
                <select
                  value={leadTimeOption}
                  onChange={(e) => setLeadTimeOption(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="1 day before confirmed date">1 day before confirmed date</option>
                  <option value="2 days before confirmed date (default)">2 days before confirmed date (default)</option>
                  <option value="3 days before confirmed date">3 days before confirmed date</option>
                  <option value="7 days before confirmed date (Recommended for Trials)">7 days before confirmed date</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Free Trial Early Warning Window
                </label>
                <select className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold">
                  <option>3 days prior to expiration (Default)</option>
                  <option>5 days prior to expiration</option>
                  <option>7 days prior to expiration</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200">
                <p className="font-semibold">Quiet Hours Protection</p>
                <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                  Notifications are held between 22:00 and 08:00 local time and dispatched promptly at 09:00 AM.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowRulesModal(false)}
                  className="w-full py-2.5 rounded-xl bg-[#2446D8] text-white font-bold hover:bg-blue-700"
                >
                  Save Rules
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: SET DATE MANUALLY                                  */}
      {/* ========================================================= */}
      {showSetDateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Set Renewal Date Manually
              </h3>
              <button
                onClick={() => setShowSetDateModal(false)}
                aria-label="Close"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSetManualDate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subscription
                </label>
                <input
                  type="text"
                  readOnly
                  value={selectedSubForDate}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Next Renewal / Billing Date *
                </label>
                <input
                  type="date"
                  required
                  value={manualDateInput}
                  onChange={(e) => setManualDateInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold dark:[color-scheme:dark]"
                />
              </div>

              <p className="text-[11px] text-slate-400">
                Setting this confirmed renewal date unlocks automated 48-hour reminder dispatch and pre-debit transparency notifications.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSetDateModal(false)}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 rounded-xl bg-[#2446D8] text-white font-bold hover:bg-blue-700"
                >
                  Confirm Date
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DIAGNOSTIC TEST ALERT NAVIGATION                   */}
      {/* ========================================================= */}
      {showDiagnosticModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Diagnostic Test Dispatched
                  </h3>
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    Test webhook & in-app bell activated
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowDiagnosticModal(false)}
                aria-label="Close"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
              A live diagnostic alert has been generated and queued. Choose a destination screen to inspect delivery and mandate health:
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowDiagnosticModal(false);
                  navigate('/');
                }}
                className="w-full p-3 rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-100/70 dark:hover:bg-blue-900/40 text-left flex items-center justify-between group transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#2446D8] text-white flex items-center justify-center shadow-xs">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#2446D8]">
                      Overview Dashboard
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      Check top notification bell & live activity feed
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#2446D8] group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowDiagnosticModal(false);
                  navigate('/subscriptions');
                }}
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left flex items-center justify-between group transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#2446D8]">
                      My Subscriptions
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      Review recurring mandates & renewal timeline
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowDiagnosticModal(false);
                  navigate('/settings');
                }}
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left flex items-center justify-between group transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#2446D8]">
                      Alert Channels & Settings
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      Configure webhook endpoints, email & SMS
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDiagnosticModal(false)}
                className="py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Stay on Reminders
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
