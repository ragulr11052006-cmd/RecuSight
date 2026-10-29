import React from 'react';

interface MerchantLogoProps {
  name: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const MerchantLogo: React.FC<MerchantLogoProps> = ({
  name,
  className = '',
  size = 'md',
}) => {
  const normalized = (name || '').toLowerCase().trim();

  const sizeClasses = {
    xs: 'w-6 h-6 text-[9px] rounded-lg',
    sm: 'w-7 h-7 text-[10px] rounded-lg',
    md: 'w-9 h-9 text-xs rounded-xl',
    lg: 'w-11 h-11 text-sm rounded-xl',
    xl: 'w-14 h-14 text-base rounded-2xl',
  };

  const currentSize = sizeClasses[size];

  // 1. Netflix
  if (normalized.includes('netflix')) {
    return (
      <div className={`${currentSize} rounded-xl bg-black flex items-center justify-center shadow-xs shrink-0 ${className}`}>
        <svg viewBox="0 0 111 30" className="w-4/5 h-auto" fill="none">
          <path
            d="M0 0h12.5v30H0V0zm22.4 0h12.5v30h-12.5V0zm22.4 0H57v30H44.8V0z"
            fill="none"
          />
          <path
            d="M6.3 0H0v30h6.3V11.2L18.7 30h6.2V0h-6.2v18.8L6.3 0z"
            fill="#E50914"
          />
        </svg>
      </div>
    );
  }

  // 2. Spotify
  if (normalized.includes('spotify')) {
    return (
      <div className={`${currentSize} rounded-xl bg-[#1DB954] flex items-center justify-center shadow-xs shrink-0 ${className}`}>
        <svg viewBox="0 0 24 24" className="w-3/5 h-3/5 text-black" fill="currentColor">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
        </svg>
      </div>
    );
  }

  // 3. Figma
  if (normalized.includes('figma')) {
    return (
      <div className={`${currentSize} rounded-xl bg-slate-900 flex items-center justify-center shadow-xs shrink-0 ${className}`}>
        <svg viewBox="0 0 38 57" className="w-1/2 h-auto" fill="none">
          <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" fill="#1ABCFE" />
          <path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z" fill="#0ACF83" />
          <path d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z" fill="#FF7262" />
          <path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" fill="#F24E1E" />
          <path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" fill="#A259FF" />
        </svg>
      </div>
    );
  }

  // 4. Adobe Creative Cloud
  if (normalized.includes('adobe') || normalized.includes('creative cloud') || normalized.includes('photoshop')) {
    return (
      <div className={`${currentSize} rounded-xl bg-gradient-to-br from-[#FF0000] to-[#D90000] flex items-center justify-center shadow-xs shrink-0 ${className}`}>
        <svg viewBox="0 0 24 24" className="w-3/5 h-3/5 text-white" fill="currentColor">
          <path d="M14.6 2.5h8.9v19H17l-3.9-9.9h-2.2L7 21.5H.5v-19h8.9l5.2 12.3 5.3-12.3zm-6.2 13h7.2l-3.6-8.5-3.6 8.5z" />
        </svg>
      </div>
    );
  }

  // 5. ChatGPT / OpenAI
  if (normalized.includes('chatgpt') || normalized.includes('openai')) {
    return (
      <div className={`${currentSize} rounded-xl bg-[#10A37F] flex items-center justify-center shadow-xs shrink-0 ${className}`}>
        <svg viewBox="0 0 24 24" className="w-3/5 h-3/5 text-white" fill="currentColor">
          <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1683a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4947zm-9.6647-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1448-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1683a.0757.0757 0 0 1-.071 0l-4.8303-2.7866A4.504 4.504 0 0 1 2.3408 7.8956zm16.5976 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4056-.6669zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1635a.0804.0804 0 0 1-.038-.0567V6.0747a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.4597a.7948.7948 0 0 0-.3927.6813v6.722zm1.0976-2.3655l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
        </svg>
      </div>
    );
  }

  // 6. Google Cloud / Workspace / GCP
  if (normalized.includes('google') || normalized.includes('gcp')) {
    return (
      <div className={`${currentSize} rounded-xl bg-white border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-xs shrink-0 ${className}`}>
        <svg viewBox="0 0 24 24" className="w-3/5 h-3/5">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.44 7.34 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.92 0 12s.45 3.85 1.24 5.42l4.04-3.15z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.56 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
          />
        </svg>
      </div>
    );
  }

  // 7. YouTube
  if (normalized.includes('youtube')) {
    return (
      <div className={`${currentSize} rounded-xl bg-[#FF0000] flex items-center justify-center shadow-xs shrink-0 ${className}`}>
        <svg viewBox="0 0 24 24" className="w-3/5 h-3/5 text-white" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      </div>
    );
  }

  // 8. GitHub
  if (normalized.includes('github') || normalized.includes('copilot')) {
    return (
      <div className={`${currentSize} rounded-xl bg-[#181717] flex items-center justify-center shadow-xs shrink-0 ${className}`}>
        <svg viewBox="0 0 24 24" className="w-3/5 h-3/5 text-white" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
        </svg>
      </div>
    );
  }

  // 9. Notion
  if (normalized.includes('notion')) {
    return (
      <div className={`${currentSize} rounded-xl bg-black text-white flex items-center justify-center font-serif font-black shadow-xs shrink-0 ${className}`}>
        <span className="text-[17px] font-black tracking-tighter">N</span>
      </div>
    );
  }

  // 10. Canva
  if (normalized.includes('canva')) {
    return (
      <div className={`${currentSize} rounded-xl bg-gradient-to-tr from-[#00C4CC] to-[#7D2AE8] flex items-center justify-center shadow-xs shrink-0 ${className}`}>
        <span className="text-white font-black italic text-lg leading-none">C</span>
      </div>
    );
  }

  // 11. Apple / iCloud
  if (normalized.includes('apple') || normalized.includes('icloud')) {
    return (
      <div className={`${currentSize} rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0 ${className}`}>
        <svg viewBox="0 0 170 170" className="w-1/2 h-auto" fill="currentColor">
          <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.08-7.77-8.08-12.24-15.02-6.53-10.12-11.83-21.72-15.89-34.8-4.06-13.08-6.09-25.26-6.09-36.56 0-14.25 3.63-26.33 10.89-36.23 7.26-9.91 16.5-14.96 27.72-15.17 5.48 0 11.45 1.5 17.91 4.51 6.46 3.01 10.45 4.55 11.96 4.62 1.25-.07 5.37-1.63 12.35-4.69 6.98-3.06 12.77-4.5 17.37-4.32 12.87.62 23.15 5.56 30.84 14.81-11.27 6.84-16.79 16.32-16.56 28.44.23 9.47 3.86 17.47 10.89 24 7.03 6.53 15.34 10.19 24.94 10.98-2.12 6.34-4.82 13.01-8.12 20.02zM119.22 31.84c0-7.72 2.76-14.93 8.28-21.63 5.52-6.7 12.23-10.74 20.14-12.13.12 1.05.18 1.98.18 2.8 0 7.63-2.91 15-8.73 22.11-5.82 7.11-12.86 11.13-21.12 12.06-.11-1.05-.18-2.02-.18-2.91z" />
        </svg>
      </div>
    );
  }

  // 12. Amazon Prime
  if (normalized.includes('amazon') || normalized.includes('prime')) {
    return (
      <div className={`${currentSize} rounded-xl bg-[#00A8E1] flex items-center justify-center shadow-xs shrink-0 ${className}`}>
        <span className="text-white font-black tracking-tight text-sm">prime</span>
      </div>
    );
  }

  // 13. Microsoft 365
  if (normalized.includes('microsoft') || normalized.includes('office')) {
    return (
      <div className={`${currentSize} rounded-xl bg-white border border-slate-200 dark:border-slate-700 p-1.5 flex items-center justify-center shadow-xs shrink-0 ${className}`}>
        <div className="grid grid-cols-2 gap-1 w-full h-full">
          <div className="bg-[#F25022] rounded-xs" />
          <div className="bg-[#7FBA00] rounded-xs" />
          <div className="bg-[#00A4EF] rounded-xs" />
          <div className="bg-[#FFB900] rounded-xs" />
        </div>
      </div>
    );
  }

  // 14. Disney+ / Hotstar
  if (normalized.includes('disney') || normalized.includes('hotstar')) {
    return (
      <div className={`${currentSize} rounded-xl bg-[#0C111B] flex items-center justify-center shadow-xs shrink-0 border border-blue-900/40 ${className}`}>
        <span className="text-[#0063E5] font-black text-sm italic tracking-tighter">D+</span>
      </div>
    );
  }

  // 15. Slack
  if (normalized.includes('slack')) {
    return (
      <div className={`${currentSize} rounded-xl bg-[#4A154B] flex items-center justify-center shadow-xs shrink-0 ${className}`}>
        <span className="text-[#36C5F0] font-black text-lg">#</span>
      </div>
    );
  }

  // 16. Zoom
  if (normalized.includes('zoom')) {
    return (
      <div className={`${currentSize} rounded-xl bg-[#2D8CFF] flex items-center justify-center shadow-xs shrink-0 ${className}`}>
        <svg viewBox="0 0 24 24" className="w-3/5 h-3/5 text-white" fill="currentColor">
          <path d="M4 6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2.5l4 2.5a1 1 0 0 0 1.5-.86v-7.28a1 1 0 0 0-1.5-.86l-4 2.5V8a2 2 0 0 0-2-2H4z" />
        </svg>
      </div>
    );
  }

  // 17. Swiggy
  if (normalized.includes('swiggy')) {
    return (
      <div className={`${currentSize} rounded-xl bg-[#FC8019] flex items-center justify-center shadow-xs shrink-0 text-white font-black ${className}`}>
        <span className="text-base font-black">S</span>
      </div>
    );
  }

  // 18. Zomato
  if (normalized.includes('zomato')) {
    return (
      <div className={`${currentSize} rounded-xl bg-[#E23744] flex items-center justify-center shadow-xs shrink-0 text-white font-black italic ${className}`}>
        <span className="text-sm font-black">zomato</span>
      </div>
    );
  }

  // 19. FastSpring
  if (normalized.includes('fastspring')) {
    return (
      <div className={`${currentSize} rounded-xl bg-[#0B1528] flex items-center justify-center shadow-xs shrink-0 text-white font-bold ${className}`}>
        <span className="text-base font-black text-[#1ABCFE]">FS</span>
      </div>
    );
  }

  // 20. Claude (Anthropic)
  if (normalized.includes('claude')) {
    return (
      <div className={`${currentSize} rounded-xl bg-[#D97757] flex items-center justify-center shadow-xs shrink-0 text-white p-1.5 ${className}`}>
        <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="2" x2="12" y2="22" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
        </svg>
      </div>
    );
  }

  // 21. Perplexity AI
  if (normalized.includes('perplexity')) {
    return (
      <div className={`${currentSize} rounded-xl bg-[#1B2B34] flex items-center justify-center shadow-xs shrink-0 text-[#20B2AA] p-1.5 ${className}`}>
        <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      </div>
    );
  }

  // 22. Cursor
  if (normalized.includes('cursor')) {
    return (
      <div className={`${currentSize} rounded-xl bg-black flex items-center justify-center shadow-xs shrink-0 text-white p-1.5 ${className}`}>
        <svg viewBox="0 0 24 24" className="w-full h-full" fill="white">
          <polygon points="3,3 10,21 13,13 21,10" />
        </svg>
      </div>
    );
  }

  // Default fallback: Elegant gradient initial with merchant initial
  const initial = name.charAt(0).toUpperCase() || 'S';
  const gradients = [
    'from-blue-600 to-indigo-700',
    'from-emerald-600 to-teal-700',
    'from-purple-600 to-pink-700',
    'from-amber-600 to-orange-700',
    'from-rose-600 to-red-700',
  ];
  const charCode = name.charCodeAt(0) || 0;
  const grad = gradients[charCode % gradients.length];

  return (
    <div
      className={`${currentSize} rounded-xl bg-gradient-to-br ${grad} text-white font-bold flex items-center justify-center shadow-xs shrink-0 ${className}`}
    >
      <span>{initial}</span>
    </div>
  );
};
