import React, { useState, useRef, useEffect } from 'react';
import { Eye, Sliders, Columns, ZoomIn, ZoomOut, RotateCcw, ShieldCheck } from 'lucide-react';
import { ForensicsResult, StampResult } from '../types/api';

interface ForensicsViewerProps {
  documentImageUrl: string;
  heatmapImageUrl?: string | null;
  forensics: ForensicsResult;
  stamp?: StampResult | null;
}

const sanitizeImageUrl = (url?: string | null): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  // Auto-detect and prepend data scheme for raw base64 strings
  return `data:image/png;base64,${trimmed}`;
};

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

  const sanitizedDocUrl = sanitizeImageUrl(documentImageUrl) || documentImageUrl;
  const sanitizedHeatmapUrl = sanitizeImageUrl(heatmapImageUrl);

  useEffect(() => {
    if (viewMode !== 'slider') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const baseImg = new Image();
    baseImg.crossOrigin = 'anonymous';
    baseImg.src = sanitizedDocUrl;

    baseImg.onload = () => {
      canvas.width = baseImg.naturalWidth || 600;
      canvas.height = baseImg.naturalHeight || 400;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(baseImg, 0, 0);

      if (sanitizedHeatmapUrl && blendOpacity > 0) {
        const heatImg = new Image();
        heatImg.crossOrigin = 'anonymous';
        heatImg.src = sanitizedHeatmapUrl;
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
  }, [sanitizedDocUrl, sanitizedHeatmapUrl, blendOpacity, showBoundingBoxes, viewMode, forensics, stamp]);

  const renderBoxes = (ctx: CanvasRenderingContext2D) => {
    if (forensics.tampered_regions && forensics.tampered_regions.length > 0) {
      for (const region of forensics.tampered_regions) {
        const [x1, y1, x2, y2] = region.bbox;
        ctx.save();
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        ctx.fillStyle = '#EF4444';
        ctx.fillRect(x1, Math.max(0, y1 - 22), (x2 - x1) > 120 ? (x2 - x1) : 140, 22);
        ctx.fillStyle = '#F8FAFC';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`TAMPER: ${(region.peak_tamper_probability * 100).toFixed(0)}%`, x1 + 4, Math.max(15, y1 - 6));
        ctx.restore();
      }
    }

    if (stamp?.stamp_bbox) {
      const [sx1, sy1, sx2, sy2] = stamp.stamp_bbox;
      ctx.save();
      ctx.strokeStyle = stamp.verdict === 'AUTHENTIC' ? '#10B981' : '#F59E0B';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(sx1, sy1, sx2 - sx1, sy2 - sy1);

      ctx.fillStyle = stamp.verdict === 'AUTHENTIC' ? '#10B981' : '#F59E0B';
      ctx.fillRect(sx1, Math.max(0, sy1 - 20), 120, 20);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(`STAMP: ${stamp.verdict}`, sx1 + 4, Math.max(14, sy1 - 5));
      ctx.restore();
    }
  };

  return (
    <div
      className="bg-surface border border-line rounded-card p-4 space-y-3 shadow-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex items-center space-x-2">
          <Eye className="w-4 h-4 text-accent" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink font-mono">
            Dual-Canvas Visual Forensics & Heatmap Compositor
          </h3>
        </div>

        <div className="flex items-center flex-wrap gap-2 text-xs">
          <div className="flex bg-inset p-0.5 rounded-control border border-line">
            <button
              type="button"
              onClick={() => setViewMode('slider')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-chip text-[11px] font-medium transition-colors ${
                viewMode === 'slider'
                  ? 'bg-accent text-white shadow-btn'
                  : 'text-ink-2 hover:text-ink'
              }`}
            >
              <Sliders className="w-3 h-3" />
              <span>Opacity Slider</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('side-by-side')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-chip text-[11px] font-medium transition-colors ${
                viewMode === 'side-by-side'
                  ? 'bg-accent text-white shadow-btn'
                  : 'text-ink-2 hover:text-ink'
              }`}
            >
              <Columns className="w-3 h-3" />
              <span>Side-by-Side</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
            className={`px-2.5 py-1 rounded-control border text-[11px] font-mono transition-colors shadow-btn ${
              showBoundingBoxes
                ? 'bg-accent-tint border-accent/40 text-accent font-semibold'
                : 'bg-inset border-line text-ink-3'
            }`}
          >
            B-Boxes: {showBoundingBoxes ? 'ON' : 'OFF'}
          </button>

          <div className="flex items-center space-x-1 bg-inset px-1 py-0.5 rounded-control border border-line shadow-btn">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.15))}
              className="p-1 hover:text-ink text-ink-3"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-ink px-1">
              {(zoomLevel * 100).toFixed(0)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(2.0, z + 0.15))}
              className="p-1 hover:text-ink text-ink-3"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1.0)}
              className="p-1 hover:text-ink text-ink-3 border-l border-line ml-0.5"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'slider' && (
        <div className="flex items-center space-x-3 bg-inset px-3 py-2 rounded-control border border-line text-xs">
          <span className="text-ink-3 text-[11px] font-mono whitespace-nowrap">
            Original (0%)
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={blendOpacity}
            onChange={(e) => setBlendOpacity(parseFloat(e.target.value))}
            className="w-full accent-accent cursor-pointer h-1.5 bg-surface rounded-lg"
          />
          <span className="text-ink-2 text-[11px] font-mono whitespace-nowrap">
            Heatmap ({(blendOpacity * 100).toFixed(0)}%)
          </span>
        </div>
      )}

      <div
        ref={containerRef}
        className="relative bg-canvas rounded-card border border-line p-3 min-h-[300px] flex items-center justify-center overflow-auto max-h-[500px]"
      >
        {viewMode === 'slider' ? (
          <div
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
            className="transition-transform duration-150 flex justify-center"
          >
            <canvas ref={canvasRef} className="max-w-full rounded-control border border-line shadow-card" />
          </div>
        ) : (
          <div
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
            className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full transition-transform duration-150"
          >
            <div className="flex flex-col items-center bg-surface p-2 rounded-control border border-line shadow-card">
              <span className="text-[10px] font-mono text-ink-3 uppercase mb-1">
                High-Res Document Scan
              </span>
              <img
                src={sanitizedDocUrl}
                alt="Original Document"
                className="max-h-[320px] max-w-full object-contain rounded-chip"
              />
            </div>

            <div className="flex flex-col items-center bg-surface p-2 rounded-control border border-line shadow-card">
              <span className="text-[10px] font-mono text-ink-3 uppercase mb-1">
                Tamper Check Heatmap
              </span>
              {sanitizedHeatmapUrl ? (
                <img
                  src={sanitizedHeatmapUrl}
                  alt="Heatmap"
                  className="max-h-[320px] max-w-full object-contain rounded-chip"
                />
              ) : (
                <div className="h-[240px] flex flex-col items-center justify-center text-center p-4 text-ink-3 text-xs font-mono">
                  <ShieldCheck className="w-8 h-8 text-green mb-2" />
                  <span>Zero pixel tampering detected. Substrate nominal.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-inset px-3 py-2 rounded-control border border-line flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono">
        <div className="flex items-center space-x-2">
          <span className="text-ink-3 text-[10px] uppercase font-bold">Colormap:</span>
          <div
            className="w-48 h-2.5 rounded-full border border-line"
            style={{
              background:
                'linear-gradient(to right, #30123b, #4662d8, #1ae4b6, #a2fc3c, #faba39, #e23e1a, #7a0403)',
            }}
          />
        </div>

        <div className="flex items-center space-x-3 text-ink-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-accent" /> 0.00 (Clean)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green" /> 0.18 (Tamper Threshold)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red" /> 1.00 (Critical Forgery)
          </span>
        </div>
      </div>
    </div>
  );
};

export default ForensicsViewer;
