/**
 * SIH26188 — Preset Document and Face Image Synthesizer
 * Generates realistic canvas sample cards and mock inspection results for quick loading.
 */

import { DocumentInspectResponse } from '../types/api';
import {
  PRESET_CLEAN_PASSPORT,
  PRESET_FORGED_AADHAAR,
  PRESET_TAMPERED_STAMP,
  PRESET_PRESENTATION_SPOOF,
} from './mockData';
import { generateSyntheticHeatmap } from '../utils/heatmap';

export interface PresetItem {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  description: string;
  documentType: string;
  mockResponse: DocumentInspectResponse;
  generateImages: () => { docDataUrl: string; faceDataUrl: string; heatmapDataUrl: string };
}

/**
 * Procedurally render a simulated Passport Page
 */
function drawPassportCard(tampered = false): string {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background page - security pattern
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 600, 400);

  // Security Guilloche wave background
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  for (let i = 0; i < 400; i += 8) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.bezierCurveTo(200, i + Math.sin(i) * 15, 400, i - Math.sin(i) * 15, 600, i);
    ctx.stroke();
  }

  // Header band
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 600, 45);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('PASSPORT / PASSEPORT  •  REPUBLIC OF INDIA / RÉPUBLIQUE D\'INDE', 30, 28);

  // Portrait box
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(40, 70, 140, 180);
  ctx.strokeStyle = '#94a3b8';
  ctx.strokeRect(40, 70, 140, 180);

  // Simple avatar in portrait box
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.arc(110, 135, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(110, 230, 65, Math.PI, 0);
  ctx.fill();

  // Text Fields
  ctx.fillStyle = '#64748b';
  ctx.font = '10px sans-serif';
  ctx.fillText('Type / Type: P', 210, 80);
  ctx.fillText('Country Code / Code pays: IND', 340, 80);
  ctx.fillText('Passport No. / No du passeport', 210, 110);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('Z8192041', 210, 126);

  ctx.fillStyle = '#64748b';
  ctx.font = '10px sans-serif';
  ctx.fillText('Surname / Nom', 210, 150);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('SHARMA', 210, 166);

  ctx.fillStyle = '#64748b';
  ctx.font = '10px sans-serif';
  ctx.fillText('Given Names / Prénoms', 210, 190);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('RAHUL KUMAR', 210, 206);

  ctx.fillStyle = '#64748b';
  ctx.font = '10px sans-serif';
  ctx.fillText('Nationality / Nationalité: INDIAN', 210, 230);
  ctx.fillText('Date of Birth / Date de naissance: 14/05/1992', 210, 250);

  // MRZ Zone
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(20, 280, 560, 100);
  ctx.strokeStyle = '#cbd5e1';
  ctx.strokeRect(20, 280, 560, 100);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px monospace';
  ctx.fillText('P<INDSHARMA<<RAHUL<KUMAR<<<<<<<<<<<<<<<<<<<<', 35, 320);
  ctx.fillText('Z8192041<4IND9205142M3205138<<<<<<<<<<<<<<<4', 35, 355);

  if (tampered) {
    // Stamp alteration or scrape indicator
    ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
    ctx.fillRect(205, 238, 140, 20);
  }

  return canvas.toDataURL('image/png');
}

/**
 * Procedurally render a simulated Aadhaar Card
 */
function drawAadhaarCard(tampered = true): string {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 380;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Card Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 600, 380);

  // Top header bands (Saffron, White, Green)
  ctx.fillStyle = '#f97316';
  ctx.fillRect(0, 0, 600, 6);
  ctx.fillStyle = '#16a34a';
  ctx.fillRect(0, 374, 600, 6);

  // Emblem / Title
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('भारत सरकार  •  GOVERNMENT OF INDIA', 150, 35);

  // Photo
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(35, 60, 120, 150);
  ctx.strokeStyle = '#94a3b8';
  ctx.strokeRect(35, 60, 120, 150);
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.arc(95, 115, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(95, 195, 55, Math.PI, 0);
  ctx.fill();

  // Name & Details
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('अमित विक्रम सिंह', 180, 80);
  ctx.font = '14px sans-serif';
  ctx.fillText('Amit Vikram Singh', 180, 102);

  // DOB with intentional alteration styling
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText('जन्म तिथि / DOB:', 180, 135);
  ctx.fillStyle = tampered ? '#b91c1c' : '#0f172a';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(tampered ? '12/08/1994' : '12/08/1984', 290, 135);

  ctx.fillStyle = '#475569';
  ctx.font = '12px sans-serif';
  ctx.fillText('पुरुष / MALE', 180, 160);

  // QR Code representation
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(450, 60, 115, 115);
  // Internal QR pattern blocks
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(460, 70, 30, 30);
  ctx.fillRect(525, 70, 30, 30);
  ctx.fillRect(460, 135, 30, 30);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(468, 78, 14, 14);
  ctx.fillRect(533, 78, 14, 14);
  ctx.fillRect(468, 143, 14, 14);

  // UID Number Box
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(100, 270, 400, 45);
  ctx.strokeStyle = '#cbd5e1';
  ctx.strokeRect(100, 270, 400, 45);

  ctx.fillStyle = '#b91c1c';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('XXXX  XXXX  8921', 300, 300);
  ctx.textAlign = 'start';

  ctx.fillStyle = '#64748b';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('मेरा आधार, मेरी पहचान', 300, 345);
  ctx.textAlign = 'start';

  return canvas.toDataURL('image/png');
}

/**
 * Procedurally render a simulated Border Transit Permit with Rubber Stamp
 */
function drawPermitWithStamp(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#fffbeb';
  ctx.fillRect(0, 0, 600, 420);

  // Header
  ctx.fillStyle = '#78350f';
  ctx.font = 'bold 14px serif';
  ctx.textAlign = 'center';
  ctx.fillText('ROYAL GOVERNMENT OF BHUTAN', 300, 35);
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('DEPARTMENT OF IMMIGRATION — PEDESTRIAN ENTRY PERMIT', 300, 55);
  ctx.textAlign = 'start';

  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(25, 15, 550, 390);

  ctx.fillStyle = '#1e293b';
  ctx.font = '12px sans-serif';
  ctx.fillText('Permit No: EP-2026-08192', 50, 100);
  ctx.fillText('Holder Name: TASHI DORJI', 50, 125);
  ctx.fillText('Citizenship ID: 10802001928', 50, 150);
  ctx.fillText('Authorized Point of Entry: JAIGAON / PHUENTSHOLING', 50, 175);
  ctx.fillText('Validity: 01-AUG-2026 to 30-SEP-2026', 50, 200);

  // Counterfeit / Tampered Rubber Stamp in purple/blue ink
  ctx.save();
  ctx.translate(380, 260);
  ctx.rotate(-0.15);

  // Oval distortion (Suspicious vs standard circular)
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 75, 55, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(0, 0, 65, 45, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#1d4ed8';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('IMMIGRATION CHECK POST', 0, -25);
  ctx.font = 'bold 11px monospace';
  ctx.fillText('18-AUG-2026', 0, 0);
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('SONAULI [SUSPICIOUS]', 0, 25);
  ctx.restore();

  return canvas.toDataURL('image/png');
}

/**
 * Procedurally render a realistic ICAO-standard biometric face capture
 */
function drawFaceImage(spoof = false): string {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Clean studio gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 320);
  bgGrad.addColorStop(0, '#E2E8F0');
  bgGrad.addColorStop(1, '#CBD5E1');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 320, 320);

  if (spoof) {
    // Screen bezel & reflection
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 312, 312);

    // Moiré / raster lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
    ctx.lineWidth = 1;
    for (let y = 10; y < 310; y += 4) {
      ctx.beginPath();
      ctx.moveTo(10, y);
      ctx.lineTo(310, y);
      ctx.stroke();
    }
  }

  // Torso / Shoulders (Dark Navy Jacket)
  ctx.fillStyle = '#0F2750';
  ctx.beginPath();
  ctx.ellipse(160, 330, 130, 90, 0, Math.PI, 0);
  ctx.fill();

  // White Shirt Collar
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(140, 240);
  ctx.lineTo(160, 270);
  ctx.lineTo(180, 240);
  ctx.fill();

  // Neck
  ctx.fillStyle = '#D9A066';
  ctx.fillRect(145, 195, 30, 45);

  // Realistic Head / Jaw
  const skinGrad = ctx.createLinearGradient(120, 90, 200, 220);
  skinGrad.addColorStop(0, '#F5C6A5');
  skinGrad.addColorStop(1, '#E09E67');
  ctx.fillStyle = skinGrad;
  ctx.beginPath();
  ctx.ellipse(160, 140, 52, 68, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dark Hair
  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.ellipse(160, 95, 54, 38, 0, Math.PI, 0);
  ctx.fill();

  // Eyebrows
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(130, 118, 22, 4);
  ctx.fillRect(168, 118, 22, 4);

  // Eyes
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(141, 132, 9, 6, 0, 0, Math.PI * 2);
  ctx.ellipse(179, 132, 9, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.arc(141, 132, 4.5, 0, Math.PI * 2);
  ctx.arc(179, 132, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Nose
  ctx.strokeStyle = '#B87D4B';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(160, 130);
  ctx.lineTo(160, 155);
  ctx.lineTo(154, 158);
  ctx.stroke();

  // Lips
  ctx.fillStyle = '#C87258';
  ctx.beginPath();
  ctx.ellipse(160, 175, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toDataURL('image/png');
}

export const PRESET_LIST: PresetItem[] = [
  {
    id: 'clean_passport',
    name: 'Clean Indian Passport (P-IND)',
    badge: 'GREEN · AUTO-CLEAR',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    description: 'Authentic TD3 passport with verified Modulo-10 check digits, matching live biometrics, and zero forensic tampering.',
    documentType: 'passport',
    mockResponse: PRESET_CLEAN_PASSPORT,
    generateImages: () => {
      const doc = drawPassportCard(false);
      const face = drawFaceImage(false);
      const heatmap = generateSyntheticHeatmap(600, 400, []);
      return { docDataUrl: doc, faceDataUrl: face, heatmapDataUrl: heatmap };
    }
  },
  {
    id: 'forged_aadhaar',
    name: 'Forged Aadhaar (Tampered DOB / Invalid PKI)',
    badge: 'RED · DETAIN',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
    description: 'Scraped birth year (1984 -> 1994) detected by digital text tamper inspection (0.94) with invalid UIDAI RSA-2048 cryptographic signature.',
    documentType: 'aadhaar',
    mockResponse: PRESET_FORGED_AADHAAR,
    generateImages: () => {
      const doc = drawAadhaarCard(true);
      const face = drawFaceImage(false);
      const heatmap = generateSyntheticHeatmap(600, 380, [
        { bbox: [180, 120, 360, 150], peak: 0.94, label: 'TEXT_SCRAPING' }
      ]);
      return { docDataUrl: doc, faceDataUrl: face, heatmapDataUrl: heatmap };
    }
  },
  {
    id: 'tampered_stamp',
    name: 'Tampered Border Stamp (Sonauli / Jaigaon)',
    badge: 'AMBER · SECONDARY',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    description: 'Immigration stamp contour failed SSB registry template correlation (SSIM 0.42 < 0.75) and route context check.',
    documentType: 'permit',
    mockResponse: PRESET_TAMPERED_STAMP,
    generateImages: () => {
      const doc = drawPermitWithStamp();
      const face = drawFaceImage(false);
      const heatmap = generateSyntheticHeatmap(600, 420, [
        { bbox: [320, 200, 460, 320], peak: 0.68, label: 'STAMP_SPLICING' }
      ]);
      return { docDataUrl: doc, faceDataUrl: face, heatmapDataUrl: heatmap };
    }
  },
  {
    id: 'presentation_spoof',
    name: 'Presentation Spoof (Screen Replay)',
    badge: 'RED · CRITICAL TRIGGER',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
    description: 'Selfie anti-spoofing flagged 2D digital screen replay attack (Fourier Moiré pattern detected, Liveness: 0.04).',
    documentType: 'passport',
    mockResponse: PRESET_PRESENTATION_SPOOF,
    generateImages: () => {
      const doc = drawPassportCard(false);
      const face = drawFaceImage(true);
      const heatmap = generateSyntheticHeatmap(600, 400, []);
      return { docDataUrl: doc, faceDataUrl: face, heatmapDataUrl: heatmap };
    }
  }
];
