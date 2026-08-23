import React, { useState, useRef, useEffect } from 'react';
import { Eye, Sliders, Columns, ZoomIn, ZoomOut, RotateCcw, ShieldCheck } from 'lucide-react';
import { ForensicsResult, StampResult } from '../types/api';

interface ForensicsViewerProps {
  documentImageUrl: string;
  heatmapImageUrl?: string | null;
  forensics: ForensicsResult;
  stamp?: StampResult | null;
}

export const ForensicsViewer: React.FC<ForensicsViewerProps> = ({
  documentImageUrl,
  heatmapImageUrl,
  forensics,
  stamp,
}) => {
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side'>('slider');
  const [blendOpacity, setBlendOpacity] = useState<number>(0.55);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewMode !== 'slider') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const baseImg = new Image();
    baseImg.crossOrigin = 'anonymous';
    baseImg.src = documentImageUrl;

    baseImg.onload = () => {
      canvas.width = baseImg.naturalWidth || 600;
      canvas.height = baseImg.naturalHeight || 400;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(baseImg, 0, 0);

      if (heatmapImageUrl && blendOpacity > 0) {
        const heatImg = new Image();
        heatImg.crossOrigin = 'anonymous';
        heatImg.src = heatmapImageUrl;
        heatImg.onload = () => {
          ctx.save();
          ctx.globalAlpha = blendOpacity;
          ctx.drawImage(heatImg, 0, 0, canvas.width, canvas.height);
          ctx.restore();

          if (showBoundingBoxes) {
            renderBoxes(ctx);
          }
        };
      } else if (showBoundingBoxes) {
        renderBoxes(ctx);
      }
    };
  }, [documentImageUrl, heatmapImageUrl, blendOpacity, showBoundingBoxes, viewMode, forensics, stamp]);

  const renderBoxes = (ctx: CanvasRenderingContext2D) => {
    if (forensics.tampered_regions && forensics.tampered_regions.length > 0) {
      for (const region of forensics.tampered_regions) {
        const [x1, y1, x2, y2] = region.bbox;
        ctx.save();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x1, Math.max(0, y1 - 22), (x2 - x1) > 120 ? (x2 - x1) : 140, 22);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`TAMPER: ${(region.peak_tamper_probability * 100).toFixed(0)}%`, x1 + 4, Math.max(15, y1 - 6));
        ctx.restore();
      }
    }

    if (stamp?.stamp_bbox) {
      const [sx1, sy1, sx2, sy2] = stamp.stamp_bbox;
      ctx.save();
      ctx.strokeStyle = stamp.verdict === 'AUTHENTIC' ? '#10b981' : '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(sx1, sy1, sx2 - sx1, sy2 - sy1);

      ctx.fillStyle = stamp.verdict === 'AUTHENTIC' ? '#10b981' : '#f59e0b';
      ctx.fillRect(sx1, Math.max(0, sy1 - 20), 120, 20);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(`STAMP: ${stamp.verdict}`, sx1 + 4, Math.max(14, sy1 - 5));
      ctx.restore();
    }
  };

  return (
    <div
      className="bg-slate-900 border border-slate-800 rounded-[12px] p-4 space-y-3"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Eye className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Dual-Canvas Visual Forensics & Heatmap Compositor
          </h3>
        </div>

        <div className="flex items-center flex-wrap gap-2 text-xs">
          <div className="flex bg-slate-950 p-0.5 rounded-[6px] border border-slate-800">
            <button
              onClick={() => setViewMode('slider')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-[4px] text-[11px] font-medium transition-colors ${
                viewMode === 'slider'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3 h-3" />
              <span>Opacity Slider</span>
            </button>
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-[4px] text-[11px] font-medium transition-colors ${
                viewMode === 'side-by-side'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Columns className="w-3 h-3" />
              <span>Side-by-Side</span>
            </button>
          </div>

          <button
            onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
            className={`px-2.5 py-1 rounded-[6px] border text-[11px] font-mono transition-colors ${
              showBoundingBoxes
                ? 'bg-blue-950 border-blue-800 text-blue-300'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            B-Boxes: {showBoundingBoxes ? 'ON' : 'OFF'}
          </button>

          <div className="flex items-center space-x-1 bg-slate-950 px-1 py-0.5 rounded-[6px] border border-slate-800">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.15))}
              className="p-1 hover:text-white text-slate-400"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-300 px-1">
              {(zoomLevel * 100).toFixed(0)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.0, z + 0.15))}
              className="p-1 hover:text-white text-slate-400"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1.0)}
              className="p-1 hover:text-white text-slate-400 border-l border-slate-800 ml-0.5"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'slider' && (
        <div className="flex items-center space-x-3 bg-slate-950 px-3 py-2 rounded-[8px] border border-slate-800 text-xs">
          <span className="text-slate-400 text-[11px] font-mono whitespace-nowrap">
            Original (0%)
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={blendOpacity}
            onChange={(e) => setBlendOpacity(parseFloat(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <span className="text-slate-400 text-[11px] font-mono whitespace-nowrap">
            Heatmap ({(blendOpacity * 100).toFixed(0)}%)
          </span>
        </div>
      )}

      <div
        ref={containerRef}
        className="relative bg-slate-950 rounded-[8px] border border-slate-800 p-3 min-h-[300px] flex items-center justify-center overflow-auto max-h-[500px]"
      >
        {viewMode === 'slider' ? (
          <div
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
            className="transition-transform duration-150 flex justify-center"
          >
            <canvas ref={canvasRef} className="max-w-full rounded-[6px]" />
          </div>
        ) : (
          <div
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
            className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full transition-transform duration-150"
          >
            <div className="flex flex-col items-center bg-slate-900 p-2 rounded-[8px] border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase mb-1">
                Raw 300 DPI Document
              </span>
              <img
                src={documentImageUrl}
                alt="Original Document"
                className="max-h-[320px] max-w-full object-contain rounded-[4px]"
              />
            </div>

            <div className="flex flex-col items-center bg-slate-900 p-2 rounded-[8px] border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase mb-1">
                DocTamper & TruFor Heatmap
              </span>
              {heatmapImageUrl ? (
                <img
                  src={heatmapImageUrl}
                  alt="Heatmap"
                  className="max-h-[320px] max-w-full object-contain rounded-[4px]"
                />
              ) : (
                <div className="h-[240px] flex flex-col items-center justify-center text-center p-4 text-slate-500 text-xs">
                  <ShieldCheck className="w-8 h-8 text-emerald-400 mb-2" />
                  <span>Zero pixel tampering detected. Substrate nominal.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-950 px-3 py-2 rounded-[8px] border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono">
        <div className="flex items-center space-x-2">
          <span className="text-slate-400 text-[10px] uppercase font-bold">Colormap:</span>
          <div
            className="w-48 h-2.5 rounded-full border border-slate-700"
            style={{
              background:
                'linear-gradient(to right, #30123b, #4662d8, #1ae4b6, #a2fc3c, #faba39, #e23e1a, #7a0403)',
            }}
          />
        </div>

        <div className="flex items-center space-x-3 text-slate-400 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-600" /> 0.00 (Clean)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> 0.18 (Tau Adaptive)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-600" /> 1.00 (Critical Forgery)
          </span>
        </div>
      </div>
    </div>
  );
};
