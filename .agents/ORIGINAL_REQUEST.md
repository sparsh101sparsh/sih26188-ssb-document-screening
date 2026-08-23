# Original User Request

## 2026-08-23T15:33:48Z

Complete visual redesign, decluttering, and UX simplification of the **Sashastra Seema Bal (SSB) Field Screening System** (both Android and Computer apps) using the **Universal Product Design Language System (DLS)**.

Working directory: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford
Integrity mode: development

---

## 🎨 Unified Design Tokens (Deep Oceanic Environment)
Both the Android app and the Computer app (React/Tauri) must use the Deep Oceanic palette as their primary theme:
- **Base Canvas**: `#030B14`
- **Supporting Surface**: `#0B1A2E`
- **Inset / Header Surface**: `#081525`
- **Interactive Surface**: `#112745`
- **Structural Border**: `#1E3A5F`
- **Hover / Active Border**: `#2C5282`
- **Primary Text**: `#F8FAFC`
- **Secondary / Muted Text**: `#94A3B8` / `#64748B`
- **Brand Purple**: `#5B21B6` / `#4C1D95`
- **Interaction Blue**: `#2563EB` / `#3B82F6`
- **Amber Warning**: `#F59E0B`
- **Success / Emerald**: `#10B981` (foreground), `#ECFDF5` (background), `#A7F3D0` (border)
- **Danger / Crimson**: `#EF4444`

---

## Requirements

### R1. Android App Declutter & Redesign
Transform the Android field capture application into a focused operational tool:
1. **Layout & Colors**: Inject the Deep Oceanic color scheme across all composables. Use proportional corner radii (22% squircle rule, e.g. 11dp for 48dp elements, 8dp for smaller elements).
2. **Simplified Navigation**: Restructure to exactly 3 primary navigation tabs: CAPTURE, RESULTS, OUTBOX. Hide any other screen (like Gateway Diagnostics) behind a small, clean settings/cogs icon in the header.
3. **Quiet Capture View**: Clean up `DualCameraCaptureView.kt` to maximize the camera viewports. Only keep vital overlays: connection state (top bar) and capture button (bottom).
4. **Accordion-Based Diagnostics**: On the Results screen, place the detailed `InspectionPipelineTrace`, `CrossValidationMatrix`, and `DiscrepancyDiffTable` under thin, neat expandable accordions. The parent view must remain clean and dominated by the high-contrast Risk Score badge.

### R2. Computer App (React + Tauri) Declutter & Redesign
Simplify the computer app (`frontend/src/App.tsx`, components, and styles) to act as a quiet command-center monitor:
1. **Design Tokens**: Standardize colors in `frontend/src/index.css` using the Deep Oceanic variables. Remove neon gradients, random sparkles, and decorative blobs.
2. **Decluttered Dashboard**:
   - Primary view: Active screening queue / current document processing state, latest results, and connected devices tracker.
   - Remove redundant statistics cards, decorative KPIs, and large illustrations.
   - Hide technical details (raw JSON, pipeline trace) under expandable, clean accordions.
3. **Device Connection Panel**: Create a compact connected devices indicator in the header or sidebar that reads from the `/api/v1/devices` endpoint.

### R3. Remove Slop, Redundant Codes & Dead Views
Ensure codebase cleanliness based on `slop.md` guidelines:
- Remove dead tabs and navigation configurations from Android `NavigationScreen`.
- Consolidate double/triple connection status badges on both platforms into a single authoritative indicator in the header.
- Clean up unused imports, comments, and orphaned components across both frontends.

---

## Acceptance Criteria

### Android Application
- [ ] Primary background is `#030B14` (slate-950) and cards/surfaces are `#0B1A2E` (slate-900).
- [ ] Navigation is reduced to Capture, Results, and Outbox. Diagnostics button is a settings/cogs item in the top bar.
- [ ] Interactive elements use proportional radii matching the 22% rule where appropriate.
- [ ] Technical diagnostics (pipeline trace, cross-validation rules) are collapsed by default.

### Computer Application
- [ ] Core dashboard displays: Connected Phone details, Current active scan queue, and the latest Screening results.
- [ ] Colors conform exactly to the Deep Oceanic color system tokens (no neon glow/arbitrary gradients).
- [ ] Built frontend size remains optimized with zero TypeScript errors.

### Build Verification
- [ ] Android: `./gradlew assembleDebug` succeeds.
- [ ] Backend: `pytest tests/` passes.
- [ ] Frontend: `npm run build` succeeds.
