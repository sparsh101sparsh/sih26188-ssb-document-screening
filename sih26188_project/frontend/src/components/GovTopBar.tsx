import React, { useState } from 'react';
import { Globe, Volume2, ShieldCheck, ChevronDown } from 'lucide-react';

interface GovTopBarProps {
  onLanguageChange?: (lang: 'en' | 'hi') => void;
  onOpenSecurityProtocols?: () => void;
  isScreenReaderActive: boolean;
  onToggleScreenReader: () => void;
}

export const GovTopBar: React.FC<GovTopBarProps> = ({
  onLanguageChange,
  onOpenSecurityProtocols,
  isScreenReaderActive,
  onToggleScreenReader,
}) => {
  const [currentLang, setCurrentLang] = useState<'en' | 'hi'>('en');
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [fontSizeIndex, setFontSizeIndex] = useState(1); // 0: -A, 1: A, 2: A+

  const handleLangSelect = (lang: 'en' | 'hi') => {
    setCurrentLang(lang);
    setIsLangOpen(false);
    if (onLanguageChange) onLanguageChange(lang);
  };

  const handleFontSize = (idx: number) => {
    setFontSizeIndex(idx);
    const root = document.documentElement;
    if (idx === 0) root.style.fontSize = '92%';
    else if (idx === 1) root.style.fontSize = '100%';
    else if (idx === 2) root.style.fontSize = '108%';
  };

  return (
    <div className="bg-[#18103C] text-slate-200 text-[11px] font-sans border-b border-indigo-950 select-none w-full">
      <div className="w-full max-w-[1700px] mx-auto px-2 sm:px-4 py-1 flex items-center justify-between gap-2">
        {/* Left: Ministry Attribution */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 shrink">
          <span className="flex items-center space-x-1 font-semibold text-amber-300/90 tracking-wide truncate">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>भारत सरकार • गृह मंत्रालय</span>
          </span>
          <span className="hidden md:inline text-slate-400">|</span>
          <span className="hidden md:inline text-slate-300 font-medium truncate">
            Government of India • Ministry of Home Affairs
          </span>
        </div>

        {/* Right: Accessibility & Language Controls matching UIDAI */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <a
            href="#main-content"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById('main-content');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hidden 2xl:inline hover:text-white transition-colors underline-offset-2 hover:underline cursor-pointer"
          >
            Skip to Main Content
          </a>

          {/* Interactive Screen Reader Toggle Button */}
          <button
            type="button"
            onClick={onToggleScreenReader}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded transition-all cursor-pointer ${
              isScreenReaderActive
                ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-indigo-900/60'
            }`}
            title={isScreenReaderActive ? 'Disable Screen Reader Engine' : 'Activate Voice Screen Reader Engine'}
          >
            <Volume2 className={`w-3.5 h-3.5 shrink-0 ${isScreenReaderActive ? 'text-slate-950 animate-pulse' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">{isScreenReaderActive ? 'Voice: ON' : 'Voice Reader'}</span>
          </button>

          {/* Font Size Adjusters (Shown on wider viewports) */}
          <div className="hidden xl:flex items-center space-x-1 border-x border-slate-700/60 px-2">
            <button
              onClick={() => handleFontSize(0)}
              className={`px-1 rounded text-[10px] font-bold cursor-pointer ${
                fontSizeIndex === 0 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Small font size"
            >
              A-
            </button>
            <button
              onClick={() => handleFontSize(1)}
              className={`px-1 rounded text-[11px] font-bold cursor-pointer ${
                fontSizeIndex === 1 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Default font size"
            >
              A
            </button>
            <button
              onClick={() => handleFontSize(2)}
              className={`px-1 rounded text-[12px] font-bold cursor-pointer ${
                fontSizeIndex === 2 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Large font size"
            >
              A+
            </button>
          </div>

          {/* Language Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="flex items-center space-x-1 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800/60 px-2 py-0.5 rounded text-[11px] text-white font-medium transition-colors cursor-pointer"
            >
              <Globe className="w-3 h-3 text-amber-300 shrink-0" />
              <span>{currentLang === 'en' ? 'English' : 'हिन्दी'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>


            {isLangOpen && (
              <div className="absolute right-0 top-full mt-1 w-28 bg-white text-slate-800 rounded-md shadow-lg border border-slate-200 py-1 z-50 animate-pop-in">
                <button
                  onClick={() => handleLangSelect('en')}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50 font-medium cursor-pointer ${
                    currentLang === 'en' ? 'text-indigo-600 font-bold bg-indigo-50/50' : ''
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => handleLangSelect('hi')}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50 font-medium cursor-pointer ${
                    currentLang === 'hi' ? 'text-indigo-600 font-bold bg-indigo-50/50' : ''
                  }`}
                >
                  हिन्दी
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
