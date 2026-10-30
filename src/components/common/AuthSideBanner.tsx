import React from 'react';
import authBgImage from '../../assets/auth-bg.jpg';

interface AuthSideBannerProps {
  className?: string;
}

export const AuthSideBanner: React.FC<AuthSideBannerProps> = ({ className = '' }) => {
  return (
    <div
      className={`hidden md:block relative h-full w-full bg-slate-900 overflow-hidden min-h-[580px] select-none ${className}`}
    >
      {/* Base Photo: Businessman with Tablet */}
      <img
        src={authBgImage}
        alt="RecurSight"
        className="w-full h-full object-cover object-center scale-105 transition-transform duration-700"
      />

      {/* Atmospheric Cinematic & Brand Overlay Effects */}
      {/* 1. RecurSight Brand Wash (Royal Blue / Navy Tint) */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#1C36B6]/40 via-[#2446D8]/15 to-[#151B2D]/50 mix-blend-multiply pointer-events-none" />

      {/* 2. Vertical Vignette / Depth Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-slate-950/40 pointer-events-none" />

      {/* 3. Radial Corner Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(15,23,42,0.5)_100%)] pointer-events-none" />
    </div>
  );
};
