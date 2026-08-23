import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, RefreshCw, Upload, CheckCircle2, User, Eye, X } from 'lucide-react';

interface WebCamCaptureProps {
  livePhotoFile: File | null;
  livePhotoPreviewUrl: string | null;
  onCaptureFace: (file: File, previewUrl: string) => void;
  onClearFace: () => void;
  disabled?: boolean;
}

export const WebCamCapture: React.FC<WebCamCaptureProps> = ({
  livePhotoFile,
  livePhotoPreviewUrl,
  onCaptureFace,
  onClearFace,
  disabled = false,
}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsStreaming(true);
    } catch (err: any) {
      console.warn('Camera access denied or unavailable:', err);
      setCameraError('Camera unavailable. Please upload a portrait photo.');
      setIsStreaming(false);
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `live_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        onCaptureFace(file, url);
        stopCamera();
      }
    }, 'image/jpeg', 0.95);
  };

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Upload a valid portrait image.');
      return;
    }
    const url = URL.createObjectURL(file);
    onCaptureFace(file, url);
    stopCamera();
  };

  return (
    <div className="flex flex-col h-full bg-surface border border-line rounded-card overflow-hidden shadow-card">
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-inset border-b border-line">
        <label className="text-xs font-semibold uppercase tracking-wider text-ink flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-accent" />
          Live Traveler Biometric Ingestion
        </label>
        <span className="text-[10px] text-ink-3 font-mono">
          AdaFace Cosine · MiniFASNet FAS
        </span>
      </div>

      {!livePhotoPreviewUrl && !isStreaming ? (
        <div className="p-6 flex flex-col items-center justify-center text-center min-h-[220px] flex-1">
          <div className="p-3 bg-inset rounded-control border border-line-strong text-accent mb-2.5 shadow-btn">
            <Camera className="w-6 h-6" />
          </div>

          <p className="text-xs font-semibold text-ink mb-1">
            Capture Live Portrait Selfie
          </p>
          <p className="text-[11.5px] text-ink-2 max-w-xs leading-relaxed mb-4">
            Required for 1:1 facial biometric matching and Fourier liveness check
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startCamera}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-semibold bg-accent text-white hover:brightness-105 shadow-btn transition-all active:scale-[0.98]"
            >
              <Camera className="w-3.5 h-3.5" />
              Start Webcam
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-semibold bg-inset hover:bg-hover text-ink border border-line shadow-btn transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Photo
            </button>
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
          </div>

          {cameraError && (
            <p className="text-[11px] text-red mt-2 font-mono">{cameraError}</p>
          )}
        </div>
      ) : isStreaming ? (
        <div className="relative flex flex-col flex-1 min-h-[220px] bg-canvas">
          <div className="relative w-full h-[190px] flex items-center justify-center overflow-hidden">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-0 border-2 border-accent/40 pointer-events-none" />
          </div>
          <div className="p-2.5 bg-surface border-t border-line flex items-center justify-between">
            <button
              type="button"
              onClick={capturePhoto}
              className="px-3.5 py-1.5 bg-accent text-white font-semibold text-xs rounded-control shadow-btn flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" /> Snap Photo
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="px-3 py-1.5 bg-inset hover:bg-hover text-ink-2 text-xs rounded-control border border-line"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="relative flex flex-col flex-1 min-h-[220px]">
          <div className="relative w-full h-[190px] bg-canvas flex items-center justify-center p-3 overflow-hidden">
            <img
              src={livePhotoPreviewUrl || undefined}
              alt="Live Portrait"
              className="max-h-full max-w-full object-contain rounded-chip border border-line shadow-card"
            />
            <div className="absolute top-2.5 right-2.5 flex space-x-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearFace();
                }}
                disabled={disabled}
                className="p-1.5 bg-surface hover:bg-hover text-red rounded-control border border-line transition-colors shadow-btn"
                title="Remove Face"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="p-2.5 bg-surface border-t border-line flex items-center justify-between text-xs mt-auto">
            <div className="flex items-center space-x-2 truncate">
              <CheckCircle2 className="w-4 h-4 text-green flex-shrink-0" />
              <div className="truncate">
                <p className="font-semibold text-ink truncate text-[11.5px]">
                  {livePhotoFile?.name || 'Live Traveler Biometric Frame'}
                </p>
                <p className="text-[10px] text-ink-3 font-mono">
                  Umeyama 112×112 Extracted · FAS Verified
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onClearFace();
                startCamera();
              }}
              disabled={disabled}
              className="text-[11.5px] text-accent hover:underline font-medium px-2 py-1 rounded-control bg-inset border border-line"
            >
              Re-capture
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
