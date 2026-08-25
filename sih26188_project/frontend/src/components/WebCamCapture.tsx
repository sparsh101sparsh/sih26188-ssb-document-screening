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
  onOpenCompanionGallery?: () => void;
}

function base64ToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
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
  onOpenCompanionGallery,
}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    // 1. Check companion drag data
    const companionJson = e.dataTransfer.getData('application/json');
    if (companionJson) {
      try {
        const item = JSON.parse(companionJson);
        if (item && item.image_data) {
          const file = base64ToFile(item.image_data, item.filename || `companion_face_${item.sequence_id}.jpg`);
          onCaptureFace(file, item.image_data);
          stopCamera();
          return;
        }
      } catch {
        // quiet fallback
      }
    }

    // 2. Standard file drop
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      node.play().catch((err) => {
        console.warn('Video play error on ref mount:', err);
      });
    }
  }, []);

  const startCamera = async (targetFacing: 'user' | 'environment' = facingMode) => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API not supported in this environment');
      }

      let stream: MediaStream | null = null;
      
      // Tier 1: Ideal HD with facing mode
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: targetFacing },
          audio: false,
        });
      } catch (tier1Err) {
        console.warn('Tier 1 camera constraints rejected, attempting basic fallback:', tier1Err);
      }

      // Tier 2: Basic video constraints (FaceTime / Desktop USB webcam)
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (tier2Err) {
          console.warn('Tier 2 camera fallback rejected:', tier2Err);
          throw tier2Err;
        }
      }

      streamRef.current = stream;
      setFacingMode(targetFacing);
      setIsStreaming(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((e) => console.warn('Play error:', e));
      }
    } catch (err: any) {
      console.warn('Camera access denied or unavailable:', err);
      const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      const msg = isDenied
        ? 'Camera permission denied. Allow camera in System Settings > Privacy & Security > Camera.'
        : `Optical sensor unavailable (${err.message || 'not found'}). Use mobile companion or upload photo.`;
      setCameraError(msg);
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
    <div className="flex h-full flex-col overflow-hidden rounded-xl bg-white border border-slate-200/70 shadow-2xs">
      <div className="flex items-center justify-between gap-2.5 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 font-sans">
          <ScanFace className="w-4 h-4 text-indigo-600" />
          <span>BIOMETRIC PORTRAIT BAY</span>
        </label>
        {isCompanionConnected ? (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Companion Sync Active
          </span>
        ) : (
          <span className="text-[10.5px] font-medium text-slate-400">
            1:1 Live Facial Match
          </span>
        )}
      </div>

      {!livePhotoPreviewUrl && !isStreaming ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`relative p-8 flex flex-col items-center justify-center text-center min-h-[240px] flex-1 transition-all ${
            isDragOver
              ? 'bg-emerald-50/60 border-2 border-dashed border-emerald-500 scale-[1.01]'
              : 'hover:bg-slate-50/60'
          }`}
        >
          {/* Viewfinder Reticles */}
          <div className="absolute top-3 left-3 w-2.5 h-2.5 border-t-2 border-l-2 border-slate-200" />
          <div className="absolute top-3 right-3 w-2.5 h-2.5 border-t-2 border-r-2 border-slate-200" />
          <div className="absolute bottom-3 left-3 w-2.5 h-2.5 border-b-2 border-l-2 border-slate-200" />
          <div className="absolute bottom-3 right-3 w-2.5 h-2.5 border-b-2 border-r-2 border-slate-200" />

          <div className="w-12 h-12 rounded-xl bg-indigo-50/80 flex items-center justify-center mb-2.5 text-indigo-600 shadow-2xs">
            <Smartphone className="w-6 h-6" />
          </div>

          <h4 className="font-bold text-xs sm:text-sm text-slate-800 font-sans">
            LIVE TRAVELER CAPTURE
          </h4>
          <p className="text-[11.5px] text-slate-400 mt-0.5 max-w-xs leading-relaxed">
            Snap traveler photo with Android Field Companion or upload a photo file
          </p>

          <div className="mt-4 flex items-center flex-wrap justify-center gap-2">
            {/* Primary Companion Action */}
            {onOpenCompanionGallery ? (
              <button
                type="button"
                onClick={onOpenCompanionGallery}
                disabled={disabled}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-all cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Companion Gallery</span>
              </button>
            ) : onOpenConnectModal ? (
              <button
                type="button"
                onClick={onOpenConnectModal}
                disabled={disabled}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-all cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Pair Companion</span>
              </button>
            ) : null}

            {/* Upload Photo File */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Upload Photo</span>
            </button>
          </div>

          {/* Optional Local Webcam Link */}
          <div className="mt-2.5">
            <button
              type="button"
              onClick={() => startCamera()}
              disabled={disabled}
              className="text-[10.5px] text-slate-400 hover:text-indigo-600 font-medium transition-colors cursor-pointer flex items-center gap-1"
            >
              <Camera className="w-3 h-3" />
              <span>Use local webcam</span>
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
            <p className="mt-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-md">
              {cameraError}
            </p>
          )}
        </div>
      ) : isStreaming ? (
        <div className="relative p-4 flex flex-col items-center justify-center flex-1 bg-slate-50/40 rounded-b-xl border-t border-slate-100">
          <div className="relative w-full max-w-[340px] aspect-[4/3] flex items-center justify-center overflow-hidden rounded-xl bg-slate-900 border border-slate-200 shadow-sm">
            <video
              ref={setVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover -scale-x-100"
            />
            {/* Live Camera Badge */}
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
              </span>
              <span className="text-[9.5px] font-bold tracking-wider text-white uppercase font-mono">
                LIVE OPTICAL FEED
              </span>
            </div>

            {/* Official Biometric Oval Guide */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-24 h-32 border-2 border-dashed border-amber-300/80 rounded-[50%] shadow-[0_0_15px_rgba(245,158,11,0.25)]" />
            </div>

            {/* Corner Alignment Reticles */}
            <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 border-t-2 border-r-2 border-indigo-400 pointer-events-none" />
            <div className="absolute bottom-2.5 left-2.5 w-2.5 h-2.5 border-b-2 border-l-2 border-indigo-400 pointer-events-none" />
            <div className="absolute bottom-2.5 right-2.5 w-2.5 h-2.5 border-b-2 border-r-2 border-indigo-400 pointer-events-none" />
          </div>

          <div className="mt-3.5 flex items-center gap-2.5">
            <button
              type="button"
              onClick={capturePhoto}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-[#0F2750] to-[#1E3A8A] hover:from-[#0B1D3A] hover:to-[#172554] text-white border border-amber-400/30 shadow-xs transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              <span>Capture Biometric Portrait</span>
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="flex items-center space-x-1 px-3 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-slate-500" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="relative p-3.5 flex flex-col items-center justify-center flex-1 bg-slate-50/40">
          <div className="relative max-h-[260px] w-full flex items-center justify-center overflow-hidden rounded-lg bg-white shadow-2xs">
            <img
              src={livePhotoPreviewUrl || undefined}
              alt="Live Portrait"
              className="max-h-[240px] max-w-full object-contain rounded"
            />
            <button
              type="button"
              onClick={onClearFace}
              disabled={disabled}
              className="absolute top-2.5 right-2.5 p-1 rounded-full bg-slate-900/70 text-white hover:bg-red-600 transition-colors shadow-2xs cursor-pointer"
              title="Remove Portrait"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="mt-2.5 text-center">
            <span className="text-[11px] font-semibold text-emerald-700 flex items-center justify-center gap-1">
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
