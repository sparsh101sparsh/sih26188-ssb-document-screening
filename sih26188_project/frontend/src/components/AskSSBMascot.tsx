import React, { useState } from 'react';
import { MessageSquare, X, Shield, HelpCircle, ChevronRight, CheckCircle2 } from 'lucide-react';
import { SSBCrestLogo } from './SSBCrestLogo';

export const AskSSBMascot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const faqs = [
    {
      q: 'How does 1:1 facial biometric matching work?',
      a: 'The system extracts the traveler portrait from the physical passport and matches it against the live camera capture using cosine embedding similarity.',
    },
    {
      q: 'What is Error Level Analysis (ELA)?',
      a: 'ELA identifies compression rate discrepancies in the digital image to highlight digital splicing, font alterations, and clone-stamp manipulations.',
    },
    {
      q: 'Is any traveler biometric data stored?',
      a: 'No. The system is strictly DPDP Act 2023 compliant. Biometrics are processed entirely in transient RAM and cryptographically zeroized immediately.',
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 select-none">
      {/* Mascot Dialog Bubble */}
      {isOpen && (
        <div className="mb-3 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-pop-in">
          {/* Dialog Header */}
          <div className="bg-gradient-to-r from-[#0F2750] to-[#1E3A8A] text-white p-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-amber-400/20 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-amber-300" />
              </div>
              <div>
                <h4 className="font-bold text-xs">Seema Sahayak (सीमा सहायक)</h4>
                <p className="text-[10px] text-amber-200/90 font-mono">SSB Automated Field Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick FAQ Options */}
          <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
            <p className="text-xs font-semibold text-slate-600">
              Welcome Officer. How can I assist you with document verification?
            </p>

            <div className="space-y-2">
              {faqs.map((faq, idx) => (
                <details key={idx} className="group bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 text-xs">
                  <summary className="font-bold text-slate-800 cursor-pointer list-none flex items-center justify-between">
                    <span>{faq.q}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-open:rotate-90 transition-transform flex-shrink-0 ml-2" />
                  </summary>
                  <p className="mt-2 text-slate-600 leading-relaxed border-t border-slate-200/60 pt-2 text-[11px]">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
              <span>MHA Screening Guide v2.4</span>
              <span className="text-emerald-600 font-bold flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Enclave Active</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Mascot Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2.5 bg-gradient-to-r from-[#18103C] to-[#1E3A8A] hover:from-[#0F2750] hover:to-[#172554] text-white pl-2 pr-4 py-2 rounded-full shadow-lg hover:shadow-xl border-2 border-amber-400/60 transition-all transform hover:-translate-y-1 group cursor-pointer"
      >
        <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center overflow-hidden shadow-inner">
          <div className="w-6 h-6 flex items-center justify-center">
            <SSBCrestLogo className="w-full h-full object-contain" />
          </div>
        </div>
        <div className="text-left">
          <span className="block text-[11px] font-extrabold text-amber-300 tracking-wide uppercase leading-tight">
            Ask SSB
          </span>
          <span className="block text-[9.5px] text-slate-300 font-medium">
            सीमा सहायक
          </span>
        </div>
      </button>
    </div>
  );
};
