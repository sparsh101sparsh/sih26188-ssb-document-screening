import React from 'react';
import { Microscope, FileSearch, Layers } from 'lucide-react';
import { ForensicsResult } from '../types/api';
import { formatPercent } from '../utils/formatting';

interface PillarForensicsProps {
  forensics: ForensicsResult;
}

export const PillarForensics: React.FC<PillarForensicsProps> = ({ forensics }) => {
  const {
    tamper_score,
    is_tampered,
    photo_region_tampered,
    doctamper_score,
    trufor_score,
    ela_result,
    exif_suspicious,
    dqt_quantization_altered,
    tampered_regions,
  } = forensics;

  return (
    <div className="space-y-3 text-xs font-sans">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 p-3 rounded-[8px] border border-slate-800">
        <div className="flex items-center space-x-2">
          <Microscope className="w-4 h-4 text-purple-400" />
          <span className="font-bold text-slate-200">
            Multi-Scale Pixel Forgery & Splicing Suite
          </span>
        </div>

        <span
          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-[4px] border ${
            !is_tampered
              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
              : 'bg-red-950 text-red-300 border-red-800 animate-pulse'
          }`}
        >
          {!is_tampered ? 'ZERO TAMPERING DETECTED' : 'PIXEL FORGERY / SPLICING ALERT'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
        <div className="bg-slate-950 p-2.5 rounded-[8px] border border-slate-800">
          <span className="text-slate-400 text-[10px] block">Continuous Tamper Score</span>
          <span
            className={`text-sm font-bold block mt-0.5 ${
              is_tampered ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {formatPercent(tamper_score)}
          </span>
          <span className="text-[9px] text-slate-500 block">tau_adapt = 0.180</span>
        </div>

        <div className="bg-slate-950 p-2.5 rounded-[8px] border border-slate-800">
          <span className="text-slate-400 text-[10px] block">DocTamper ResNet-50</span>
          <span
            className={`text-sm font-bold block mt-0.5 ${
              doctamper_score >= 0.18 ? 'text-red-400' : 'text-slate-300'
            }`}
          >
            {formatPercent(doctamper_score)}
          </span>
          <span className="text-[9px] text-slate-500 block">Text Scraping / Inpainting</span>
        </div>

        <div className="bg-slate-950 p-2.5 rounded-[8px] border border-slate-800">
          <span className="text-slate-400 text-[10px] block">TruFor SegFormer-B0</span>
          <span
            className={`text-sm font-bold block mt-0.5 ${
              trufor_score >= 0.18 ? 'text-red-400' : 'text-slate-300'
            }`}
          >
            {formatPercent(trufor_score)}
          </span>
          <span className="text-[9px] text-slate-500 block">Noiseprint++ Splicing</span>
        </div>

        <div className="bg-slate-950 p-2.5 rounded-[8px] border border-slate-800">
          <span className="text-slate-400 text-[10px] block">Portrait Window Splicing</span>
          <span
            className={`text-xs font-bold block mt-1 ${
              photo_region_tampered ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {photo_region_tampered ? 'SPLICED PHOTO' : 'PORTRAIT INTACT'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-slate-950 p-3 rounded-[8px] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              Classical ELA (Q90 x20 Error)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div>
              <span className="text-slate-500 block text-[10px]">Max Intensity Error:</span>
              <span className="font-bold text-slate-200">
                {ela_result ? ela_result.max_intensity.toFixed(1) : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Mean Error Level:</span>
              <span className="font-bold text-slate-200">
                {ela_result ? ela_result.mean_intensity.toFixed(1) : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-950 p-3 rounded-[8px] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <FileSearch className="w-3.5 h-3.5 text-indigo-400" />
              EXIF & JPEG Quantization (DQT)
            </span>
          </div>

          <div className="space-y-1 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Editing Software Traces:</span>
              <span className={exif_suspicious ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                {exif_suspicious ? 'SUSPICIOUS EXIF' : 'CLEAN (RAW CAPTURE)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">DQT Multi-Compression:</span>
              <span className={dqt_quantization_altered ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                {dqt_quantization_altered ? 'NON-STANDARD DQT' : 'STANDARD'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {tampered_regions && tampered_regions.length > 0 && (
        <div className="bg-red-950 border border-red-800 p-3 rounded-[8px] space-y-2">
          <span className="text-xs font-bold text-red-300 block">
            Localized Anomaly Regions Detected ({tampered_regions.length}):
          </span>
          <div className="divide-y divide-red-900">
            {tampered_regions.map((reg, idx) => (
              <div key={idx} className="py-1 flex items-center justify-between font-mono text-[11px]">
                <span className="text-red-200">
                  [{reg.bbox.join(', ')}] • {reg.tamper_type}
                </span>
                <span className="text-red-400 font-bold">
                  Peak Anomaly: {formatPercent(reg.peak_tamper_probability)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
