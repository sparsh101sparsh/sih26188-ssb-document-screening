import React, { useState, useEffect, useRef } from 'react';
import { GovTopBar } from './components/GovTopBar';
import { Header } from './components/Header';
import { GovNavBar, NavTab } from './components/GovNavBar';
import { HeroCarousel } from './components/HeroCarousel';
import { AccessServicesGrid } from './components/AccessServicesGrid';
import { IngestionPanel } from './components/IngestionPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { GovFooter } from './components/GovFooter';
import { AskSSBMascot } from './components/AskSSBMascot';
import { OfflineWarningBanner } from './components/OfflineWarningBanner';
import { SettingsHubModal, SettingsTab } from './components/SettingsHubModal';
import { ConnectModal } from './components/ConnectModal';
import { CompanionGalleryModal } from './components/CompanionGalleryModal';
import { ScreenReaderEngine } from './components/ScreenReaderEngine';
import { StampIntroScreen } from './components/StampIntroScreen';

import { useBackendHealth } from './hooks/useBackendHealth';
import { inspectDocument } from './services/api';
import { CHECKPOINTS, CheckpointInfo, DocumentInspectResponse, OfficerDecision } from './types/api';
import { PresetItem } from './services/presets';
import { Smartphone, AlertTriangle, ShieldCheck, ArrowRight, Eye } from 'lucide-react';

function base64ToFile(base64Data: string, filename: string): File {
  try {
    const arr = base64Data.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[arr.length - 1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  } catch (err) {
    console.warn('Failed to convert base64 to File:', err);
    return new File([], filename, { type: 'image/jpeg' });
  }
}

export function App() {
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<CheckpointInfo>(CHECKPOINTS[0]);
  const [transitDate, setTransitDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState<string | null>(null);

  const [livePhotoFile, setLivePhotoFile] = useState<File | null>(null);
  const [livePhotoPreviewUrl, setLivePhotoPreviewUrl] = useState<string | null>(null);

  const [scanResult, setScanResult] = useState<DocumentInspectResponse | null>(null);
  const [heatmapImageUrl, setHeatmapImageUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [officerDecision, setOfficerDecision] = useState<OfficerDecision | null>(null);
  
  // Settings & System Hub Modal State
  const [isSettingsHubOpen, setIsSettingsHubOpen] = useState(false);
  const [settingsHubTab, setSettingsHubTab] = useState<SettingsTab>('models');

  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isCompanionGalleryOpen, setIsCompanionGalleryOpen] = useState(false);
  const [companionGalleryCount, setCompanionGalleryCount] = useState<number>(0);
  const [isScreenReaderActive, setIsScreenReaderActive] = useState(false);
  const [appLang, setAppLang] = useState<'en' | 'hi'>('en');
  const [showIntro, setShowIntro] = useState(true);
  const [introFadingOut, setIntroFadingOut] = useState(false);

  // Companion Live Sync State
  const [companionNotification, setCompanionNotification] = useState<string | null>(null);
  const [lastSequenceId, setLastSequenceId] = useState<number>(0);
  const lastSequenceIdRef = useRef<number>(0);
  lastSequenceIdRef.current = lastSequenceId;

  const [docFromCompanion, setDocFromCompanion] = useState(false);
  const [photoFromCompanion, setPhotoFromCompanion] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('scan');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    online: backendOnline,
    latencyMs: backendLatencyMs,
    isChecking: isCheckingHealth,
    refresh: refreshHealth,
  } = useBackendHealth(10000);

  const handleSelectDocument = (file: File, previewUrl: string) => {
    setDocumentFile(file);
    setDocumentPreviewUrl(previewUrl);
    setDocFromCompanion(false);
    setScanResult(null);
    setHeatmapImageUrl(null);
    setOfficerDecision(null);
    setErrorMessage(null);
  };

  const handleClearDocument = () => {
    if (documentPreviewUrl && !documentPreviewUrl.startsWith('data:')) {
      URL.revokeObjectURL(documentPreviewUrl);
    }
    setDocumentFile(null);
    setDocumentPreviewUrl(null);
    setDocFromCompanion(false);
    setScanResult(null);
    setHeatmapImageUrl(null);
    setOfficerDecision(null);
  };

  const handleCaptureFace = (file: File, previewUrl: string) => {
    setLivePhotoFile(file);
    setLivePhotoPreviewUrl(previewUrl);
    setPhotoFromCompanion(false);
    setScanResult(null);
    setOfficerDecision(null);
  };

  const handleClearFace = () => {
    if (livePhotoPreviewUrl && !livePhotoPreviewUrl.startsWith('data:')) {
      URL.revokeObjectURL(livePhotoPreviewUrl);
    }
    setLivePhotoFile(null);
    setLivePhotoPreviewUrl(null);
    setPhotoFromCompanion(false);
    setScanResult(null);
    setOfficerDecision(null);
  };

  const handleSelectPreset = async (preset: PresetItem) => {
    const images = preset.generateImages();
    const docFile = base64ToFile(images.docDataUrl, `${preset.id}_doc.jpg`);
    setDocumentFile(docFile);
    setDocumentPreviewUrl(images.docDataUrl);

    let faceFile: File | null = null;
    if (images.faceDataUrl) {
      faceFile = base64ToFile(images.faceDataUrl, `${preset.id}_face.jpg`);
      setLivePhotoFile(faceFile);
      setLivePhotoPreviewUrl(images.faceDataUrl);
    } else {
      setLivePhotoFile(null);
      setLivePhotoPreviewUrl(null);
    }

    setScanResult(null);
    setOfficerDecision(null);
    setErrorMessage(null);
    setHeatmapImageUrl(null);
    setActiveTab('scan');

    // Automatically execute live Edge AI neural screening on the backend
    setIsScanning(true);
    try {
      const result = await inspectDocument(
        docFile,
        faceFile,
        selectedCheckpoint.id,
        'OFFICER-7482'
      );
      setScanResult(result);
      if (result.details?.forensics?.heatmap_base64) {
        setHeatmapImageUrl(`data:image/png;base64,${result.details.forensics.heatmap_base64}`);
      }
    } catch (err: any) {
      console.error('Live neural inspection failed:', err);
      setErrorMessage(
        err?.message || 'Edge inference gateway encountered an error while analyzing document.'
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleReset = () => {
    handleClearDocument();
    handleClearFace();
    setErrorMessage(null);
    setOfficerDecision(null);
    setScanResult(null);
  };

  const handleScan = async () => {
    if (!documentFile && !livePhotoFile) return;

    setIsScanning(true);
    setErrorMessage(null);
    setOfficerDecision(null);

    try {
      const targetDoc = documentFile || livePhotoFile!;
      const result = await inspectDocument(
        targetDoc,
        livePhotoFile,
        selectedCheckpoint.id,
        'OFFICER-7482'
      );

      setScanResult(result);
      setActiveTab('results');

      if (result.details?.forensics?.heatmap_base64) {
        setHeatmapImageUrl(`data:image/png;base64,${result.details.forensics.heatmap_base64}`);
      } else {
        setHeatmapImageUrl(null);
      }
    } catch (err: any) {
      console.error('Inspection failed:', err);
      setErrorMessage(
        err?.message || 'Verification pipeline encountered an error.'
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleServiceSelect = (serviceId: string) => {
    if (serviceId === 'companion-sync') {
      setIsConnectModalOpen(true);
    } else {
      setActiveTab('scan');
      const element = document.getElementById('screening-bay');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleSimulatedCapture = (captureType: 'document' | 'selfie') => {
    if (captureType === 'document') {
      setDocFromCompanion(true);
      setCompanionNotification('Simulated Document Ingestion Received from Companion');
    } else {
      setPhotoFromCompanion(true);
      setCompanionNotification('Simulated Biometric Selfie Received from Companion');
    }
    setTimeout(() => setCompanionNotification(null), 5000);
  };

  const canScan = Boolean(documentFile || livePhotoFile);

  const playNotificationChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.36);
      }
    } catch {}
  };

  // Companion Real-time Push Stream (SSE) & Resilient Fallback Polling
  useEffect(() => {
    let isMounted = true;

    const fetchLatestGallery = async () => {
      if (!isMounted) return;
      try {
        const res = await fetch('/api/v1/companion/gallery?limit=50');
        if (!res.ok) return;
        const data = await res.json();
        if (data && Array.isArray(data.items)) {
          setCompanionGalleryCount(data.total || data.items.length);
          if (data.items.length > 0) {
            const latest = data.items[0];
            if (latest.sequence_id > lastSequenceIdRef.current) {
              setLastSequenceId(latest.sequence_id);
              lastSequenceIdRef.current = latest.sequence_id;

              const mode = latest.capture_type || 'document';
              const b64 = latest.image_data || latest.image_base64 || '';
              const dataUrl = b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}`;
              const file = base64ToFile(dataUrl, latest.filename || `companion_${mode}_${latest.sequence_id}.jpg`);

              if (mode === 'document') {
                setDocumentFile(file);
                setDocumentPreviewUrl(dataUrl);
                setDocFromCompanion(true);
                setCompanionNotification(`📸 Received Live Document #${latest.sequence_id} from Field Officer (${latest.device_id || 'Terminal'})`);
              } else {
                setLivePhotoFile(file);
                setLivePhotoPreviewUrl(dataUrl);
                setPhotoFromCompanion(true);
                setCompanionNotification(`👤 Received Live Facial Capture #${latest.sequence_id} from Field Officer (${latest.device_id || 'Terminal'})`);
              }

              playNotificationChime();

              setTimeout(() => {
                if (isMounted) setCompanionNotification(null);
              }, 7000);
            }
          }
        }
      } catch (err) {}
    };

    // 1. Initial fetch & active fallback interval
    fetchLatestGallery();
    const pollInterval = setInterval(fetchLatestGallery, 2500);

    // 2. Real-Time Server-Sent Events (SSE) Push Listener
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/v1/companion/stream');
      eventSource.addEventListener('NEW_CAPTURE', () => {
        fetchLatestGallery();
      });
    } catch {}

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      if (eventSource) eventSource.close();
    };
  }, []);

  return (
    <>
      {showIntro && (
        <StampIntroScreen
          onTransitionStart={() => setIntroFadingOut(true)}
          onComplete={() => {
            setShowIntro(false);
            setIntroFadingOut(true);
          }}
        />
      )}

      <div
        id="main-content"
        className={`min-h-screen bg-[#F8FAFC] font-sans text-slate-800 antialiased transition-all duration-1000 ease-out flex flex-col ${
          showIntro && !introFadingOut
            ? 'opacity-0 pointer-events-none transform translate-y-5 scale-[0.96]'
            : 'opacity-100 pointer-events-auto transform translate-y-0 scale-100'
        }`}
      >
        {/* 1. Top Accessibility Strip (UIDAI Standard) */}
        <GovTopBar
          onOpenSecurityProtocols={() => { setSettingsHubTab('security'); setIsSettingsHubOpen(true); }}
          isScreenReaderActive={isScreenReaderActive}
          onToggleScreenReader={() => setIsScreenReaderActive(!isScreenReaderActive)}
          onLanguageChange={setAppLang}
        />

        {/* 2. Official Gov Header */}
        <Header
          selectedCheckpoint={selectedCheckpoint}
          onSelectCheckpoint={setSelectedCheckpoint}
          backendOnline={backendOnline}
          backendLatencyMs={backendLatencyMs}
          onRefreshHealth={refreshHealth}
          isCheckingHealth={isCheckingHealth}
          onOpenAuditModal={() => { setSettingsHubTab('audit'); setIsSettingsHubOpen(true); }}
          onOpenJsonModal={() => { setSettingsHubTab('telemetry'); setIsSettingsHubOpen(true); }}
          hasScanResult={scanResult !== null}
          onOpenConnectModal={() => setIsConnectModalOpen(true)}
          onOpenCompanionGallery={() => setIsCompanionGalleryOpen(true)}
          onOpenSettings={() => { setSettingsHubTab('models'); setIsSettingsHubOpen(true); }}
          companionGalleryCount={companionGalleryCount}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* 3. Horizontal Pill Navigation Bar (UIDAI Standard) */}
        <GovNavBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          hasScanResult={scanResult !== null}
          onOpenSettings={() => { setSettingsHubTab('models'); setIsSettingsHubOpen(true); }}
        />

        {/* Companion Sync Live Toast with Quick Gallery Action */}
        {companionNotification && (
          <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 text-white text-xs font-bold px-4 py-2.5 shadow-md flex items-center justify-between animate-pop-in select-none">
            <div className="max-w-[1700px] mx-auto w-full flex items-center justify-between gap-4">
              <div className="flex items-center space-x-2.5">
                <Smartphone className="w-4 h-4 text-emerald-200 animate-bounce" />
                <span>{companionNotification}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCompanionGalleryOpen(true)}
                  className="px-3 py-1 bg-white text-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Companion Gallery</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 max-w-[1700px] w-full mx-auto px-4 py-6">
          <OfflineWarningBanner
            backendOnline={backendOnline}
            onRetry={refreshHealth}
            isChecking={isCheckingHealth}
          />

          {errorMessage && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-start space-x-3 shadow-xs">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Screening Error:</span> {errorMessage}
              </div>
            </div>
          )}

          {/* Tab Views */}
          {activeTab === 'home' && (
            <div>
              {/* 4. Hero Carousel Banner */}
              <HeroCarousel
                checkpoint={selectedCheckpoint}
                onNavigateToScan={() => {
                  setActiveTab('scan');
                  document.getElementById('screening-bay')?.scrollIntoView({ behavior: 'smooth' });
                }}
                onNavigateToCompanion={() => setIsConnectModalOpen(true)}
                onOpenSecurityProtocols={() => { setSettingsHubTab('security'); setIsSettingsHubOpen(true); }}
              />

              {/* 5. "Access SSB Screening Services" Grid (UIDAI 1-to-1 Match) */}
              <AccessServicesGrid onSelectService={handleServiceSelect} />

              {/* 6. Ingestion Deck */}
              <div id="screening-bay">
                <IngestionPanel
                  documentFile={documentFile}
                  documentPreviewUrl={documentPreviewUrl}
                  onSelectDocument={handleSelectDocument}
                  onClearDocument={handleClearDocument}
                  livePhotoFile={livePhotoFile}
                  livePhotoPreviewUrl={livePhotoPreviewUrl}
                  onCaptureFace={handleCaptureFace}
                  onClearFace={handleClearFace}
                  selectedCheckpoint={selectedCheckpoint}
                  transitDate={transitDate}
                  onChangeTransitDate={setTransitDate}
                  onScan={handleScan}
                  onReset={handleReset}
                  isScanning={isScanning}
                  canScan={canScan}
                  latencyMs={backendLatencyMs}
                  isCompanionConnected={true}
                  docFromCompanion={docFromCompanion}
                  photoFromCompanion={photoFromCompanion}
                  onOpenConnectModal={() => setIsConnectModalOpen(true)}
                  onOpenCompanionGallery={() => setIsCompanionGalleryOpen(true)}
                />
              </div>

              {/* Results Preview if available */}
              {scanResult && documentPreviewUrl && (
                <div className="mt-8">
                  <ResultsPanel
                    result={scanResult}
                    documentImageUrl={documentPreviewUrl}
                    heatmapImageUrl={heatmapImageUrl}
                    livePhotoUrl={livePhotoPreviewUrl}
                    officerDecision={officerDecision}
                    onOfficerDecision={setOfficerDecision}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'scan' && (
            <div id="screening-bay">
              <IngestionPanel
                documentFile={documentFile}
                documentPreviewUrl={documentPreviewUrl}
                onSelectDocument={handleSelectDocument}
                onClearDocument={handleClearDocument}
                livePhotoFile={livePhotoFile}
                livePhotoPreviewUrl={livePhotoPreviewUrl}
                onCaptureFace={handleCaptureFace}
                onClearFace={handleClearFace}
                selectedCheckpoint={selectedCheckpoint}
                transitDate={transitDate}
                onChangeTransitDate={setTransitDate}
                onScan={handleScan}
                onReset={handleReset}
                isScanning={isScanning}
                canScan={canScan}
                latencyMs={backendLatencyMs}
                isCompanionConnected={true}
                docFromCompanion={docFromCompanion}
                photoFromCompanion={photoFromCompanion}
                onOpenConnectModal={() => setIsConnectModalOpen(true)}
              />

              {scanResult && documentPreviewUrl && (
                <div className="mt-8">
                  <ResultsPanel
                    result={scanResult}
                    documentImageUrl={documentPreviewUrl}
                    heatmapImageUrl={heatmapImageUrl}
                    livePhotoUrl={livePhotoPreviewUrl}
                    officerDecision={officerDecision}
                    onOfficerDecision={setOfficerDecision}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'results' && (
            <div>
              {scanResult && documentPreviewUrl ? (
                <ResultsPanel
                  result={scanResult}
                  documentImageUrl={documentPreviewUrl}
                  heatmapImageUrl={heatmapImageUrl}
                  livePhotoUrl={livePhotoPreviewUrl}
                  officerDecision={officerDecision}
                  onOfficerDecision={setOfficerDecision}
                />
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
                  <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-slate-800">No Inspection Performed Yet</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Please upload a traveler passport/visa or snap live optical portrait to generate forensic results.
                  </p>
                  <button
                    onClick={() => setActiveTab('scan')}
                    className="mt-5 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow transition-all cursor-pointer"
                  >
                    Go to Screening Bay
                  </button>
                </div>
              )}
            </div>
          )}
        </main>

        {/* 7. Official Government Footer */}
        <GovFooter />

        {/* 8. Floating Mascot "Ask SSB" */}
        <AskSSBMascot />

        {/* Unified Settings & Neural Model Hub */}
        <SettingsHubModal
          isOpen={isSettingsHubOpen}
          onClose={() => setIsSettingsHubOpen(false)}
          initialTab={settingsHubTab}
          backendOnline={backendOnline}
          backendLatencyMs={backendLatencyMs}
          onRefreshHealth={refreshHealth}
          hasScanResult={scanResult !== null}
          scanResultData={scanResult}
        />

        <ConnectModal
          isOpen={isConnectModalOpen}
          onClose={() => setIsConnectModalOpen(false)}
          onSimulatedCapture={handleSimulatedCapture}
        />

        <CompanionGalleryModal
          isOpen={isCompanionGalleryOpen}
          onClose={() => setIsCompanionGalleryOpen(false)}
          onSelectDocument={(file, url) => {
            handleSelectDocument(file, url);
            setDocFromCompanion(true);
          }}
          onSelectLivePhoto={(file, url) => {
            handleCaptureFace(file, url);
            setPhotoFromCompanion(true);
          }}
          onOpenPairingModal={() => setIsConnectModalOpen(true)}
        />

        {/* 9. Interactive Voice Screen Reader Engine */}
        <ScreenReaderEngine
          isActive={isScreenReaderActive}
          onToggle={() => setIsScreenReaderActive(!isScreenReaderActive)}
          lang={appLang}
        />
      </div>
    </>
  );
}

export default App;
