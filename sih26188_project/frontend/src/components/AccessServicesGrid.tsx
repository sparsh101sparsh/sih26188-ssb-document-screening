import React from 'react';
import {
  FileText,
  ScanFace,
  ShieldAlert,
  Smartphone,
  ArrowRight,
  Sparkles,
  Lock,
  Layers,
} from 'lucide-react';

interface AccessServicesGridProps {
  onSelectService: (serviceId: string) => void;
}

export const AccessServicesGrid: React.FC<AccessServicesGridProps> = ({ onSelectService }) => {
  const services = [
    {
      id: 'scan-passport',
      title: 'Scan & Inspect Passport',
      desc: 'Verify ICAO 9303 MRZ checksums, biometric extraction & optical validation.',
      icon: FileText,
      badge: 'Instant OCR',
      badgeColor: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    },
    {
      id: 'facial-match',
      title: '1:1 Biometric Face Match',
      desc: 'Compare live traveler optical portrait with passport chip photograph in real-time.',
      icon: ScanFace,
      badge: '1:1 Biometrics',
      badgeColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    },
    {
      id: 'tamper-check',
      title: 'Neural Tamper & ELA Check',
      desc: 'Detect Error Level Analysis anomalies, font splicing, copy-move & face morphing.',
      icon: ShieldAlert,
      badge: 'Forensic AI',
      badgeColor: 'text-amber-600 bg-amber-50 border-amber-200',
    },
    {
      id: 'companion-sync',
      title: 'Android Companion Sync',
      desc: 'Wirelessly stream field camera captures directly from officer mobile handhelds.',
      icon: Smartphone,
      badge: 'Real-Time',
      badgeColor: 'text-sky-600 bg-sky-50 border-sky-200',
    },
  ];

  return (
    <div className="bg-[#EDF2F7]/90 rounded-2xl p-6 sm:p-8 border border-slate-200/90 mb-8 relative overflow-hidden shadow-xs select-none">
      {/* Subtle Geometric Background Pattern (Direct match to UIDAI background) */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#1E3A8A 1.5px, transparent 1.5px), radial-gradient(#1E3A8A 1.5px, #EDF2F7 1.5px)`,
          backgroundSize: '30px 30px',
          backgroundPosition: '0 0, 15px 15px',
        }}
      />

      {/* Section Header with "View All Services" */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-black text-slate-900 tracking-tight">
            Access SSB Screening Services
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Select an official border verification utility to initialize screening bay
          </p>
        </div>

        <button
          onClick={() => onSelectService('all')}
          className="inline-flex items-center space-x-2 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-50/80 px-4 py-2 rounded-full border border-indigo-200/80 shadow-2xs transition-all group cursor-pointer"
        >
          <span>View All Screening Tools</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* 4 Clean White Rounded Cards Grid */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map((srv) => {
          const Icon = srv.icon;
          return (
            <div
              key={srv.id}
              onClick={() => onSelectService(srv.id)}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all duration-300 flex flex-col justify-between group cursor-pointer transform hover:-translate-y-1"
            >
              <div>
                {/* Top Row: Icon & Tag */}
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50/80 group-hover:bg-indigo-100/90 text-indigo-700 flex items-center justify-center transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${srv.badgeColor}`}>
                    {srv.badge}
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
                  {srv.title}
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed line-clamp-2">
                  {srv.desc}
                </p>
              </div>

              {/* Bottom Action: Circular Arrow Button matching UIDAI */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 group-hover:text-indigo-600 transition-colors">
                  Open Service
                </span>
                <div className="w-7 h-7 rounded-full border border-slate-200 group-hover:border-indigo-600 group-hover:bg-indigo-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-all">
                  <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
