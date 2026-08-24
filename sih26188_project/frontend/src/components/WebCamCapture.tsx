import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, Upload, Smartphone, CheckCircle2, User, X, ScanFace, Sparkles, RefreshCw } from 'lucide-react';

interface WebCamCaptureProps {
  livePhotoFile: File | null;
  livePhotoPreviewUrl: string | null;
  onCaptureFace: (file: File, previewUrl: string) => void;
  onClearFace: () => void;
  disabled?: boolean;
  isCompanionConnected?: boolean;
  receivedFromCompanion?: boolean;
  onOpenConnectModal?: () => void;
}

export const WebCamCapture: React.FC<WebCamCaptureProps> = ({
  livePhotoFile,
  livePhotoPreviewUrl,
  onCaptureFace,
  onClearFace,
  disabled = false,
  isCompanionConnected = false,
  receivedFromCompanion = false,
  onOpenConnectModal,
}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      node.play().catch((err) => {
        console.warn('Video play error on ref mount:', err);
      });
    }
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      setIsStreaming(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((e) => console.warn('Play error:', e));
      }
    } catch (err: any) {
      console.warn('Camera access denied or unavailable:', err);
      setCameraError('Optical sensor unavailable or permission denied. Use mobile companion or upload photo.');
      setIsStreaming(false);
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  useEffect(() => {
    if (isStreaming && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((e) => console.warn('Video play error:', e));
    }
  }, [isStreaming]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    const width = videoRef.current.videoWidth || 640;
    const height = videoRef.current.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0, width, height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `live_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      onCaptureFace(file, url);
      stopCamera();
    }, 'image/jpeg', 0.95);
  };

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setCameraError('Upload a valid portrait image.');
      return;
    }
    const url = URL.createObjectURL(file);
    onCaptureFace(file, url);
    stopCamera();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-xs select-none">
      <div className="flex items-center justify-between gap-2.5 border-b border-slate-200 bg-slate-50/80 px-5 py-3.5">
        <label className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2 font-sans">
          <ScanFace className="w-4 h-4 text-indigo-600" />
          <span>BIOMETRIC PORTRAIT BAY</span>
        </label>
        {isCompanionConnected ? (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Companion Sync Active
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-slate-400">
            1:1 Live Facial Match
          </span>
        )}
      </div>

      {!livePhotoPreviewUrl && !isStreaming ? (
        <div className="relative p-8 flex flex-col items-center justify-center text-center min-h-[240px] flex-1 hover:bg-slate-50/50 transition-colors">
          {/* Viewfinder Reticles */}
          <div className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-slate-300" />
          <div className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-slate-300" />
          <div className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-slate-300" />
          <div className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-slate-300" />

          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-3 text-indigo-600 shadow-2xs">
            <Smartphone className="w-7 h-7" />
          </div>

          <h4 className="font-bold text-sm text-slate-900 font-sans">
            LIVE TRAVELER CAPTURE
          </h4>
          <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
            Snap traveler photo with Android Field Companion or upload a photo file
          </p>

          <div className="mt-5 flex items-center flex-wrap justify-center gap-2.5">
            {/* Primary Companion Action */}
            <button
              type="button"
              onClick={() => {
                if (onOpenConnectModal) onOpenConnectModal();
              }}
              disabled={disabled}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Capture via Companion App</span>
            </button>

            {/* Upload Photo File */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Upload Photo</span>
            </button>
          </div>

          {/* Optional Local Webcam Link */}
          <div className="mt-3">
            <button
              type="button"
              onClick={startCamera}
              disabled={disabled}
              className="text-[11px] text-slate-400 hover:text-indigo-600 font-medium transition-colors cursor-pointer flex items-center gap-1"
            >
              <Camera className="w-3 h-3" />
              <span>Use local workstation webcam</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileUpload(e.target.files[0]);
              }
            }}
            disabled={disabled}
          />

          {cameraError && (
            <p className="mt-3 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-md">
              {cameraError}
            </p>
          )}
        </div>
      ) : isStreaming ? (
        <div className="relative p-4 flex flex-col items-center justify-center flex-1 bg-slate-900">
          <div className="relative max-h-[280px] w-full flex items-center justify-center overflow-hidden rounded-xl bg-black">
            <video
              ref={setVideoRef}
              autoPlay
              playsInline
              muted
              className="max-h-[260px] w-auto -scale-x-100 rounded"
            />
            {/* Live Scan Reticle */}
            <div className="absolute inset-8 border-2 border-indigo-400/80 rounded-2xl pointer-events-none flex items-center justify-center">
              <div className="w-20 h-28 border border-dashed border-amber-400/80 rounded-full" />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={capturePhoto}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Capture Face</span>
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="relative p-4 flex flex-col items-center justify-center flex-1">
          <div className="relative max-h-[280px] w-full flex items-center justify-center overflow-hidden rounded-xl bg-slate-50 border border-slate-200 p-2">
            <img
              src={livePhotoPreviewUrl || undefined}
              alt="Live Portrait"
              className="max-h-[240px] max-w-full object-contain rounded-lg shadow-sm"
            />
            <button
              type="button"
              onClick={onClearFace}
              disabled={disabled}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-red-600 transition-colors shadow-sm cursor-pointer"
              title="Remove Portrait"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 text-center">
            <span className="text-xs font-semibold text-emerald-700 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Live Biometric Portrait Loaded</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebCamCapture;
