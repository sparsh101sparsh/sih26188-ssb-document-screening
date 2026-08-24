import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Play, Pause, Square, Settings2, Sliders, X, ChevronUp, ChevronDown, Check } from 'lucide-react';

interface ScreenReaderEngineProps {
  isActive: boolean;
  onToggle: () => void;
  lang?: 'en' | 'hi';
}

export const ScreenReaderEngine: React.FC<ScreenReaderEngineProps> = ({
  isActive,
  onToggle,
  lang = 'en',
}) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechVolume, setSpeechVolume] = useState(1.0);
  const [currentText, setCurrentText] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const highlightedElemRef = useRef<HTMLElement | null>(null);

  // 1. Initialize and Load Available Speech Voices
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);

      // Auto-select best voice (prefer Indian English or Hindi if available)
      const indianVoice = availableVoices.find(
        (v) =>
          v.lang.includes('en-IN') ||
          v.name.toLowerCase().includes('india') ||
          v.name.toLowerCase().includes('veena') ||
          v.name.toLowerCase().includes('rishi')
      );
      const hindiVoice = availableVoices.find((v) => v.lang.includes('hi'));
      const defaultEnglish = availableVoices.find((v) => v.lang.startsWith('en'));

      if (lang === 'hi' && hindiVoice) {
        setSelectedVoice(hindiVoice);
      } else {
        setSelectedVoice(indianVoice || defaultEnglish || availableVoices[0] || null);
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [lang]);

  // 2. Speak function with rate and volume parameters
  const speak = (text: string) => {
    if (!('speechSynthesis' in window) || !text.trim()) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.rate = speechRate;
    utterance.volume = speechVolume;
    utterance.pitch = 1.0;
    utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-US';

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
      setCurrentText(text);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      setIsSpeaking(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
      setCurrentText('');
    }
  };

  const pauseSpeaking = () => {
    if ('speechSynthesis' in window) {
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
    }
  };

  // 3. Screen Reader Hover & Click Listener
  useEffect(() => {
    if (!isActive) {
      stopSpeaking();
      if (highlightedElemRef.current) {
        highlightedElemRef.current.style.outline = '';
        highlightedElemRef.current.style.backgroundColor = '';
        highlightedElemRef.current = null;
      }
      return;
    }

    // Initial greeting announcement
    speak(
      lang === 'hi'
        ? 'सशस्त्र सीमा बल दस्तावेज़ जांच स्क्रीन रीडर सक्रिय है। पढ़ने के लिए किसी भी टेक्स्ट या बटन पर कर्सर ले जाएं।'
        : 'SSB Border Screening Screen Reader is active. Hover over or click any button, title, or card to hear it read aloud.'
    );

    let hoverTimeout: any = null;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target || target.closest('#screen-reader-toolbar')) return;

      // Extract readable text from element or aria attributes
      const textToRead =
        target.getAttribute('aria-label') ||
        target.getAttribute('title') ||
        (target.tagName === 'BUTTON' || target.tagName === 'A' || target.tagName === 'H1' || target.tagName === 'H2' || target.tagName === 'H3' || target.tagName === 'H4' || target.tagName === 'P' || target.tagName === 'SPAN' || target.tagName === 'CODE'
          ? target.innerText
          : null);

      if (textToRead && textToRead.trim().length > 0 && textToRead.trim().length < 300) {
        // Visual Accessibility Highlight
        if (highlightedElemRef.current && highlightedElemRef.current !== target) {
          highlightedElemRef.current.style.outline = '';
        }
        highlightedElemRef.current = target;
        target.style.outline = '2px solid #D97706';
        target.style.outlineOffset = '2px';

        clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(() => {
          speak(textToRead.trim());
        }, 150);
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && target === highlightedElemRef.current) {
        target.style.outline = '';
      }
    };

    // Text selection listener (read highlighted text)
    const handleMouseUp = () => {
      const selected = window.getSelection()?.toString();
      if (selected && selected.trim().length > 0) {
        speak(selected.trim());
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      clearTimeout(hoverTimeout);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('mouseup', handleMouseUp);
      if (highlightedElemRef.current) {
        highlightedElemRef.current.style.outline = '';
      }
    };
  }, [isActive, lang, selectedVoice, speechRate, speechVolume]);

  if (!isActive) return null;

  return (
    <div
      id="screen-reader-toolbar"
      className="fixed bottom-6 left-6 z-[9999] bg-white rounded-2xl shadow-2xl border-2 border-amber-500 max-w-md w-full overflow-hidden animate-pop-in select-none font-sans"
    >
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-[#18103C] to-[#1E3A8A] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
            <Volume2 className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-white">Interactive Screen Reader</h4>
            <p className="text-[10px] text-amber-200/90 font-mono">Government Accessibility Audio Engine</p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Speech Settings"
          >
            <Sliders className="w-4 h-4" />
          </button>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close Screen Reader"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live Speech Caption Display */}
      <div className="p-3.5 bg-slate-50 border-b border-slate-200 min-h-[48px] flex items-center">
        <p className="text-xs text-slate-700 font-medium leading-relaxed line-clamp-2">
          {currentText ? (
            <span className="text-indigo-950 font-semibold">🔊 "{currentText}"</span>
          ) : (
            <span className="text-slate-400 italic">Hover over any text or button on screen to read...</span>
          )}
        </p>
      </div>

      {/* Control Buttons */}
      <div className="p-3 bg-white flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() =>
              speak(
                currentText ||
                  'Sashastra Seema Bal Document Screening Station. Real-time OCR, 1:1 facial biometric matching, and neural tampering detection.'
              )
            }
            className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Read Again</span>
          </button>

          <button
            onClick={pauseSpeaking}
            disabled={!isSpeaking}
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5" />
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          <button
            onClick={stopSpeaking}
            className="p-1.5 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
            title="Stop Speech"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-xs text-indigo-700 font-bold hover:underline flex items-center space-x-1 cursor-pointer"
        >
          <span>{speechRate}x Speed</span>
          {showSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Settings Drawer (Speech Rate, Volume, Voice Selector) */}
      {showSettings && (
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3 text-xs animate-fade-in">
          {/* Speed Slider */}
          <div>
            <div className="flex justify-between font-bold text-slate-700 mb-1">
              <span>Speech Speed</span>
              <span className="font-mono text-indigo-600">{speechRate}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={speechRate}
              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          {/* Volume Slider */}
          <div>
            <div className="flex justify-between font-bold text-slate-700 mb-1">
              <span>Volume</span>
              <span className="font-mono text-indigo-600">{Math.round(speechVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={speechVolume}
              onChange={(e) => setSpeechVolume(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          {/* Voice Dropdown */}
          {voices.length > 0 && (
            <div>
              <span className="font-bold text-slate-700 block mb-1">Synthesizer Voice</span>
              <select
                value={selectedVoice?.name || ''}
                onChange={(e) => {
                  const v = voices.find((voice) => voice.name === e.target.value);
                  if (v) setSelectedVoice(v);
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-600"
              >
                {voices.map((v, i) => (
                  <option key={i} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
