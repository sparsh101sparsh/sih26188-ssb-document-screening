# Survey Report: Frontend & Build Systems

**Document ID**: `SURVEY-FE-BUILD-001`  
**Date**: 2026-08-25  
**Author**: Teamwork Explorer (Survey Frontend & Build)  
**Target Project**: SIH26188 Border Document Screening & Biometric Verification System  
**Working Directory**: `.agents/teamwork_preview_explorer_survey_frontend`  

---

## 1. Executive Summary & Problem Scope

The SIH26188 system integrates three primary execution tiers:
1. **React 19 / Vite Desktop Frontend** (`sih26188_project/frontend`): Operator workstation for document inspection, biometrics, threat assessment, and field companion pairing.
2. **Android Jetpack Compose Handset App** (`sih26188_project/android-screening`): Frontline field scanner capturing travel documents and facial portraits.
3. **FastAPI Edge Server Backend** (`sih26188_project/backend`): Air-gapped AI/ML inference gateway orchestrating OCR, MRZ, liveness, face recognition, forensics, and SQLite sync.

This survey provides a complete audit of the Frontend and Build systems to guide the implementation of:
- **R4**: Idempotent QR pairing via `SSBPAIR://` protocol payload and `/api/v1/companion/pairing-qr`.
- **R8**: Desktop `ConnectModal.tsx` connection state machine (`CONNECTED`, `CONNECTING`/`DISCOVERING`, `DISCONNECTED`) and advanced manual IP entry.
- **R6**: Complete elimination of hardcoded LAN IPs (such as `192.168.1.61` and `10.198.211`) across the codebase.
- **R11**: Build validation and reproducible delivery pipelines across Frontend (`npm run build`), Android (`./gradlew assembleDebug`), and Backend (`pytest tests/`).

---

## 2. Frontend Architecture & Component Survey

### 2.1 `ConnectModal.tsx` Code Audit
- **File Path**: `sih26188_project/frontend/src/components/ConnectModal.tsx` (604 lines, 26.6 KB)
- **Component Interface**:
  ```typescript
  export interface ConnectModalProps {
    isOpen: boolean;
    onClose: () => void;
    serverUrl?: string;
    onSimulatedCapture?: (captureType: 'document' | 'selfie') => void;
  }
  ```
- **Current State Variables**:
  - `activeTab`: `'qr' | 'devices' | 'test' | 'tethering'` (default: `'qr'`)
  - `companionData`: `CompanionInfoResponse | null` (polled from `/api/v1/companion/info` every 3000ms)
  - `isLoading`: `boolean`
  - `copiedKey`: `string | null`
  - `simulatingMode`: `'document' | 'selfie' | null`
  - `simulationStatus`: `string | null`

#### Flaws Identified in Current `ConnectModal.tsx`:
1. **Missing `SSBPAIR://` Protocol Payload**:
   - Lines 163–175: The QR code value is computed as:
     ```typescript
     const rawGateway = (typeof companionData?.gateway_url === 'string' && companionData.gateway_url.trim()) || ...
     const primaryGateway = (typeof rawGateway === 'string' ? rawGateway.replace(/\/+$/, '') : '') || 'http://localhost:8000';
     ```
   - The QR code directly encodes standard HTTP URL (`http://192.168.x.x:8000`) instead of the structured `qr_payload` (`SSBPAIR://SSBGateway/TOKEN`) required by R4.
2. **Missing Explicit Connection State Machine**:
   - Connection status is derived purely via a binary check: `const activeDeviceCount = companionData?.active_devices_count ?? 0;` (lines 178, 205–218).
   - There is no distinct `CONNECTING`, `DISCOVERING`, `DISCONNECTED`, or `ERROR` state with corresponding visual feedback (spinners, pulse animations, reconnection retry triggers).
3. **No Interactive Manual IP Entry / Validation**:
   - Lines 373–404: The manual address section is purely read-only (`<code className="...">{primaryGateway}</code>`) with a copy button. Operators cannot manually type a custom LAN IP, specify a custom port, test gateway reachability, or switch between available network interfaces.
4. **Hardcoded Fallback URL**:
   - Line 70 and Line 162: Hardcodes `'http://localhost:8000'`.
5. **No Multi-Interface Selector**:
   - `companionData.local_ips` is received from backend (e.g. `["192.168.1.50", "10.0.0.2"]`), but `ConnectModal.tsx` does not allow selecting which interface the QR code should bind to.

---

### 2.2 QR Code Generation Mechanism
- **Libraries in Use**:
  - `qrcode.react` (`QRCodeSVG`, version 4.2.0): Used on Line 329 for scalable, vector-based SVG rendering with `shapeRendering="crispEdges"`.
  - `qrcode` (version 1.5.4): Used in utility function `generateQRMatrix(text, options)` (Lines 48–82) to calculate boolean module matrices for ISO/IEC 18004 QR codes.
- **Test Coverage**:
  - `frontend/tests/qr_generation.test.tsx` contains 17 assertions verifying finder patterns (7x7 corners), timing patterns, Unicode/emoji payload handling, and matrix bounds. All 17 tests pass.

---

### 2.3 Edge Gateway & Companion API Client (`services/api.ts`)
- **File Path**: `sih26188_project/frontend/src/services/api.ts` (367 lines)
- **Base URL Resolution**:
  ```typescript
  export const API_BASE_URL: string =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) ||
    ((globalThis as any)?.process?.env?.VITE_API_BASE_URL) ||
    'http://localhost:8000';
  ```
- **Existing Companion Endpoints**:
  - `getCompanionInfo()`: `GET /api/v1/companion/info` → returns `CompanionInfoResponse`
  - `simulateCompanionUpload(mode)`: `POST /api/v1/companion/simulate`
  - `clearCompanionCapture()`: `POST /api/v1/companion/clear`
  - `getLatestCompanionCapture()`: `GET /api/v1/companion/latest`
  - `getCompanionGallery(limit)`: `GET /api/v1/companion/gallery?limit=50`
  - `deleteCompanionGalleryItem(seqId)`: `DELETE /api/v1/companion/gallery/{seqId}`
  - `postScreeningVerdict(...)`: `POST /api/v1/companion/verdict`
  - `getCompanionVerdict(seqId)`: `GET /api/v1/companion/verdict` or `/api/v1/companion/result/{seqId}`
- **Required New Endpoint (R4)**:
  - `getPairingQr()`: `GET /api/v1/companion/pairing-qr`
    - Response schema:
      ```typescript
      export interface PairingQrResponse {
        status: string;
        qr_payload: string;        // "SSBPAIR://SSBGateway/TOKEN"
        gateway_id: string;        // "SSBGateway"
        pairing_token: string;     // 8-character token
        current_lan_ip: string;    // Selected physical LAN IP
        port: number;              // Gateway port (8000)
        fallback_url: string;      // "http://<ip>:8000"
        available_interfaces?: Array<{ name: string; ip: string }>;
      }
      ```

---

### 2.4 Connection Status & Cross-Component Integration
- **Header Status (`Header.tsx`)**:
  - Periodically polls `/api/v1/devices` every 4000ms to count active handsets (`activeDeviceCount`).
  - Displays Wi-Fi status pill:
    - If `activeDeviceCount > 0`: Emerald badge with animated ping dot, `"Wi-Fi Connected"`, device count badge.
    - If `activeDeviceCount === 0`: Indigo badge `"Connect Wi-Fi"`.
  - Clicking the badge triggers `onOpenConnectModal()`.
- **Inference Streaming (`App.tsx`)**:
  - Sets up Server-Sent Events (SSE) stream at `/api/v1/companion/stream` with fallback polling `/api/v1/companion/gallery?limit=50` every 2500ms.
  - Automatically loads incoming field capture packets into Document and Biometric bays and executes screening.
- **Settings Hub (`SettingsHubModal.tsx`)**:
  - Tab 4 (`companion`) displays local gateway URL and companion connection status.

---

## 3. Detailed Blueprint for R4 & R8 Implementation

### 3.1 Pairing QR Endpoint Integration (R4)
1. **API Schema in `types/api.ts`**:
   ```typescript
   export interface PairingQrResponse {
     status: string;
     qr_payload: string;
     gateway_id: string;
     pairing_token: string;
     current_lan_ip: string;
     port: number;
     fallback_url: string;
   }
   ```
2. **Client Function in `services/api.ts`**:
   ```typescript
   export async function getPairingQr(): Promise<PairingQrResponse | null> {
     try {
       const res = await fetch(`${API_BASE_URL}/api/v1/companion/pairing-qr`);
       if (res.ok) {
         return await res.json();
       }
       return null;
     } catch (err) {
       console.warn('Failed to fetch pairing QR data:', err);
       return null;
     }
   }
   ```

### 3.2 State Machine Design for `ConnectModal.tsx` (R8)
The connection state machine should manage 4 distinct operational states:
```
  [ DISCONNECTED ] <--------------------+
        |                               |
  (Device Pings /                       | (Session Timeout /
   User starts test)                    |  Devices Disconnect)
        v                               |
  [ CONNECTING / DISCOVERING ]          |
        |                               |
  (Handshake Confirmed)                 |
        v                               |
  [ CONNECTED ] ------------------------+
```

1. **`CONNECTED`**:
   - **Visuals**: Vibrant green banner (`bg-emerald-50 border-emerald-300`), glowing emerald dot with ripple effect (`animate-ping`).
   - **Details**: Connected device list (IP address, user agent, checkpoint ID, last seen timestamp, round-trip latency).
   - **Actions**: "Disconnect Handset", "Test Capture Dispatches", "View Photo Stream".
2. **`CONNECTING` / `DISCOVERING`**:
   - **Visuals**: Animated spinner (`RefreshCw` or `Activity` spinning), amber status pill.
   - **Details**: "Listening for SSBPAIR handshake on port 8000...", "Subnet broadcast active via mDNS/NSD".
3. **`DISCONNECTED`**:
   - **Visuals**: Prominent high-contrast QR Code displaying the `SSBPAIR://` tokenized payload with 3-step illustrated instructions.
   - **Details**: Active LAN IP, Gateway ID, Session Token.
4. **`ERROR` / `AIRGAP_OFFLINE`**:
   - **Visuals**: Red warning pill if backend is unreachable, with a 1-click "Retry Gateway Probe" button.

### 3.3 Advanced Expandable Manual IP Section (R8)
Add a collapsible accordion panel inside the QR tab:
- **Toggle**: `<button>` with Chevron down/up: "⚙️ Advanced / Manual Gateway IP Configuration".
- **Fields**:
  - `Gateway IP Address`: Input with IPv4 regex validation (`^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$`).
  - `Gateway Port`: Numeric input (default `8000`, range 1024–65535).
  - `Preview URL`: Dynamic readout (`http://<ip>:<port>`).
- **Interactive Actions**:
  - **"Ping / Test Connection"**: Asynchronously pings `http://<ip>:<port>/api/v1/health` and displays badge ("✓ Reached in 14ms" or "✗ Unreachable").
  - **"Switch QR to this IP"**: Overrides the QR code content to encode the custom IP address.
  - **"Copy Full URL"**: Copies formatted string to clipboard with checkmark confirmation.

---

## 4. Comprehensive Audit of Hardcoded IPs (R6)

A thorough search across the entire project repository identified the following occurrences:

| File Path | Line Number | Code Content | Resolution / Fix Plan |
|---|---|---|---|
| `android-screening/app/src/main/java/com/ssb/fieldscreening/ui/components/WifiConnectScreen.kt` | 95 | `currentGatewayUrl: String = "http://192.168.1.61:8000"` | Replace default with `""` |
| `android-screening/app/src/main/java/com/ssb/fieldscreening/ui/viewmodel/SsbScreeningViewModel.kt` | 62 | `val customGatewayUrl: String = "http://192.168.1.61:8000"` | Replace default with `""` |
| `android-screening/app/src/main/java/com/ssb/fieldscreening/ui/viewmodel/SsbScreeningViewModel.kt` | 89 | `customGatewayUrl = WifiUtils.getLastConnectedGateway(application) ?: "http://192.168.1.61:8000"` | Replace fallback with `""` |
| `android-screening/app/src/main/java/com/ssb/fieldscreening/util/WifiUtils.kt` | 106 | `if (input.isBlank()) return "http://192.168.1.61:8000"` | Return `""` when input is blank |

### Confirmation on `10.198.211`:
- A full recursive search confirms **zero** occurrences of `10.198.211` in source code files. (It was previously in historical logs/briefings).
- In Android `WifiUtils.kt`, ensure no subnet probe lists or default fallbacks include static unconfigured subnets.

---

## 5. Build Toolchains & Delivery Engineering (R11)

### 5.1 Frontend Build & Test Verification
- **Environment**: Node.js v20+, Vite 6.1.0, TypeScript 5.7.3.
- **Build Command**:
  ```bash
  cd sih26188_project/frontend
  npm run build
  ```
  - **Result**: `tsc -b && vite build` completes in ~3.44s.
  - **Output Assets**:
    - `dist/index.html` (1.23 kB)
    - `dist/assets/index-DdOM61-S.css` (63.54 kB)
    - `dist/assets/index-_OzvCxQW.js` (919.09 kB)
- **Unit Test Command**:
  ```bash
  cd sih26188_project/frontend
  npm test
  ```
  - **Result**: Executes `node tests/run_tests.mjs`, running 5 suites (`adversarial_challenger_m1_theme`, `primitives_adversarial`, `primitives_interactive_adversarial`, `adversarial_challenger_m4_deep_e2e`, `qr_generation`).
  - **Status**: 73/73 tests pass with 0 failures.

### 5.2 Android Screening Build & Delivery Verification
- **Environment**:
  - Gradle 9.3.1 Wrapper (`gradlew`)
  - Target SDK: 36, Compile SDK: 36, Min SDK: 24
  - JDK: Bundled Android Studio JBR (`/Applications/Android Studio.app/Contents/jbr/Contents/Home`)
- **Build Execution**:
  ```bash
  cd sih26188_project/android-screening
  JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew assembleDebug --no-daemon
  ```
  - **Result**: `BUILD SUCCESSFUL in 10s` (38 tasks up-to-date).
  - **Output APK**: `android-screening/app/build/outputs/apk/debug/app-debug.apk` (45.0 MB).
- **Delivery Step**:
  ```bash
  cp android-screening/app/build/outputs/apk/debug/app-debug.apk ~/Desktop/SSB-FieldScreening.apk
  ```

### 5.3 Backend Build & Test Verification
- **Environment**: Python 3.11 (`sih26188_project/.venv311`).
- **Core Test Command**:
  ```bash
  cd sih26188_project/backend
  /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/.venv311/bin/pytest tests/test_risk_engine.py
  ```
  - **Result**: 23/23 tests pass in 4.41s.
- **R9 Test Target**:
  - Will add `backend/tests/test_network_interface.py` to test `select_lan_ip()`, `/api/v1/companion/pairing-qr`, and `capture_id` upload deduplication.

---

## 6. Recommendations & Action Plan for Implementers

1. **Frontend (`frontend/src/`)**:
   - Update `types/api.ts` with `PairingQrResponse` interface.
   - Update `services/api.ts` with `getPairingQr()` fetcher.
   - Refactor `ConnectModal.tsx` to:
     - Consume `/api/v1/companion/pairing-qr` and encode `qr_payload`.
     - Implement clean connection states (`CONNECTED`, `CONNECTING`, `DISCONNECTED`).
     - Provide an interactive expandable manual IP configuration drawer with live health ping.
     - Add network interface selector dropdown if multiple LAN IPs are available.
   - Run `npm run build` and `npm test` to verify zero regression.
2. **Android (`android-screening/`)**:
   - Clean up `WifiConnectScreen.kt`, `SsbScreeningViewModel.kt`, and `WifiUtils.kt` to eliminate `"http://192.168.1.61:8000"`.
   - Ensure blank gateway inputs default to `""` and display `"No gateway configured"`.
   - Build with `./gradlew assembleDebug --no-daemon` using Android Studio JDK and copy APK to `~/Desktop/SSB-FieldScreening.apk`.
3. **Backend (`backend/`)**:
   - Ensure `/api/v1/companion/pairing-qr` is served and tested.
   - Verify all tests pass with `pytest`.
