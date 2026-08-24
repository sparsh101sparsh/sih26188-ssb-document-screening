import React from 'react';
import { ShieldCheck, Lock, ExternalLink, Globe } from 'lucide-react';
import { SSBCrestLogo } from './SSBCrestLogo';

export const GovFooter: React.FC = () => {
  return (
    <footer className="bg-[#0F172A] text-slate-400 text-xs border-t border-slate-800 mt-16 select-none">
      {/* Top Links Bar */}
      <div className="max-w-[1700px] mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-4 gap-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-8 h-10 flex items-center justify-center">
              <SSBCrestLogo className="w-full h-full object-contain filter drop-shadow-sm" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">सशस्त्र सीमा बल</h4>
              <p className="text-[10px] text-amber-400/90 font-semibold tracking-wider">SASHASTRA SEEMA BAL</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Specialized Border Guarding Force of India under the Ministry of Home Affairs, safeguarding Indo-Nepal and Indo-Bhutan borders.
          </p>
        </div>

        <div>
          <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Government Portals</h5>
          <ul className="space-y-1.5 text-[11px]">
            <li><a href="https://www.india.gov.in" target="_blank" rel="noreferrer" className="hover:text-amber-300 transition-colors flex items-center space-x-1"><span>National Portal of India</span> <ExternalLink className="w-2.5 h-2.5" /></a></li>
            <li><a href="https://www.mha.gov.in" target="_blank" rel="noreferrer" className="hover:text-amber-300 transition-colors flex items-center space-x-1"><span>Ministry of Home Affairs</span> <ExternalLink className="w-2.5 h-2.5" /></a></li>
            <li><a href="https://uidai.gov.in" target="_blank" rel="noreferrer" className="hover:text-amber-300 transition-colors flex items-center space-x-1"><span>UIDAI Official Portal</span> <ExternalLink className="w-2.5 h-2.5" /></a></li>
            <li><a href="https://ssb.gov.in" target="_blank" rel="noreferrer" className="hover:text-amber-300 transition-colors flex items-center space-x-1"><span>SSB Official Portal</span> <ExternalLink className="w-2.5 h-2.5" /></a></li>
          </ul>
        </div>

        <div>
          <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Compliance & Security</h5>
          <ul className="space-y-1.5 text-[11px]">
            <li className="flex items-center space-x-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>DPDP Act 2023 Compliant</span>
            </li>
            <li className="flex items-center space-x-1 text-amber-400">
              <Lock className="w-3.5 h-3.5" />
              <span>Air-Gapped Local Inference</span>
            </li>
            <li className="text-slate-400">Zero Permanent Biometric Storage</li>
            <li className="text-slate-400">SHA-256 Tamper Audit Trails</li>
          </ul>
        </div>

        <div>
          <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Operational Support</h5>
          <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
            Air-Gapped screening terminal operational 24x7 at designated Land Customs Stations (LCS) & Integrated Check Posts (ICP).
          </p>
          <span className="inline-block text-[10px] font-mono bg-slate-800/80 text-amber-300 border border-slate-700 px-2.5 py-1 rounded">
            TERMINAL BUILD: 2026.08-SSB-PROD
          </span>
        </div>
      </div>

      {/* Bottom Copyright Strip */}
      <div className="max-w-[1700px] mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <div>
          © 2026 Sashastra Seema Bal (SSB), Ministry of Home Affairs, Government of India. All Rights Reserved.
        </div>
        <div className="flex items-center space-x-4 text-slate-400">
          <span>Website Policy</span>
          <span>•</span>
          <span>Terms & Conditions</span>
          <span>•</span>
          <span>Privacy Enclave</span>
        </div>
      </div>
    </footer>
  );
};
