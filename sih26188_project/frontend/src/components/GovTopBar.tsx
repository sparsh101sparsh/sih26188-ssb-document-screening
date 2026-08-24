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
    <div className="bg-[#18103C] text-slate-200 text-[11px] font-sans border-b border-indigo-950 select-none">
      <div className="max-w-[1700px] mx-auto px-4 py-1 flex items-center justify-between">
        {/* Left: Ministry Attribution */}
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1 font-semibold text-amber-300/90 tracking-wide">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>भारत सरकार • गृह मंत्रालय</span>
          </span>
          <span className="hidden sm:inline text-slate-400">|</span>
          <span className="hidden sm:inline text-slate-300 font-medium">
            Government of India • Ministry of Home Affairs
          </span>
        </div>

        {/* Right: Accessibility & Language Controls matching UIDAI */}
        <div className="flex items-center space-x-4">
          <a
            href="#main-content"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById('main-content');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hidden md:inline hover:text-white transition-colors underline-offset-2 hover:underline cursor-pointer"
          >
            Skip to Main Content
          </a>

          {/* Interactive Screen Reader Toggle Button */}
          <button
            type="button"
            onClick={onToggleScreenReader}
            className={`flex items-center space-x-1.5 px-2.5 py-0.5 rounded transition-all cursor-pointer ${
              isScreenReaderActive
                ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-indigo-900/60'
            }`}
            title={isScreenReaderActive ? 'Disable Screen Reader Engine' : 'Activate Voice Screen Reader Engine'}
          >
            <Volume2 className={`w-3.5 h-3.5 ${isScreenReaderActive ? 'text-slate-950 animate-pulse' : 'text-slate-400'}`} />
            <span>{isScreenReaderActive ? 'Screen Reader: ACTIVE' : 'Screen Reader'}</span>
          </button>

          {/* Font Size Adjusters */}
          <div className="hidden sm:flex items-center space-x-1.5 border-x border-slate-700/60 px-2.5">
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
              className="flex items-center space-x-1.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800/60 px-2 py-0.5 rounded text-[11px] text-white font-medium transition-colors cursor-pointer"
            >
              <Globe className="w-3 h-3 text-amber-300" />
              <span>{currentLang === 'en' ? 'English' : 'हिन्दी'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
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
