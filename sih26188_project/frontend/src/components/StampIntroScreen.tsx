import { useState, useEffect } from 'react';
import { SSBCrestLogo } from './SSBCrestLogo';

interface StampIntroScreenProps {
  onTransitionStart?: () => void;
  onComplete: () => void;
}

export function StampIntroScreen({ onTransitionStart, onComplete }: StampIntroScreenProps) {
  const [isReady, setIsReady] = useState(false);
  const [descending, setDescending] = useState(false);
  const [impacted, setImpacted] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('INITIALIZING AIR-GAPPED DEFENSE WORKSPACE...');
  const [sheenExit, setSheenExit] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Ensure DOM, fonts, and GPU webview are fully painted before starting countdown
    const initAnimation = async () => {
      try {
        if (typeof document !== 'undefined' && document.fonts) {
          await document.fonts.ready;
        }
      } catch {}

      // Dual rAF ensures first visual frame is committed to display buffer
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!isMounted) return;
          setIsReady(true);

          // 1. Slow, deliberate 3D descent begins at 200ms
          timers.push(setTimeout(() => {
            if (isMounted) setDescending(true);
          }, 200));

          // 2. Heavy Stamp Impact slams down at 1700ms
          timers.push(setTimeout(() => {
            if (isMounted) {
              setDescending(false);
              setImpacted(true);
              setLoadingProgress(25);
              setLoadingStatus('CALIBRATING NEURAL MODELS (SCRFD • ADAFACE • PP-OCR)...');
            }
          }, 1700));

          // 3. Progress Step 2 at 2800ms
          timers.push(setTimeout(() => {
            if (isMounted) {
              setLoadingProgress(65);
              setLoadingStatus('SECURING BIOMETRIC & VERHOEFF AUDIT ENCLAVE...');
            }
          }, 2800));

          // 4. Progress Step 3 at 3900ms
          timers.push(setTimeout(() => {
            if (isMounted) {
              setLoadingProgress(95);
              setLoadingStatus('WORKSTATION READY • INITIALIZING TERMINAL...');
            }
          }, 3900));

          // 5. Luxurious Sheen Sweep & Fadeout Transition begins at 4800ms
          timers.push(setTimeout(() => {
            if (isMounted) {
              setLoadingProgress(100);
              setSheenExit(true);
              setExiting(true);
              if (onTransitionStart) onTransitionStart();
            }
          }, 4800));

          // 6. Complete unmount and reveal workstation at 5700ms
          timers.push(setTimeout(() => {
            if (isMounted) onComplete();
          }, 5700));
        });
      });
    };

    initAnimation();

    return () => {
      isMounted = false;
      timers.forEach(clearTimeout);
    };
  }, [onTransitionStart, onComplete]);

  const handleSkip = () => {
    setLoadingProgress(100);
    setSheenExit(true);
    setExiting(true);
    if (onTransitionStart) onTransitionStart();
    setTimeout(onComplete, 450);
  };

  return (
    <div
      onClick={handleSkip}
      className={`stamp-splash-overlay fixed inset-0 z-[99999] flex flex-col items-center justify-center select-none cursor-pointer ${
        exiting ? 'exiting' : ''
      }`}
      style={{ opacity: isReady ? 1 : 0.99 }}
    >
      {/* Radiant Sunburst Rays */}
      <svg
        className={`splash-rays ${impacted ? 'active' : ''}`}
        viewBox="0 0 500 500"
      >
        <g stroke="#F3CE63" strokeWidth="1.5" strokeDasharray="3 6" opacity="0.65">
          <line x1="250" y1="20" x2="250" y2="480"/>
          <line x1="20" y1="250" x2="480" y2="250"/>
          <line x1="87" y1="87" x2="413" y2="413"/>
          <line x1="87" y1="413" x2="413" y2="87"/>
          <line x1="140" y1="40" x2="360" y2="460"/>
          <line x1="360" y1="40" x2="140" y2="460"/>
          <line x1="40" y1="140" x2="460" y2="360"/>
          <line x1="40" y1="360" x2="460" y2="140"/>
        </g>
      </svg>

      {/* Ambient Warm Amber Glow Core */}
      <div className={`ambient-glow ${impacted ? 'active' : ''}`} />

      {/* Triple Slow-Mo Concentric Golden Shockwave Rings */}
      <div className={`shockwave-ring ${impacted ? 'trigger' : ''}`} />
      <div className={`shockwave-ring shockwave-ring-2 ${impacted ? 'trigger' : ''}`} />
      <div className={`shockwave-ring shockwave-ring-3 ${impacted ? 'trigger' : ''}`} />

      {/* Stamp Crest Container */}
      <div
        className={`stamp-logo-box ${
          sheenExit
            ? 'impact sheen-exit'
            : impacted
            ? 'impact'
            : descending
            ? 'descending'
            : ''
        }`}
      >
        <SSBCrestLogo className="w-full h-full object-contain pointer-events-none" />
      </div>

      {/* Inscription Titles */}
      <div className={`stamp-details ${impacted ? 'show' : ''}`}>
        <h1 className="stamp-title">SASHASTRA SEEMA BAL</h1>
        <p className="stamp-motto">सशस्त्र सीमा बल • सेवा • सुरक्षा • बन्धुत्व</p>
        <div className="stamp-badge">OFFICIAL DEFENSE & IMMIGRATION SCREENING TERMINAL</div>

        {/* Dynamic Defense Loading Telemetry Bar */}
        <div className="mt-5 flex flex-col items-center w-72 max-w-xs mx-auto">
          <div className="w-full bg-[#0B1E3B] h-1.5 rounded-full overflow-hidden border border-[#D4AF37]/30 shadow-[0_0_12px_rgba(212,175,55,0.25)] relative">
            <div
              className="h-full bg-gradient-to-r from-[#D4AF37] via-[#FFDF73] to-[#F3CE63] rounded-full transition-all duration-700 ease-out relative"
              style={{ width: `${Math.max(loadingProgress, impacted ? 15 : 0)}%` }}
            >
              <div className="absolute inset-0 bg-white/30 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center space-x-2 mt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FFDF73] animate-ping" />
            <span className="text-[10px] font-mono text-[#FDE68A] tracking-wider uppercase font-semibold">
              {loadingStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Slow-Motion 6.0s Keyframes */}
      <style>{`
        .stamp-splash-overlay {
          background: radial-gradient(circle at 50% 46%, #0F2750 0%, #06152D 50%, #020814 100%);
          will-change: opacity, transform, filter;
          transition: opacity 1.1s cubic-bezier(0.4, 0, 0.2, 1), 
                      transform 1.1s cubic-bezier(0.4, 0, 0.2, 1),
                      filter 1.1s ease-out;
        }

        .stamp-splash-overlay.exiting {
          opacity: 0;
          transform: translate3d(0, 0, 0) scale(1.08);
          filter: blur(6px) brightness(1.2);
          pointer-events: none;
        }

        .splash-rays {
          position: absolute;
          width: 800px;
          height: 800px;
          border-radius: 50%;
          opacity: 0;
          transform: translate3d(0,0,0) scale(0.2) rotate(0deg);
          transition: opacity 2.2s ease-out, transform 3.0s cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: none;
        }

        .splash-rays.active {
          opacity: 0.45;
          transform: translate3d(0,0,0) scale(1.35) rotate(40deg);
        }

        .ambient-glow {
          position: absolute;
          width: 620px;
          height: 620px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 223, 109, 0.35) 0%, rgba(212, 175, 55, 0.12) 45%, transparent 70%);
          transform: translate3d(0,0,0) scale(0.3);
          opacity: 0;
          will-change: transform, opacity;
          transition: transform 2.0s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.5s ease-out;
          pointer-events: none;
        }

        .ambient-glow.active {
          transform: translate3d(0,0,0) scale(1.7);
          opacity: 1;
        }

        .shockwave-ring {
          position: absolute;
          width: 250px;
          height: 250px;
          border-radius: 50%;
          border: 2.5px solid rgba(255, 223, 115, 0.95);
          box-shadow: 0 0 35px rgba(255, 223, 115, 0.7);
          opacity: 0;
          will-change: transform, opacity;
          pointer-events: none;
        }

        .shockwave-ring.trigger {
          animation: shockwaveExpand 2.2s cubic-bezier(0.1, 0.8, 0.2, 1) forwards;
        }

        .shockwave-ring-2.trigger {
          animation: shockwaveExpand 2.6s cubic-bezier(0.1, 0.8, 0.2, 1) 0.3s forwards;
        }

        .shockwave-ring-3.trigger {
          animation: shockwaveExpand 3.0s cubic-bezier(0.1, 0.8, 0.2, 1) 0.6s forwards;
        }

        @keyframes shockwaveExpand {
          0% {
            transform: translate3d(0,0,0) scale(0.35);
            opacity: 1;
          }
          100% {
            transform: translate3d(0,0,0) scale(5.0);
            opacity: 0;
          }
        }

        .stamp-logo-box {
          position: relative;
          width: 290px;
          height: 365px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: translate3d(0, -120px, 0) scale(3.4) rotate(-16deg);
          opacity: 0.1;
          filter: blur(5px) drop-shadow(0 50px 70px rgba(0,0,0,0.9));
          will-change: transform, opacity, filter;
          transition: transform 1.6s cubic-bezier(0.18, 0.9, 0.3, 1.22), 
                      opacity 1.4s ease-out, 
                      filter 1.4s ease-out;
        }

        .stamp-logo-box.descending {
          transform: translate3d(0, -35px, 0) scale(2.0) rotate(-5deg);
          opacity: 0.75;
          filter: blur(1.5px) drop-shadow(0 30px 50px rgba(0,0,0,0.7));
        }

        .stamp-logo-box.impact {
          transform: translate3d(0, 0, 0) scale(1.0) rotate(0deg);
          opacity: 1;
          filter: blur(0px) drop-shadow(0 20px 45px rgba(212, 175, 55, 0.6));
        }

        .stamp-logo-box.sheen-exit {
          animation: goldenSheenFlash 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes goldenSheenFlash {
          0% { filter: drop-shadow(0 0 10px rgba(255,223,109,0.5)); transform: scale(1.0); }
          50% { filter: drop-shadow(0 0 40px rgba(255,243,184,1.0)) brightness(1.28); transform: scale(1.05); }
          100% { filter: drop-shadow(0 0 10px rgba(255,223,109,0.2)); transform: scale(1.08); }
        }

        .stamp-details {
          margin-top: 24px;
          text-align: center;
          opacity: 0;
          transform: translate3d(0, 24px, 0);
          will-change: opacity, transform;
          transition: opacity 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0.3s, 
                      transform 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0.3s;
        }

        .stamp-details.show {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }

        .stamp-title {
          font-family: 'Cinzel', 'Times New Roman', serif;
          font-size: 2.15rem;
          font-weight: 900;
          letter-spacing: 4px;
          background: linear-gradient(135deg, #FFF6C4 0%, #F3CE63 40%, #C5962B 70%, #916A16 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: 0 0 35px rgba(226, 184, 66, 0.5);
        }

        .stamp-motto {
          margin-top: 8px;
          font-size: 1.05rem;
          font-weight: 600;
          letter-spacing: 3px;
          color: #FFDF73;
          text-shadow: 0 2px 12px rgba(0,0,0,0.6);
        }

        .stamp-badge {
          margin-top: 12px;
          display: inline-block;
          font-family: monospace;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 2px;
          color: #94A3B8;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(212, 175, 55, 0.3);
          padding: 6px 16px;
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
}
