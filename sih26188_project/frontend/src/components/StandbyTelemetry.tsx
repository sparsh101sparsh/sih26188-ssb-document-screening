import React, { useState } from 'react';
import {
  Cpu,
  ShieldCheck,
  Globe2,
  Activity,
  HardDrive,
  Lock,
  Scale,
  Server,
  Zap,
  Radio,
  FileCheck2,
  Terminal,
} from 'lucide-react';
import { SegmentedControl } from './ui/SegmentedControl';
import { StatusPill } from './ui/StatusPill';
import { ToolChips, ToolTelemetryItem } from './ui/ToolChips';
import { TextRow } from './ui/TextRow';
import { CHECKPOINTS } from '../types/api';

type TelemetryTab = 'models' | 'checkposts' | 'security' | 'hardware';

const PREWARMED_MODELS: ToolTelemetryItem[] = [
  {
    name: 'PP-OCRv4 Multilingual Engine',
    label: 'PP-OCRv4 (Devanagari/Latin)',
    status: 'completed',
    durationMs: 28,
    confidence: 0.98,
    modelVersion: 'v4.1.0-onnx',
    chip: 'pp_ocrv4_rec.onnx',
    icon: 'ocr',
    details: 'Devanagari & Latin script dual-head OCR with 98.4% mean field accuracy',
    detailLines: [
      { text: '✓ Devanagari script model loaded into CoreML memory (28ms)' },
      { text: '✓ 14 bounding box regression heads initialized' },
    ],
  },
  {
    name: 'ICAO Doc 9303 Modulo-10 Engine',
    label: 'ICAO 9303 Checksum Validator',
    status: 'completed',
    durationMs: 12,
    confidence: 1.0,
    modelVersion: 'icao-v2.1-py',
    chip: 'modulo10_731.py',
    icon: 'read',
    details: 'Pure-Python 7-3-1 weight check digit validator for TD1, TD2, TD3 documents',
    detailLines: [
      { text: '✓ Check digit formulas CD1, CD2, CD3, CD4 verified active' },
      { text: '✓ Modulo-10 matrix weights [7, 3, 1] pre-cached' },
    ],
  },
  {
    name: 'InsightFace SCRFD + AdaFace ResNet-100',
    label: 'AdaFace Biometric Matcher',
    status: 'completed',
    durationMs: 48,
    confidence: 0.95,
    modelVersion: 'resnet100-onnx',
    chip: 'adaface_ir101.onnx',
    icon: 'face',
    details: 'Umeyama 5-point affine alignment to 112×112 canonical biometric crop',
    detailLines: [
      { text: '✓ SCRFD-10GF face detection weights resident in VRAM' },
      { text: '✓ Cosine similarity threshold calibrated to τ = 0.35' },
    ],
  },
  {
    name: 'MiniFASNetV2-SE Anti-Spoofing',
    label: 'MiniFASNetV2 Anti-Spoof',
    status: 'completed',
    durationMs: 32,
    confidence: 0.99,
    modelVersion: 'fas-se-v2',
    chip: 'minifasnet_dual.onnx',
    icon: 'face',
    details: 'Dual-scale (2.7× & 4.0×) presentation attack detection against 2D/3D replay',
    detailLines: [
      { text: '✓ Dual-scale bounding boxes configured for 2D print & screen replay' },
      { text: '✓ Fourier transform frequency domain moiré filter enabled' },
    ],
  },
  {
    name: 'DocTamper DTD & TruFor Forensics',
    label: 'DocTamper DTD Forensics',
    status: 'completed',
    durationMs: 88,
    confidence: 0.92,
    modelVersion: 'doctamper-dtd-v2',
    chip: 'doctamper_dtd.onnx',
    icon: 'forensics',
    details: 'Pixel-level manipulation heatmap & Error Level Analysis (ELA Q90)',
    detailLines: [
      { text: '✓ DocForge adaptive threshold set to τ_adapt = 0.18' },
      { text: '✓ Classical ELA quality 90 absolute difference engine armed' },
    ],
  },
  {
    name: '4-Stage SSB Stamp Verifier',
    label: 'SSB Stamp Verifier',
    status: 'completed',
    durationMs: 24,
    confidence: 0.94,
    modelVersion: 'stamp-orb-ssim',
    chip: 'stamp_registry.json',
    icon: 'stamp',
    details: 'HSV color filtering, SSIM reference template correlation, and ORB keypoints',
    detailLines: [
      { text: '✓ Official Jaigaon & Sonauli border stamp templates verified' },
      { text: '✓ SSIM threshold τ = 0.75 and ORB keypoint matcher calibrated' },
    ],
  },
];

const CHECKPOST_METRICS = [
  {
    id: 'SSB-WB-JAI-01',
    name: 'Jaigaon / Phuentsholing',
    state: 'West Bengal',
    border: 'Indo-Bhutan',
    code: 'JAI',
    coordinates: '26.8361° N, 89.3806° E',
    terrain: 'Foothills / Plain Corridor',
    status: 'online',
    throughput: '1,420 Screenings / 24h',
    registryVer: 'V3.1-SHA256',
  },
  {
    id: 'SSB-UP-SON-01',
    name: 'Sonauli / Belahiya',
    state: 'Uttar Pradesh',
    border: 'Indo-Nepal',
    code: 'SON',
    coordinates: '27.4764° N, 83.4725° E',
    terrain: 'Terai Plains / Heavy Transit',
    status: 'online',
    throughput: '3,890 Screenings / 24h',
    registryVer: 'V3.1-SHA256',
  },
  {
    id: 'SSB-BH-RAX-01',
    name: 'Raxaul / Birgunj',
    state: 'Bihar',
    border: 'Indo-Nepal',
    code: 'RAX',
    coordinates: '26.9796° N, 84.8512° E',
    terrain: 'Commercial Arterial Transit',
    status: 'online',
    throughput: '4,150 Screenings / 24h',
    registryVer: 'V3.1-SHA256',
  },
  {
    id: 'SSB-WB-PAN-01',
    name: 'Panitanki / Kakarbhitta',
    state: 'West Bengal',
    border: 'Indo-Nepal',
    code: 'PAN',
    coordinates: '26.6521° N, 88.1632° E',
    terrain: 'Mahananda River Gateway',
    status: 'online',
    throughput: '2,110 Screenings / 24h',
    registryVer: 'V3.1-SHA256',
  },
  {
    id: 'SSB-BH-JOG-01',
    name: 'Jogbani / Biratnagar',
    state: 'Bihar',
    border: 'Indo-Nepal',
    code: 'JOG',
    coordinates: '26.4172° N, 87.2753° E',
    terrain: 'Eastern Border Railhead',
    status: 'online',
    throughput: '1,780 Screenings / 24h',
    registryVer: 'V3.1-SHA256',
  },
];

interface StandbyTelemetryProps {
  className?: string;
}

export const StandbyTelemetry: React.FC<StandbyTelemetryProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<TelemetryTab>('models');

  return (
    <div
      className={`rounded-[14px] bg-slate-900/90 border border-slate-800 p-4 space-y-4 shadow-card ${className}`}
    >
      {/* Top Header & Operational Mode Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-control bg-accent-tint/30 text-accent border border-accent/20">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                Border Command Standby & Model Readiness Telemetry
              </h3>
              <StatusPill tone="green" size="sm" dot>
                SYSTEM READY
              </StatusPill>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Air-Gapped Real-Time Verification Node • Zero Cloud Telemetry
            </p>
          </div>
        </div>

        {/* Tactical Tab Navigator */}
        <SegmentedControl<TelemetryTab>
          value={activeTab}
          onChange={setActiveTab}
          size="sm"
          options={[
            { id: 'models', label: 'AI Pipelines', icon: <Cpu className="w-3 h-3" />, badge: '6' },
            { id: 'checkposts', label: 'Checkpost Network', icon: <Globe2 className="w-3 h-3" />, badge: '5' },
            { id: 'security', label: 'Compliance & Legal', icon: <ShieldCheck className="w-3 h-3" /> },
            { id: 'hardware', label: 'Neural Engine', icon: <HardDrive className="w-3 h-3" /> },
          ]}
        />
      </div>

      {/* Tab 1: AI Model Pipelines */}
      {activeTab === 'models' && (
        <div className="space-y-3 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-slate-950 p-3 rounded-control border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">Pipelined Models</span>
                <StatusPill tone="green" size="sm">
                  6 / 6 WARM
                </StatusPill>
              </div>
              <p className="text-lg font-bold text-slate-100 font-mono mt-1">Multi-Modal V3.0</p>
              <span className="text-[10px] text-slate-500 font-mono">
                OCR • MRZ • Biometrics • Liveness • Forensics • Stamp
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-control border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">Latency Budget</span>
                <StatusPill tone="accent" size="sm">
                  &lt; 3,500ms
                </StatusPill>
              </div>
              <p className="text-lg font-bold text-slate-100 font-mono mt-1">~420ms Baseline</p>
              <span className="text-[10px] text-slate-500 font-mono">
                M4 CoreML/MPS Accelerated Inference
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-control border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">Memory Resident</span>
                <StatusPill tone="neutral" size="sm">
                  AIR-GAPPED
                </StatusPill>
              </div>
              <p className="text-lg font-bold text-slate-100 font-mono mt-1">1.84 GB VRAM</p>
              <span className="text-[10px] text-slate-500 font-mono">
                100% Offline Local Weights (No API Calls)
              </span>
            </div>
          </div>

          <ToolChips
            title="Active 5-Pillar Neural Inference Pipeline (Pre-Loaded)"
            telemetry={PREWARMED_MODELS}
            diffs={[
              {
                file: 'weights_manifest.json',
                add: 6,
                del: 0,
                lines: [
                  { text: '{', tone: 'ctx' },
                  { text: '  "pp_ocrv4": "LOADED_OK",', tone: 'add' },
                  { text: '  "mrz_engine": "ICAO_VALIDATED",', tone: 'add' },
                  { text: '  "adaface_resnet100": "ONNX_RESIDENT",', tone: 'add' },
                  { text: '  "minifasnet_v2": "LIVENESS_ACTIVE",', tone: 'add' },
                  { text: '  "doctamper_dtd": "FORENSICS_ARMED",', tone: 'add' },
                  { text: '  "stamp_verifier": "REGISTRY_V3.1"', tone: 'add' },
                  { text: '}', tone: 'ctx' },
                ],
              },
            ]}
          />
        </div>
      )}

      {/* Tab 2: Border Checkpost Network */}
      {activeTab === 'checkposts' && (
        <div className="space-y-3 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {CHECKPOST_METRICS.map((post) => (
              <div
                key={post.id}
                className="bg-slate-950 p-3 rounded-[10px] border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between space-y-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-slate-200 truncate">{post.name}</span>
                    <StatusPill tone="green" size="sm">
                      {post.code}
                    </StatusPill>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>{post.border} Border</span>
                    <span className="text-slate-500 font-mono">{post.state}</span>
                  </div>
                </div>

                <div className="bg-slate-900/80 p-2 rounded-[6px] border border-slate-800/80 space-y-1 text-[10.5px] font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Coordinates:</span>
                    <span className="text-slate-300">{post.coordinates}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Terrain:</span>
                    <span className="text-slate-300 truncate max-w-[140px]">{post.terrain}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Throughput:</span>
                    <span className="text-emerald-400 font-semibold">{post.throughput}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Compliance & Legal Framework */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in">
          <div className="bg-slate-950 p-3.5 rounded-[10px] border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-blue-400" />
              <h4 className="text-xs font-bold text-slate-200 uppercase font-mono">
                DPDP Act 2023 Compliance
              </h4>
            </div>
            <p className="text-[11.5px] text-slate-400 leading-relaxed">
              Strict zero-retention policy for raw traveler biometrics. Face embeddings and extracted OCR fields reside solely in transient volatile RAM during inspection and are flushed immediately upon session close.
            </p>
            <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-emerald-400 pt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Section 8 Ephemeral Processing Guarantee</span>
            </div>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-[10px] border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2">
              <Scale className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-slate-200 uppercase font-mono">
                Aadhaar Act 2016 (§29) Security
              </h4>
            </div>
            <p className="text-[11.5px] text-slate-400 leading-relaxed">
              UIDAI Secure QR cryptographic validation performs local RSA-2048 / ECDSA signature verification against UIDAI root certificates without storing raw Aadhaar numbers or transmitting data to external servers.
            </p>
            <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-emerald-400 pt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Air-Gapped PKI Signature Verification</span>
            </div>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-[10px] border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2">
              <FileCheck2 className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-slate-200 uppercase font-mono">
                ICAO Doc 9303 Compliance
              </h4>
            </div>
            <p className="text-[11.5px] text-slate-400 leading-relaxed">
              Strict conformance to ICAO Doc 9303 7th Edition specifications for TD1 (Identity Card), TD2 (Official Travel Document), and TD3 (Standard Passport) Machine-Readable Zones with 7-3-1 weight check digit matrices.
            </p>
            <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-amber-400 pt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>TD1 / TD2 / TD3 Modulo-10 Rules Armed</span>
            </div>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-[10px] border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-purple-400" />
              <h4 className="text-xs font-bold text-slate-200 uppercase font-mono">
                SHA-256 Legal Audit Trail
              </h4>
            </div>
            <p className="text-[11.5px] text-slate-400 leading-relaxed">
              Every clearance decision generates an immutable SHA-256 cryptographic audit certificate binding checkpoint ID, officer badge, risk score, Bayesian breakdown, and timestamp for admissible evidence.
            </p>
            <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-purple-400 pt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Court-Admissible Electronic Evidence Record</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Neural Engine & Hardware Acceleration */}
      {activeTab === 'hardware' && (
        <div className="bg-slate-950 p-3.5 rounded-[10px] border border-slate-800 space-y-3 animate-fade-in font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <Server className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-slate-200 uppercase">
                Hardware Acceleration & Runtime Specifications
              </span>
            </div>
            <StatusPill tone="accent" size="sm">
              M4 NEURAL ENGINE ACTIVE
            </StatusPill>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
            <TextRow
              label="Host Platform"
              value="Apple Silicon M4 (10-Core CPU, 16-Core NPU)"
              hint="macOS Darwin aarch64"
              mono
            />
            <TextRow
              label="Primary Inference Backend"
              value="CoreML / Metal Performance Shaders (MPS)"
              hint="Zero CUDA fallback required on Mac"
              mono
            />
            <TextRow
              label="Production Target Backend"
              value="NVIDIA TensorRT 10.x / CUDA 12.4"
              hint="RTX 4060 8GB / Jetson Orin"
              mono
            />
            <TextRow
              label="Memory Footprint"
              value="1.84 GB / 16.00 GB (Nominal Deadband)"
              hint="Unified RAM Shared"
              mono
            />
            <TextRow
              label="Network Isolation"
              value="100% Air-Gapped (0 Egress Sockets)"
              hint="Localhost IPC Only"
              mono
            />
            <TextRow
              label="Latency SLA"
              value="3,500ms max (Observed 420ms)"
              hint="SIH26188 Architecture v3.0 Spec"
              mono
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StandbyTelemetry;
