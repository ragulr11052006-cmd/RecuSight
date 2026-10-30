import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  HelpCircle,
  ShieldCheck,
  CreditCard,
  Building2,
  Mail,
  MessageSquare,
  ChevronDown,
  CheckCircle2,
  ExternalLink,
  ArrowLeft,
  Clock,
  Phone,
  Headset,
} from 'lucide-react';

interface HelpSupportProps {
  isPublic?: boolean;
}

export const HelpSupport: React.FC<HelpSupportProps> = ({ isPublic = false }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const FAQS = [
    {
      q: 'How does RecurSight track my subscriptions without risking my banking security?',
      a: 'RecurSight relies solely on non-sensitive metadata (such as merchant name, recurring cadence, billing cycle, and non-sensitive last 4 digits). We never request, process, or store full card numbers, CVVs, UPI PINs, or banking passwords.',
    },
    {
      q: 'What is the critical difference between Path A (Disabling AutoPay) and Path B (Vendor Direct)?',
      a: 'Disabling AutoPay / revoking a mandate operates on the payment rail (UPI, Visa/MasterCard E-Mandate, NetBanking) and blocks future debits at the bank level, regardless of vendor behavior. Cancelling Vendor Direct closes your account contract officially with the merchant to prevent balance carryover or account suspension.',
    },
    {
      q: 'How does statement and invoice extraction work?',
      a: 'When you upload a statement (PDF, PNG, JPG, or CSV), our parser detects recurring transaction strings (e.g. "FS*FASTSPRING", "ADOBE*CREATIVE CLD") and estimates the renewal cycle. You retain full control to audit and confirm the detected entities before they are saved to your ledger.',
    },
    {
      q: 'Why are some subscriptions marked as "Unconfirmed Estimates"?',
      a: 'Transactions identified through statement scanning often represent variable or introductory trial pricing. RecurSight marks them as estimates until confirmed against subsequent billing statements.',
    },
    {
      q: 'How do reminders work across time zones?',
      a: 'All reminders dispatch by default at 09:00 AM in your configured local timezone (configurable in Settings), allowing a 48-hour window before midnight merchant settlement locks.',
    },
  ];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setContactSubject('');
      setContactMessage('');
    }, 4000);
  };

  const mainContent = (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-[#2446D8]">
            <Headset className="w-4 h-4" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            IT & Subscription Support Desk
          </h1>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          Dedicated assistance for login issues, bank mandate management, and invoice tracking
        </p>
      </div>

      {/* Quick Direct Support Channels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-[#2446D8] shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400">Email IT Desk</span>
            <a href="mailto:support@recusight.com" className="text-xs font-bold text-slate-800 dark:text-slate-200 block hover:text-[#2446D8] dark:hover:text-blue-400">
              support@recusight.com
            </a>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400">Response SLA</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              &lt; 2 Hours Average
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400">Security SLA</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              Read-Only Mandates
            </span>
          </div>
        </div>
      </div>

      {/* Security Assurance Banner */}
      <div className="p-5 rounded-3xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 flex items-start gap-4">
        <div className="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
            Zero-Credential Security Promise
          </h3>
          <p className="text-xs text-emerald-800/90 dark:text-emerald-300/90 mt-1 leading-relaxed">
            RecurSight operates on read-only standing instruction metadata. We never connect directly to fund transfer rails or hold user payment credentials.
          </p>
        </div>
      </div>

      {/* FAQs Section */}
      <div className="space-y-4">
        <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
          Frequently Asked Questions
        </h2>

        <div className="space-y-2.5">
          {FAQS.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                aria-expanded={openFaq === idx}
                className="w-full p-4 text-left flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    openFaq === idx ? 'rotate-180 text-[#2446D8]' : ''
                  }`}
                />
              </button>

              {openFaq === idx && (
                <div className="px-4 pb-4 pt-1 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Support Form */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-[#2446D8]">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Contact RecurSight Support</h3>
            <p className="text-xs text-slate-400">Our engineering and billing intelligence team is here to assist</p>
          </div>
        </div>

        {submitted ? (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Thank you! Your inquiry has been submitted. A response will be sent to your email.</span>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Subject
              </label>
              <input
                type="text"
                required
                value={contactSubject}
                onChange={(e) => setContactSubject(e.target.value)}
                placeholder="e.g. Assistance with unconfirmed statement charge"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Message & Details
              </label>
              <textarea
                rows={4}
                required
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Describe what you need help with..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="py-2.5 px-6 rounded-xl bg-[#2446D8] hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              Send Support Message
            </button>
          </form>
        )}
      </div>

    </div>
  );

  if (isPublic) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 p-4 sm:p-6 lg:p-8 font-sans">
        <div className="max-w-4xl mx-auto mb-8 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-4">
          <NavLink to="/login" className="flex items-center gap-2">
            <img src="/logo.png" alt="RecurSight" className="h-9 object-contain" />
          </NavLink>
          <NavLink
            to="/login"
            className="py-2 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 shadow-xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </NavLink>
        </div>
        {mainContent}
      </div>
    );
  }

  return mainContent;
};
