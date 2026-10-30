import React from 'react';
import { Calendar, ChevronRight } from 'lucide-react';
import { MerchantLogo } from './MerchantLogo';

interface AuthSideBannerProps {
  className?: string;
}

const DEMO_SUBSCRIPTIONS = [
  { name: 'Netflix', price: '₹ 649 / month', status: 'Active' },
  { name: 'Spotify', price: '₹ 119 / month', status: 'Active' },
  { name: 'Figma', price: '₹ 1,250 / month', status: 'Active' },
  { name: 'Adobe Creative Cloud', price: '₹ 2,398 / month', status: 'Active' },
  { name: 'YouTube Premium', price: '₹ 149 / month', status: 'Active' },
  { name: 'Amazon Prime', price: '₹ 299 / month', status: 'Active' },
];

export const AuthSideBanner: React.FC<AuthSideBannerProps> = ({ className = '' }) => {
  return (
    <div
      className={`hidden md:block relative h-full w-full bg-slate-900 overflow-hidden min-h-[580px] select-none ${className}`}
    >
      {/* Background Image: Uploaded Businessman with Tablet */}
      <img
        src="/auth-bg.jpg"
        alt="RecurSight Subscriptions Vault"
        className="w-full h-full object-cover object-[25%_center] scale-105 transition-transform duration-700"
      />

      {/* Atmospheric Overlays for Contrast & Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-slate-950/40 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-950/20 to-slate-950/60 pointer-events-none" />

      {/* Top-Left Badge: RecurSight Vault 2.0 */}
      <div className="absolute top-5 left-5 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/70 backdrop-blur-md border border-white/15 shadow-lg">
        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
        <span className="text-[11px] font-bold text-white tracking-wide">RecurSight Vault 2.0</span>
      </div>

      {/* Floating Subscriptions Panel on the Right */}
      <div className="absolute top-12 right-4 sm:right-5 z-20 w-[215px] sm:w-[225px] flex flex-col gap-2">
        {/* Header */}
        <div className="flex items-center gap-2 px-1 mb-0.5">
          <div className="w-6 h-6 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center text-white shrink-0 border border-white/20">
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white tracking-tight leading-none drop-shadow-sm">
              Your Subscriptions
            </h4>
            <p className="text-[10px] text-white/80 leading-tight mt-0.5 drop-shadow-sm">
              Stay on top of what you pay for.
            </p>
          </div>
        </div>

        {/* Subscription Items Stack */}
        <div className="space-y-1.5">
          {DEMO_SUBSCRIPTIONS.map((sub) => (
            <div
              key={sub.name}
              className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-md rounded-2xl p-2 px-2.5 flex items-center justify-between gap-2 shadow-sm border border-white/60 dark:border-slate-700/60 transition-transform hover:scale-[1.02]"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <MerchantLogo name={sub.name} size="xs" className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                    {sub.name}
                  </p>
                  <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                    {sub.price}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50">
                  {sub.status}
                </span>
                <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
