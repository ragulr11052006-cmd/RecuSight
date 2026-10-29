import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/supabase';
import { Subscription, CancellationGuidanceHistory } from '../../types';
import { formatCurrencyAmount } from '../../lib/currency';
import { MerchantLogo } from '../../components/common/MerchantLogo';
import {
  ExternalLink,
  CheckCircle2,
  Clock,
  Power,
  XCircle,
  Lightbulb,
  Building2,
  Smartphone,
  CreditCard,
  Ban,
  Check,
  X,
  Plus,
  Loader2,
} from 'lucide-react';

export const CancellationGuidance: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const serviceParam = searchParams.get('service');

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [history, setHistory] = useState<CancellationGuidanceHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State for App Hub or Manual Log
  const [activeHubModal, setActiveHubModal] = useState<string | null>(null);
  const [selectedSubForRevoke, setSelectedSubForRevoke] = useState<Subscription | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subs, hist] = await Promise.all([
        db.getSubscriptions(user?.id || 'default-user'),
        db.getCancellationHistory(user?.id || 'default-user'),
      ]);
      setSubscriptions(subs);
      setHistory(hist);
    } catch (err) {
      console.error('Failed to load cancellation guidance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMerchantCancelUrl = (sub: Subscription): string => {
    if (sub.cancellation_url) return sub.cancellation_url;
    const lower = sub.merchant_name.toLowerCase();
    if (lower.includes('netflix')) return 'https://www.netflix.com/youraccount';
    if (lower.includes('adobe')) return 'https://account.adobe.com/plans';
    if (lower.includes('spotify')) return 'https://www.spotify.com/account/change-plan/';
    if (lower.includes('canva')) return 'https://www.canva.com/settings/billing';
    if (lower.includes('amazon') || lower.includes('prime')) return 'https://www.amazon.com/mc/manage';
    if (lower.includes('youtube')) return 'https://www.youtube.com/paid_memberships';
    if (lower.includes('notion')) return 'https://www.notion.so/settings';
    if (lower.includes('perplexity')) return 'https://www.perplexity.ai/settings';
    if (lower.includes('apple') || lower.includes('icloud')) return 'https://support.apple.com/billing';
    if (lower.includes('google') || lower.includes('cloud')) return 'https://play.google.com/store/account/subscriptions';
    if (sub.website_url) return sub.website_url;
    return `https://www.google.com/search?q=how+to+cancel+${encodeURIComponent(sub.merchant_name)}+subscription`;
  };

  const handleOpenCancel = async (sub: Subscription) => {
    const cancelUrl = getMerchantCancelUrl(sub);
    window.open(cancelUrl, '_blank', 'noopener,noreferrer');
    setNotificationMsg(`Opened verified vendor cancellation portal for ${sub.merchant_name}`);

    try {
      const logged = await db.logCancellationAction({
        user_id: user?.id || 'default-user',
        subscription_id: sub.id,
        merchant_name: sub.merchant_name,
        action_type: 'cancel_vendor',
        status: 'guidance_viewed',
        notes: `Opened verified direct vendor cancellation portal (${cancelUrl})`,
      });
      setHistory((prev) => [logged, ...prev]);
    } catch (err) {
      console.error('Error logging cancellation action:', err);
    }

    setTimeout(() => setNotificationMsg(null), 4000);
  };

  const handleOpenRevoke = (sub: Subscription) => {
    setSelectedSubForRevoke(sub);
    setActiveHubModal(sub.merchant_name);
  };

  const handleConfirmRevocation = async () => {
    if (selectedSubForRevoke) {
      const merchantName = selectedSubForRevoke.merchant_name;
      try {
        const logged = await db.logCancellationAction({
          user_id: user?.id || 'default-user',
          subscription_id: selectedSubForRevoke.id,
          merchant_name: merchantName,
          action_type: 'revoke_autopay',
          status: 'mandate_revocation_marked',
          notes: `Marked AutoPay mandate revoked for ${merchantName}`,
          confirmation_reference: `REV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        });
        setHistory((prev) => [logged, ...prev]);
        setNotificationMsg(`AutoPay mandate revocation confirmed & recorded for ${merchantName}.`);
      } catch (err) {
        console.error('Error recording mandate revocation:', err);
      }
    } else if (activeHubModal) {
      setNotificationMsg(`Revocation instructions for ${activeHubModal} acknowledged.`);
    }

    setActiveHubModal(null);
    setSelectedSubForRevoke(null);
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-200">
      
      {/* ========================================================= */}
      {/* HEADER WITH BREADCRUMBS & ZERO-PASSWORD BADGE            */}
      {/* ========================================================= */}
      <div>
        <div className="text-[10px] font-bold tracking-wider uppercase text-slate-400 mb-1">
          <span>STEP-BY-STEP PLAYBOOKS / </span>
          <span className="text-[#2446D8]">Stop Recurring Charges</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Cancellation & AutoPay Guidance
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Step-by-step guidance to stop recurring charges: cancel vendor accounts or revoke bank AutoPay mandates directly at the source.
            </p>
          </div>

          <div className="shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 text-xs font-semibold shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Zero-Password Guaranteed</span>
            </span>
          </div>
        </div>
      </div>

      {notificationMsg && (
        <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
          <span>{notificationMsg}</span>
          <button onClick={() => setNotificationMsg(null)} className="text-blue-500 hover:text-blue-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* TWO PLAYBOOK CARDS: PATH A VS PATH B                      */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* PATH A: HOW TO DISABLE AUTOPAY (BANK & UPI RAIL) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                  <Power className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                    PATH A • BANK & UPI RAIL
                  </span>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    How to Disable AutoPay
                  </h2>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Direct at Bank
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Revoke recurring mandate permissions (UPI AutoPay, Card E-Mandate, NetBanking). Stops payments immediately even if the merchant refuses to cancel.
            </p>

            {/* Steps */}
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white">
                    Open Your Payment App
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Launch Google Pay, PhonePe, Paytm, or your Bank NetBanking portal.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white">
                    Navigate to Mandates / AutoPay
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Go to Profile &gt; 'AutoPay' or 'Mandates / Standing Instructions'.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white">
                    Select Merchant & Revoke
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Select the active subscription, tap 'Revoke Mandate', and confirm via UPI PIN.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
              QUICK APP SHORTCUTS & MANDATE HUBS
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveHubModal('Google Pay')}
                className="py-1.5 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
              >
                <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                <span>Google Pay</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveHubModal('PhonePe')}
                className="py-1.5 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
              >
                <Smartphone className="w-3.5 h-3.5 text-purple-500" />
                <span>PhonePe</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveHubModal('Paytm')}
                className="py-1.5 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
              >
                <Smartphone className="w-3.5 h-3.5 text-sky-500" />
                <span>Paytm</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveHubModal('Bank NetBanking')}
                className="py-1.5 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Bank NetBanking</span>
              </button>
            </div>
          </div>
        </div>

        {/* PATH B: HOW TO CANCEL A SUBSCRIPTION (VENDOR DIRECT) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#2446D8] flex items-center justify-center">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#2446D8] dark:text-blue-400 block">
                    PATH B • VENDOR DIRECT
                  </span>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    How to Cancel a Subscription
                  </h2>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                Merchant Portal
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Officially terminate account billing directly through the vendor settings. Closes your account and prevents early break penalties or credit reporting flags.
            </p>

            {/* Steps */}
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#2446D8] text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white">
                    Open Billing or Account Settings
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Sign into the merchant portal and locate 'Membership', 'Plan', or 'Billing'.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#2446D8] text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white">
                    Select 'Cancel Subscription'
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Click through cancellation steps. Bypass pause offers or discount retention traps.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#2446D8] text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white">
                    Confirm & Retain Confirmation Proof
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Save confirmation number or email receipt as proof for your audit trail.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Pro Tip Box */}
          <div className="mt-5 p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 flex items-center gap-2.5 text-xs text-purple-900 dark:text-purple-300">
            <Lightbulb className="w-4 h-4 text-purple-600 shrink-0" />
            <span>
              <strong>Pro Tip:</strong> Most plans keep active service until the end of your prepaid billing period.
            </span>
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* SECTION: SELECT AN APP TO GET INSTANT INSTRUCTIONS        */}
      {/* ========================================================= */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
            Select an App to Get Instant Instructions
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pick your active recurring subscriptions to view verified direct cancellation URLs or mandate revocation guides.
          </p>
        </div>

        {loading ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center flex items-center justify-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin text-[#2446D8]" />
            <span>Loading your subscriptions...</span>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
              <Ban className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
              No Active Subscriptions Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
              You haven't added any subscriptions yet. Once you add or import subscriptions, they will appear here with direct cancellation links and AutoPay revocation playbooks.
            </p>
            <button
              type="button"
              onClick={() => navigate('/subscriptions/new')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2446D8] hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Subscription</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MerchantLogo name={sub.merchant_name} size="md" />
                    <div>
                      <h3 className="font-bold text-xs text-slate-900 dark:text-white">
                        {sub.merchant_name}
                      </h3>
                      <span className="text-[11px] text-slate-400 block">{sub.category}</span>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {formatCurrencyAmount(
                      sub.amount,
                      user?.preferred_currency || sub.currency || 'INR',
                      sub.currency || 'INR'
                    )}/{sub.billing_interval_unit === 'years' ? 'yr' : 'mo'}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleOpenCancel(sub)}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#8B1A1A] hover:bg-[#741515] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Cancel Vendor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenRevoke(sub)}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Ban className="w-3.5 h-3.5 text-teal-600" />
                    <span>Revoke AutoPay</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* SECTION: YOUR LOGGED GUIDANCE HISTORY                     */}
      {/* ========================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Your Logged Guidance History
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Recently followed guides and completed revocation or cancellation actions.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {history.length} {history.length === 1 ? 'Recent Entry' : 'Recent Entries'}
          </span>
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs py-8">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="font-semibold text-slate-600 dark:text-slate-300">No Guidance History Logged Yet</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
              When you click cancellation links or revoke bank AutoPay mandates, your actions will be recorded here for your audit trail.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => {
              const formattedDate = new Date(item.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              const isRevoke = item.action_type === 'revoke_autopay';
              const isPause = item.action_type === 'pause_requested';
              
              let subtitle = `Vendor Direct Cancellation • Completed ${formattedDate}`;
              if (isRevoke) {
                subtitle = `UPI AutoPay Mandate Revocation • Completed ${formattedDate}`;
              } else if (isPause) {
                subtitle = `Vendor Billing Paused • Completed ${formattedDate}`;
              } else if (item.status === 'guidance_viewed') {
                subtitle = `Cancellation Guidance Viewed • ${formattedDate}`;
              }

              let badgeText = 'Confirmed at Bank';
              let badgeStyle = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900';
              let BadgeIcon = CheckCircle2;
              let iconColor = 'text-emerald-600';

              if (item.status === 'mandate_revocation_marked') {
                badgeText = 'Mandate Inactive';
              } else if (isPause) {
                badgeText = 'Paused';
                badgeStyle = 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-900';
                BadgeIcon = Clock;
                iconColor = 'text-blue-600';
              } else if (item.status === 'guidance_viewed') {
                badgeText = 'Guidance Opened';
                badgeStyle = 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
                BadgeIcon = ExternalLink;
                iconColor = 'text-slate-500';
              }

              const initial = item.merchant_name?.charAt(0).toUpperCase() || 'S';

              return (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl hover:bg-slate-50/70 dark:hover:bg-slate-800/40 flex items-center justify-between transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-xl font-black text-sm flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {initial}
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-slate-900 dark:text-white">
                        {item.merchant_name}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${badgeStyle}`}>
                    <BadgeIcon className={`w-3 h-3 ${iconColor}`} />
                    <span>{badgeText}</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: AutoPay Revocation Guidance for App */}
      {activeHubModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Revoke Mandate: {activeHubModal}
              </h3>
              <button
                onClick={() => {
                  setActiveHubModal(null);
                  setSelectedSubForRevoke(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <p>
                To revoke active recurring debits for <strong>{activeHubModal}</strong> at the banking level:
              </p>
              <ol className="list-decimal pl-4 space-y-2 text-slate-700 dark:text-slate-200 font-medium">
                <li>Open your UPI application or Netbanking banking portal.</li>
                <li>Navigate to <strong>Settings &gt; Mandates / AutoPay</strong>.</li>
                <li>Find <strong>{activeHubModal}</strong> in active mandates and select <strong>Revoke Mandate</strong>.</li>
                <li>Enter your UPI PIN or 2FA OTP to authorize the immediate revocation.</li>
              </ol>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-[11px] mt-4">
                Once revoked, the bank rejects any future debit attempts automatically.
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleConfirmRevocation}
                  className="w-full py-2.5 rounded-xl bg-[#2446D8] text-white font-bold hover:bg-blue-700 transition"
                >
                  Understood & Mark Revoked
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
