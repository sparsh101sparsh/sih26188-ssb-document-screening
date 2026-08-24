import React, { useState, useEffect } from 'react';
import { Shield, Lock, FileCheck2, Cpu, CheckCircle2, ChevronRight, Pause, Play } from 'lucide-react';
import { CheckpointInfo } from '../types/api';

interface HeroCarouselProps {
  checkpoint: CheckpointInfo;
  onNavigateToScan: () => void;
  onNavigateToCompanion: () => void;
  onOpenSecurityProtocols?: () => void;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({
  checkpoint,
  onNavigateToScan,
  onNavigateToCompanion,
  onOpenSecurityProtocols,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const slides = [
    {
      title: 'AI-Powered Sovereign Border Document Screening',
      subtitle: 'Real-time ICAO 9303 MRZ verification, 1:1 facial biometric matching & neural tampering detection.',
      badge: 'OFFICIAL MHA DEFENSE TERMINAL',
      badgeColor: 'bg-indigo-900/90 text-amber-300 border-amber-400/40',
      actionLabel: 'Launch Screening Deck',
      actionFn: onNavigateToScan,
      bgGradient: 'from-[#0B1E3F] via-[#102B59] to-[#0A1832]',
      tagline: `Active at ${checkpoint.name} (${checkpoint.border})`,
    },
    {
      title: 'DPDP Act 2023 Compliant • Zero Biometric Retention',
      subtitle: 'Transient RAM-only tensor processing with automatic cryptographic zeroization upon verdict issuance.',
      badge: 'AIR-GAPPED COMPLIANCE ENCLAVE',
      badgeColor: 'bg-emerald-900/90 text-emerald-300 border-emerald-400/40',
      actionLabel: 'View Security Protocols',
      actionFn: () => {
        if (onOpenSecurityProtocols) onOpenSecurityProtocols();
        else onNavigateToScan();
      },
      bgGradient: 'from-[#062624] via-[#0E3D39] to-[#051C1A]',
      tagline: 'Cryptographic SHA-256 Audit Sealed on Local Ledger',
    },
    {
      title: 'Field Officer Mobile Terminal Live Sync Active',
      subtitle: 'Wirelessly pair Android Companion app for instant optical traveler photo and passport stream ingestion.',
      badge: 'WIRELESS FIELD SYNC',
      badgeColor: 'bg-amber-900/90 text-amber-300 border-amber-400/40',
      actionLabel: 'Connect Mobile Terminal',
      actionFn: onNavigateToCompanion,
      bgGradient: 'from-[#2A1806] via-[#45280B] to-[#1C1004]',
      tagline: 'Encrypted Offline UDP / Local HTTP Relay Protocol',
    },
  ];

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [isPlaying, slides.length]);

  const slide = slides[currentSlide];

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-md border border-slate-200/80 mb-6 select-none">
      {/* Background with subtle government pattern */}
      <div
        className={`bg-gradient-to-r ${slide.bgGradient} text-white p-6 sm:p-8 lg:p-10 transition-all duration-700 min-h-[220px] flex flex-col justify-between relative overflow-hidden`}
      >
        {/* Subtle Decorative Pattern Overlay */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex items-center space-x-2.5">
            <span
              className={`text-[10.5px] font-mono font-bold px-2.5 py-1 rounded-md border tracking-wider uppercase ${slide.badgeColor}`}
            >
              {slide.badge}
            </span>
            <span className="text-xs text-slate-300 font-medium">
              • {slide.tagline}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-tight">
            {slide.title}
          </h2>

          <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed">
            {slide.subtitle}
          </p>

          <div className="pt-2">
            <button
              onClick={slide.actionFn}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <span>{slide.actionLabel}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Carousel Pagination Controls matching UIDAI */}
        <div className="relative z-10 flex items-center justify-between pt-4 border-t border-white/10 mt-4">
          <div className="flex items-center space-x-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentSlide === idx ? 'w-8 bg-amber-400' : 'w-2 bg-white/40 hover:bg-white/60'
                }`}
                title={`Go to slide ${idx + 1}`}
              />
            ))}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="text-white/60 hover:text-white ml-2 p-1 transition-colors cursor-pointer"
              title={isPlaying ? 'Pause Carousel' : 'Play Carousel'}
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-300">
            Slide {currentSlide + 1} of {slides.length}
          </div>
        </div>
      </div>
    </div>
  );
};
