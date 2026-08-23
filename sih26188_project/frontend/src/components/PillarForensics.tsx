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
      <div className="flex flex-wrap items-center justify-between gap-2 bg-inset p-3 rounded-card border border-line">
        <div className="flex items-center space-x-2">
          <Microscope className="w-4 h-4 text-accent" />
          <span className="font-bold text-ink font-mono">
            Multi-Scale Pixel Forgery & Splicing Suite
          </span>
        </div>

        <span
          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-chip border ${
            !is_tampered
              ? 'bg-green-tint text-green border-green/40'
              : 'bg-red-tint text-red border-red/40'
          }`}
        >
          {!is_tampered ? 'ZERO TAMPERING DETECTED' : 'PIXEL FORGERY / SPLICING ALERT'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
        <div className="bg-inset p-2.5 rounded-control border border-line">
          <span className="text-ink-3 text-[10px] block">Continuous Tamper Score</span>
          <span
            className={`text-sm font-bold block mt-0.5 ${
              is_tampered ? 'text-red' : 'text-green'
            }`}
          >
            {formatPercent(tamper_score)}
          </span>
          <span className="text-[9px] text-ink-3 block">tau_adapt = 0.180</span>
        </div>

        <div className="bg-inset p-2.5 rounded-control border border-line">
          <span className="text-ink-3 text-[10px] block">Digital Text Tamper Detector</span>
          <span
            className={`text-sm font-bold block mt-0.5 ${
              doctamper_score >= 0.18 ? 'text-red' : 'text-ink-2'
            }`}
          >
            {formatPercent(doctamper_score)}
          </span>
          <span className="text-[9px] text-ink-3 block">Text Scraping / Inpainting</span>
        </div>

        <div className="bg-inset p-2.5 rounded-control border border-line">
          <span className="text-ink-3 text-[10px] block">Photo Splicing Localization</span>
          <span
            className={`text-sm font-bold block mt-0.5 ${
              trufor_score >= 0.18 ? 'text-red' : 'text-ink-2'
            }`}
          >
            {formatPercent(trufor_score)}
          </span>
          <span className="text-[9px] text-ink-3 block">Substrate Boundary Splicing</span>
        </div>

        <div className="bg-inset p-2.5 rounded-control border border-line">
          <span className="text-ink-3 text-[10px] block">Portrait Window Splicing</span>
          <span
            className={`text-xs font-bold block mt-1 ${
              photo_region_tampered ? 'text-red' : 'text-green'
            }`}
          >
            {photo_region_tampered ? 'SPLICED PHOTO' : 'PORTRAIT INTACT'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-inset p-3 rounded-card border border-line space-y-2">
          <div className="flex items-center justify-between border-b border-line pb-1.5">
            <span className="font-bold text-ink flex items-center gap-1.5 font-mono">
              <Layers className="w-3.5 h-3.5 text-accent" />
              Substrate Compression Analysis
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div>
              <span className="text-ink-3 block text-[10px]">Max Intensity Error:</span>
              <span className="font-bold text-ink">
                {ela_result ? ela_result.max_intensity.toFixed(1) : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-ink-3 block text-[10px]">Mean Error Level:</span>
              <span className="font-bold text-ink">
                {ela_result ? ela_result.mean_intensity.toFixed(1) : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-inset p-3 rounded-card border border-line space-y-2">
          <div className="flex items-center justify-between border-b border-line pb-1.5">
            <span className="font-bold text-ink flex items-center gap-1.5 font-mono">
              <FileSearch className="w-3.5 h-3.5 text-accent" />
              EXIF & JPEG Quantization (DQT)
            </span>
          </div>

          <div className="space-y-1 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-ink-3">Editing Software Traces:</span>
              <span className={exif_suspicious ? 'text-red font-bold' : 'text-green font-bold'}>
                {exif_suspicious ? 'SUSPICIOUS EXIF' : 'CLEAN (RAW CAPTURE)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-3">DQT Multi-Compression:</span>
              <span className={dqt_quantization_altered ? 'text-orange font-bold' : 'text-green font-bold'}>
                {dqt_quantization_altered ? 'NON-STANDARD DQT' : 'STANDARD'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {tampered_regions && tampered_regions.length > 0 && (
        <div className="bg-red-tint border border-red/40 p-3 rounded-card space-y-2">
          <span className="text-xs font-bold text-red block font-mono">
            Localized Anomaly Regions Detected ({tampered_regions.length}):
          </span>
          <div className="divide-y divide-red-800/40">
            {tampered_regions.map((reg, idx) => (
              <div key={idx} className="py-1 flex items-center justify-between font-mono text-[11px]">
                <span className="text-ink">
                  [{reg.bbox.join(', ')}] • {reg.tamper_type}
                </span>
                <span className="text-red font-bold">
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

export default PillarForensics;
