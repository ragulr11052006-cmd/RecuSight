import React from 'react';
import authBgImage from '../../assets/auth-bg.jpg';

interface AuthSideBannerProps {
  className?: string;
}

export const AuthSideBanner: React.FC<AuthSideBannerProps> = ({ className = '' }) => {
  return (
    <div
      className={`hidden md:block relative h-full w-full bg-slate-100 dark:bg-slate-900 overflow-hidden min-h-[580px] select-none ${className}`}
    >
      {/* Clean Full Left Banner Image */}
      <img
        src={authBgImage}
        alt="RecurSight"
        className="w-full h-full object-cover object-center"
      />
    </div>
  );
};
