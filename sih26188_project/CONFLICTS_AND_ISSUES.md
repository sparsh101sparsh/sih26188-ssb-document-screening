# Codebase Conflicts and Issues Documentation

## Overview
This document catalogs all identified conflicts, inconsistencies, and issues across the Android and frontend codebase for the SSI26188 Border Document Screening project.

---

## CRITICAL CONFLICTS

### 1. Android Theme Mismatch (CRITICAL)
**Location:** `android-agent/app/src/main/res/values/themes.xml`, `colors.xml`, layout files

**Issue:**
- **PROJECT.md Requirement:** "Android Whitish Theme - Outdoor sunlight-legible whitish Compose theme (#F8FAFC base, #FFFFFF surfaces, #0F172A slate text)"
- **Actual Implementation:** Dark theme with black background (`@color/black`), dark gradients, gold accents
- **Files Affected:**
  - `themes.xml` - Dark theme configured
  - `colors.xml` - Dark color palette
  - `activity_main.xml` - Black背景, dark gradient overlays
  - All drawable XMLs - Dark styling

**Impact:** Complete violation of project requirements. App will not be sunlight-legible outdoors.

**Resolution Required:**
- Convert entire Android app to whitish theme
- Change background from black to #F8FAFC
- Change text from white to #0F172A
- Update all drawable resources for light theme
- Test for outdoor legibility

---

### 2. Android Native Library Crash (CRITICAL)
**Location:** `android-agent/app/src/main/java/com/ssb/fieldcamera/MainActivity.kt` line 288-290

**Issue:**
```kotlin
companion object {
    init {
        System.loadLibrary("native-lib")  // ❌ NO SUCH LIBRARY EXISTS
    }
}
```

**Impact:** App will crash on startup with `UnsatisfiedLinkError`.

**Resolution Required:**
- Remove the `System.loadLibrary("native-lib")` call entirely
- No native library code exists in the project
- This line serves no purpose and causes crashes

---

### 3. API Contract Mismatch: capture_type (HIGH)
**Location:** Multiple files

**Issue:**
- **Android sends:** `"selfie"` or `"document"` (CompanionApiService.kt line 192)
- **Backend expects:** `"traveler_live"` (PROJECT.md line 44)
- **Frontend types:** `'document' | 'selfie' | 'face' | string` (api.ts line 267)

**Files Affected:**
- `android-agent/app/src/main/java/com/ssb/fieldcamera/MainActivity.kt` line 192
- `android-agent/app/src/main/java/com/ssb/fieldcamera/CompanionApiService.kt` line 26
- `frontend/src/types/api.ts` line 267
- `PROJECT.md` line 44

**Impact:** Uploads may fail or be misclassified by backend.

**Resolution Required:**
- Align all three components on same enum values
- Recommended: Use `"selfie"` and `"document"` (most descriptive)
- Update backend documentation to match
- Update PROJECT.md to reflect actual implementation

---

### 4. Missing Android Verdict Display (HIGH)
**Location:** `android-agent/app/src/main/java/com/ssb/fieldcamera/MainActivity.kt`

**Issue:**
- **PROJECT.md Requirement:** "Android Instant Verdict Display - Display screening verdict and risk summary banner upon completion"
- **Actual Implementation:** Android app only uploads photos, never receives or displays screening results
- No API call to get results
- No UI components to display verdict

**Impact:** Feature completely missing from Android app.

**Resolution Required:**
- Add API endpoint to fetch screening results (e.g., `GET /api/v1/companion/result/{sequence_id}`)
- Add UI components to display verdict banner
- Implement result polling or WebSocket connection
- Add risk summary display

---

### 5. Hardcoded Server URL (MEDIUM)
**Location:** `android-agent/app/src/main/java/com/ssb/fieldcamera/CompanionApiService.kt` line 18

**Issue:**
```kotlin
private val serverUrl = "http://10.0.2.2:8000" // Hardcoded for emulator
```

**Impact:** 
- Cannot connect to real devices
- No way to configure server URL
- Requires code change for different environments

**Resolution Required:**
- Add settings screen to configure server URL
- Store in SharedPreferences
- Add network discovery for local desktop
- Support both emulator (10.0.2.2) and real device (desktop IP)

---

## UI/UX INCONSISTENCIES

### 6. Android Shutter Button Size Mismatch
**Location:** `android-agent/app/src/main/res/layout/activity_main.xml` line 170

**Issue:**
- **PROJECT.md Requirement:** "56dp shutter button"
- **Actual Implementation:** 80dp shutter button

**Impact:** Minor, but violates specification.

**Resolution Required:**
- Change button size to 56dp to match spec

---

### 7. Android Shutter Button Text Missing
**Location:** `android-agent/app/src/main/res/layout/activity_main.xml` line 168-178

**Issue:**
- **PROJECT.md Requirement:** "📸 SNAP TRAVELER PHOTO" text on shutter button
- **Actual Implementation:** No text, just circular button

**Impact:** Less clear UX, violates spec.

**Resolution Required:**
- Add text label below or on button
- Or add icon + text combination

---

### 8. Connection Status Text Mismatch
**Location:** `android-agent/app/src/main/java/com/ssb/fieldcamera/MainActivity.kt` lines 231, 235

**Issue:**
- **PROJECT.md Requirement:** "🟢 Connected to Desktop Terminal"
- **Actual Implementation:** "Connected" or "No connection"

**Impact:** Less descriptive, violates spec.

**Resolution Required:**
- Update status text to include emoji and "Desktop Terminal"

---

## DEPENDENCY CONFLICTS

### 9. Unused Retrofit Dependencies (LOW)
**Location:** `android-agent/app/build.gradle` lines 54-55

**Issue:**
```gradle
implementation 'com.squareup.retrofit2:retrofit:2.9.0'
implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
```

**Impact:** 
- Retrofit is imported but not used
- CompanionApiService uses raw OkHttp instead
- Adds unnecessary APK size

**Resolution Required:**
- Either remove Retrofit dependencies
- Or refactor CompanionApiService to use Retrofit for better type safety

---

### 10. Room Annotation Processor Duplication (LOW)
**Location:** `android-agent/app/build.gradle` lines 66-67

**Issue:**
```gradle
annotationProcessor "androidx.room:room-compiler:${room_version}"
kapt "androidx.room:room-compiler:${room_version}"
```

**Impact:** 
- Both annotationProcessor and kapt specified
- May cause build warnings or conflicts
- kapt is the correct one for Kotlin

**Resolution Required:**
- Remove `annotationProcessor` line
- Keep only `kapt` for Kotlin projects

---

## CODE QUALITY ISSUES

### 11. Unused Method in CompanionApiService (LOW)
**Location:** `android-agent/app/src/main/java/com/ssb/fieldcamera/CompanionApiService.kt` lines 57-62, 64-66

**Issue:**
```kotlin
fun getDeviceId(context: Context): String { ... }  // Never called
fun setServerUrl(url: String) { ... }  // Empty implementation
```

**Impact:** Dead code, maintenance burden.

**Resolution Required:**
- Remove unused methods
- Or implement setServerUrl() properly for configuration

---

### 12. Unused SHA-256 Calculation (LOW)
**Location:** `android-agent/app/src/main/java/com/ssb/fieldcamera/OutboxManager.kt` lines 112-116

**Issue:**
```kotlin
fun calculateSHA256(bytes: ByteArray): String { ... }  // Never called
```

**Impact:** 
- PROJECT.md mentions SHA-256 audit hash generation
- Method exists but is never used
- No audit trail actually implemented

**Resolution Required:**
- Either implement audit hash storage in OutboxItem
- Or remove unused method

---

### 13. Outbox Retry Limit Not Enforced (MEDIUM)
**Location:** `android-agent/app/src/main/java/com/ssb/fieldcamera/OutboxManager.kt` lines 97-100

**Issue:**
```kotlin
if (item.retryCount >= 3) {
    // Skip items that have exceeded retry limit
    continue  // ❌ Items are never deleted, just skipped forever
}
```

**Impact:** 
- Failed items accumulate in database forever
- No cleanup mechanism
- Database grows unbounded

**Resolution Required:**
- Delete items after retry limit exceeded
- Or add separate cleanup job
- Add UI to show failed items

---

## FRONTEND ISSUES

### 14. Connect Modal Server URL Prop Unused (LOW)
**Location:** `frontend/src/components/ConnectModal.tsx`

**Issue:**
- Component accepts `serverUrl` prop
- But simplified modal no longer displays it
- Prop is passed but ignored

**Impact:** Minor inconsistency.

**Resolution Required:**
- Remove unused prop
- Or add back URL display if needed

---

### 15. Inconsistent Terminology (MEDIUM)
**Location:** Multiple frontend components

**Issue:**
- Some places use "phone connected"
- Some use "Field Unit Connected"
- Some use "device connected"
- Inconsistent across codebase

**Impact:** Confusing UX, unprofessional.

**Resolution Required:**
- Standardize on one term across all components
- Recommended: "Phone connected" (simplest, non-technical)

---

## BUILD/CONFIGURATION ISSUES

### 16. Missing Gradle Properties (LOW)
**Location:** `android-agent/gradle.properties`

**Issue:**
- File exists but may be incomplete
- Should include JVM args, AndroidX flags, Kotlin version

**Resolution Required:**
- Verify gradle.properties has all necessary settings
- Add if missing

---

### 17. ProGuard Rules Incomplete (LOW)
**Location:** `android-agent/proguard-rules.pro`

**Issue:**
- Basic rules present
- May need more specific rules for Room, OkHttp, CameraX

**Resolution Required:**
- Add comprehensive ProGuard rules for all libraries
- Test release builds

---

## MISSING FEATURES

### 18. No Android Settings Screen (HIGH)
**Location:** Not implemented

**Issue:**
- No way to configure server URL
- No way to view device ID
- No way to clear outbox
- No way to view sync history

**Resolution Required:**
- Add SettingsActivity
- Add preferences for server URL, device ID
- Add outbox management UI

---

### 19. No Error Handling for Network Failures (MEDIUM)
**Location:** `android-agent/app/src/main/java/com/ssb/fieldcamera/MainActivity.kt`

**Issue:**
- Upload failures silently fall back to outbox
- No user notification of network issues
- No retry UI

**Resolution Required:**
- Add toast notifications for network errors
- Add manual retry button
- Show connection quality indicator

---

### 20. No Camera Error Recovery (MEDIUM)
**Location:** `android-agent/app/src/main/java/com/ssb/fieldcamera/MainActivity.kt` line 156

**Issue:**
```kotlin
} catch (exc: Exception) {
    Toast.makeText(this, "Camera failed: ${exc.message}", Toast.LENGTH_SHORT).show()
}
```

**Impact:** 
- Generic error message
- No recovery mechanism
- User must restart app

**Resolution Required:**
- Add specific error messages
- Add retry camera button
- Add camera permission request flow

---

## ADDITIONAL LINE-BY-LINE CONFLICTS FOUND

### 21. MainActivity.kt Line 17 - Unused Import (LOW)
**Location:** `android-agent/app/src/main/java/com/ssb/fieldcamera/MainActivity.kt` line 17

**Issue:**
```kotlin
import java.io.ByteArrayOutputStream  // ❌ Never used
```

**Impact:** Dead code, minor bloat.

**Resolution Required:**
- Remove unused import

---

### 22. CompanionApiService.kt Line 7 - Unused Import (LOW)
**Location:** `android-agent/app/src/main/java/com/ssb/fieldcamera/CompanionApiService.kt` line 7

**Issue:**
```kotlin
import org.json.JSONObject  // ❌ Never used
```

**Impact:** Dead code, minor bloat.

**Resolution Required:**
- Remove unused import

---

### 23. CompanionApiService.kt Line 8 - Unused Import (LOW)
**Location:** `android-agent/app/src/main/java/com/ssb/fieldcamera/CompanionApiService.kt` line 8

**Issue:**
```kotlin
import java.io.IOException  // ❌ Never used
```

**Impact:** Dead code, minor bloat.

**Resolution Required:**
- Remove unused import

---

### 24. OutboxManager.kt Line 7 - Unused Import (LOW)
**Location:** `android-agent/app/src/main/java/com/ssb/fieldcamera/OutboxManager.kt` line 7

**Issue:**
```kotlin
import java.security.MessageDigest  // ❌ Only used in calculateSHA256() which is never called
```

**Impact:** Dead code, minor bloat.

**Resolution Required:**
- Remove unused import and calculateSHA256() method

---

### 25. activity_main.xml Line 7 - Hardcoded Dark Background (CRITICAL)
**Location:** `android-agent/app/src/main/res/layout/activity_main.xml` line 7

**Issue:**
```xml
android:background="@color/black"  <!-- ❌ Should be #F8FAFC for whitish theme -->
```

**Impact:** Violates whitish theme requirement.

**Resolution Required:**
- Change to `android:background="#F8FAFC"` or use whitish color resource

---

### 26. activity_main.xml Line 170 - Shutter Button Size Mismatch (LOW)
**Location:** `android-agent/app/src/main/res/layout/activity_main.xml` line 170

**Issue:**
```xml
android:layout_width="80dp"  <!-- ❌ Should be 56dp per PROJECT.md -->
android:layout_height="80dp"  <!-- ❌ Should be 56dp per PROJECT.md -->
```

**Impact:** Violates specification.

**Resolution Required:**
- Change both to 56dp

---

### 27. activity_main.xml Line 168 - Missing Shutter Button Text (LOW)
**Location:** `android-agent/app/src/main/res/layout/activity_main.xml` line 168-178

**Issue:**
```xml
<Button
    android:id="@+id/shutterButton"
    android:layout_width="80dp"
    android:layout_height="80dp"
    android:background="@drawable/shutter_button"
    android:contentDescription="Capture Photo"
    android:elevation="8dp"
    <!-- ❌ Missing android:text="📸 SNAP TRAVELER PHOTO" -->
```

**Impact:** Missing required text label.

**Resolution Required:**
- Add text label below button or change to TextView + Button combination

---

### 28. colors.xml - Entire File Wrong Theme (CRITICAL)
**Location:** `android-agent/app/src/main/res/values/colors.xml` lines 1-15

**Issue:**
```xml
<color name="black">#000000</color>  <!-- ❌ Should be whitish colors -->
<color name="dark_gray">#1a1a1a</color>
<color name="medium_gray">#2d2d2d</color>
<color name="light_gray">#4a4a4a</color>
<color name="white">#ffffff</color>
<color name="accent_gold">#FFD700</color>
```

**Impact:** Entire color palette is dark theme.

**Resolution Required:**
- Replace with whitish palette:
  - Background: #F8FAFC
  - Surface: #FFFFFF
  - Text: #0F172A
  - Accent: #2563EB (blue) or keep gold if preferred

---

### 29. themes.xml - Entire File Wrong Theme (CRITICAL)
**Location:** `android-agent/app/src/main/res/values/themes.xml` lines 1-22

**Issue:**
```xml
<item name="colorPrimary">#000000</item>  <!-- ❌ Should be whitish -->
<item name="colorPrimaryVariant">#1a1a1a</item>
<item name="colorOnPrimary">#ffffff</item>
<item name="android:statusBarColor">#000000</item>
<item name="android:navigationBarColor">#000000</item>
<item name="android:windowBackground">#000000</item>
```

**Impact:** Entire theme is dark.

**Resolution Required:**
- Replace with whitish theme values matching PROJECT.md requirements

---

### 30. dark_gradient_top.xml - Wrong Gradient (CRITICAL)
**Location:** `android-agent/app/src/main/res/drawable/dark_gradient_top.xml` lines 1-8

**Issue:**
```xml
<gradient
    android:startColor="#CC000000"  <!-- ❌ Dark gradient -->
    android:endColor="#00000000"
    android:angle="270" />
```

**Impact:** Dark gradient overlay on camera preview.

**Resolution Required:**
- Change to light gradient or remove entirely for whitish theme

---

### 31. dark_gradient_bottom.xml - Wrong Gradient (CRITICAL)
**Location:** `android-agent/app/src/main/res/drawable/dark_gradient_bottom.xml` lines 1-8

**Issue:**
```xml
<gradient
    android:startColor="#CC000000"  <!-- ❌ Dark gradient -->
    android:endColor="#00000000"
    android:angle="90" />
```

**Impact:** Dark gradient overlay on camera preview.

**Resolution Required:**
- Change to light gradient or remove entirely for whitish theme

---

### 32. status_badge.xml - Dark Badge Background (CRITICAL)
**Location:** `android-agent/app/src/main/res/drawable/status_badge.xml` lines 1-7

**Issue:**
```xml
<solid android:color="#CC1a1A1A" />  <!-- ❌ Dark semi-transparent background -->
<corners android:radius="20dp" />
<stroke android:width="1dp" android:color="#33FFFFFF" />
```

**Impact:** Dark badge won't be visible on whitish background.

**Resolution Required:**
- Change to light background with dark text for whitish theme

---

### 33. app/build.gradle Line 66 - Duplicate Annotation Processor (LOW)
**Location:** `android-agent/app/build.gradle` line 66

**Issue:**
```gradle
annotationProcessor "androidx.room:room-compiler:${room_version}"  // ❌ Duplicate
kapt "androidx.room:room-compiler:${room_version}"  // ✅ Correct for Kotlin
```

**Impact:** Build warning or conflict.

**Resolution Required:**
- Remove annotationProcessor line, keep only kapt

---

### 34. app/build.gradle Lines 54-55 - Unused Retrofit Dependencies (LOW)
**Location:** `android-agent/app/build.gradle` lines 54-55

**Issue:**
```gradle
implementation 'com.squareup.retrofit2:retrofit:2.9.0'  // ❌ Never used
implementation 'com.squareup.retrofit2:converter-gson:2.9.0'  // ❌ Never used
```

**Impact:** APK bloat, unused dependencies.

**Resolution Required:**
- Remove Retrofit dependencies
- Or refactor CompanionApiService to use Retrofit

---

### 35. build.gradle Line 3 - Deprecated Kotlin Version (LOW)
**Location:** `android-agent/build.gradle` line 3

**Issue:**
```gradle
ext.kotlin_version = "1.9.0"  // ❌ Old version, current is 1.9.20+
```

**Impact:** May have security issues or missing features.

**Resolution Required:**
- Update to latest stable Kotlin version

---

### 36. settings.gradle Line 9 - Repository Mode Conflict (LOW)
**Location:** `android-agent/settings.gradle` line 9

**Issue:**
```gradle
repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)  // May cause issues
```

**Impact:** May fail if project repos are defined.

**Resolution Required:**
- Change to `PREFER_PROJECT` or verify no project repos exist

---

### 37. App.tsx Line 166-168 - Fake SHA256 Hash (LOW)
**Location:** `frontend/src/App.tsx` lines 166-168

**Issue:**
```typescript
const makeHash = () =>
  `SHA256:${Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('')}`;  // ❌ Fake hash, not real SHA256
```

**Impact:** Audit hashes are fake, not cryptographically valid.

**Resolution Required:**
- Implement real SHA-256 calculation using Web Crypto API
- Or remove fake hash generation

---

### 38. App.tsx Lines 187-296 - Duplicate Model Version Strings (LOW)
**Location:** `frontend/src/App.tsx` lines 187-296

**Issue:**
```typescript
model_versions: {
  pp_ocr: 'PP-OCRv4-Multilingual',  // ❌ Simplified jargon but still technical
  mrz_engine: 'ICAO-9303-v2.1',
  face_embedder: 'Face Matcher',  // ✓ Simplified
  tamper_detector: 'Tamper Check',  // ✓ Simplified
},
```

**Impact:** Inconsistent simplification - some still technical.

**Resolution Required:**
- Simplify all model version names consistently
- Or remove model versions from UI entirely

---

### 39. App.tsx Line 397 - Inconsistent Companion Notification (LOW)
**Location:** `frontend/src/App.tsx` line 397

**Issue:**
```typescript
setCompanionNotification('Live');  // ❌ Should be more descriptive
```

**Impact:** Unclear notification message.

**Resolution Required:**
- Change to "Phone connected" or similar

---

### 40. ConnectModal.tsx Line 7 - Unused Prop (LOW)
**Location:** `frontend/src/components/ConnectModal.tsx` line 7

**Issue:**
```typescript
serverUrl: string;  // ❌ Accepted but never used in component
```

**Impact:** Prop passed but ignored.

**Resolution Required:**
- Remove unused prop
- Or add server URL display to modal

---

### 41. ConnectModal.tsx Lines 44-47 - USB-Centric Instructions (MEDIUM)
**Location:** `frontend/src/components/ConnectModal.tsx` lines 44-47

**Issue:**
```typescript
<li>Plug your phone into this computer with USB</li>  <!-- ❌ Only USB mentioned -->
<li>Open the camera app on your phone</li>
<li>Wait for it to show "Connected"</li>
<li>Take photos - they'll appear here automatically</li>
```

**Impact:** Instructions don't mention Wi-Fi hotspot option (PROJECT.md mentions both USB reverse tethering and local Wi-Fi).

**Resolution Required:**
- Add Wi-Fi connection option to instructions
- Or clarify both connection methods

---

### 42. Header.tsx Line 46 - Wrong API Endpoint (MEDIUM)
**Location:** `frontend/src/components/Header.tsx` line 46

**Issue:**
```typescript
const res = await fetch('/api/v1/devices');  // ❌ Should be full URL with API_BASE_URL
```

**Impact:** Will fail in production or if frontend not on same domain.

**Resolution Required:**
- Use `${API_BASE_URL}/api/v1/devices` pattern like other API calls

---

### 43. Header.tsx Lines 138-142 - Inconsistent Device Count Display (LOW)
**Location:** `frontend/src/components/Header.tsx` lines 138-142

**Issue:**
```typescript
{!backendOnline
  ? 'Demo Mode'
  : activeDeviceCount === 0
  ? 'No phone connected'
  : `${activeDeviceCount} phone${activeDeviceCount > 1 ? 's' : ''} connected`}
```

**Impact:** Inconsistent with other components that use "Phone connected".

**Resolution Required:**
- Standardize terminology across all components

---

### 44. Dropzone.tsx Line 28 - Alert Instead of Toast (LOW)
**Location:** `frontend/src/components/Dropzone.tsx` line 28

**Issue:**
```typescript
alert('Upload a valid image file (JPG, PNG, WEBP).');  // ❌ Uses browser alert
```

**Impact:** Poor UX, blocks thread.

**Resolution Required:**
- Use toast notification or inline error message

---

### 45. WebCamCapture.tsx Line 171 - Misleading Button Label (LOW)
**Location:** `frontend/src/components/WebCamCapture.tsx` line 171

**Issue:**
```typescript
<Upload className="w-3.5 h-3.5" />
Take photo  <!-- ❌ Upload button says "Take photo" -->
```

**Impact:** Confusing - button uploads file but says "Take photo".

**Resolution Required:**
- Change label to "Upload photo" or "Choose file"

---

### 46. WebCamCapture.tsx Line 210 - Inconsistent Button Label (LOW)
**Location:** `frontend/src/components/WebCamCapture.tsx` line 210

**Issue:**
```typescript
<Camera className="w-3.5 h-3.5" /> Snap Photo  <!-- ❌ "Snap" vs "Take" inconsistency -->
```

**Impact:** Inconsistent terminology with other buttons.

**Resolution Required:**
- Standardize on "Take photo" or "Capture"

---

### 47. presets.ts Line 3 - Comment References Old Theme (LOW)
**Location:** `frontend/src/services/presets.ts` line 3

**Issue:**
```typescript
// SIH26188 — Preset Document and Face Image Synthesizer
// Generates realistic canvas sample cards and mock inspection results for quick loading.
```

**Impact:** Comment mentions "Deep Oceanic DLS" in formatting.ts but not here - inconsistent documentation.

**Resolution Required:**
- Standardize file header comments across codebase

---

### 48. formatting.ts Line 2 - Outdated Theme Name (LOW)
**Location:** `frontend/src/utils/formatting.ts` line 2

**Issue:**
```typescript
// SIH26188 — Frontend Formatting and Color Utilities (Deep Oceanic DLS)
```

**Impact:** Theme name outdated - should be "Whitish Theme".

**Resolution Required:**
- Update comment to reflect current theme

---

### 49. api.ts Line 64 - Hardcoded Fallback Message (LOW)
**Location:** `frontend/src/services/api.ts` line 64

**Issue:**
```typescript
message: err.name === 'AbortError' ? 'Connection timed out' : 'Backend offline (localhost:8000 unreachable)',
```

**Impact:** Hardcoded localhost reference in error message.

**Resolution Required:**
- Use API_BASE_URL in error message

---

### 50. types/api.ts Line 267 - Loose Type Definition (LOW)
**Location:** `frontend/src/types/api.ts` line 267

**Issue:**
```typescript
capture_type: 'document' | 'selfie' | 'face' | string,  // ❌ 'string' makes it too loose
```

**Impact:** Type safety compromised.

**Resolution Required:**
- Remove 'string' or use union type strictly

---

---

## UI CONFLICTS

### UI-1. Theme Mismatch Between Android and Frontend (CRITICAL)
**Location:** Android vs Frontend

**Issue:**
- **Frontend:** Whitish theme (#F8FAFC background, #FFFFFF surfaces, #0F172A text)
- **Android:** Dark theme (#000000 background, dark overlays, white text)
- **PROJECT.md Requirement:** Both should use whitish theme for sunlight legibility

**Impact:** 
- Android app will not be sunlight-legible outdoors
- Inconsistent user experience across platforms
- Violates project requirements

**Resolution Required:**
- Convert entire Android app to whitish theme
- Update colors.xml, themes.xml, all drawables
- Test outdoor legibility

---

### UI-2. Button Size Inconsistency (MEDIUM)
**Location:** `activity_main.xml` line 170

**Issue:**
- **PROJECT.md Requirement:** 56dp shutter button
- **Actual Implementation:** 80dp shutter button
- **Impact:** Violates specification, inconsistent sizing

**Resolution Required:**
- Change shutter button to 56dp

---

### UI-3. Missing Shutter Button Text (MEDIUM)
**Location:** `activity_main.xml` line 168-178

**Issue:**
- **PROJECT.md Requirement:** "📸 SNAP TRAVELER PHOTO" text on button
- **Actual Implementation:** No text, just circular button
- **Impact:** Less clear UX, violates spec

**Resolution Required:**
- Add text label below button or use TextView + Button combination

---

### UI-4. Connection Status Display Inconsistency (LOW)
**Location:** Multiple files

**Issue:**
- **PROJECT.md Requirement:** "🟢 Connected to Desktop Terminal"
- **Android Actual:** "Connected" or "No connection"
- **Frontend Actual:** "Phone connected" or "No phone connected"
- **Impact:** Inconsistent terminology across platforms

**Resolution Required:**
- Standardize on one format across all components
- Recommended: "Phone connected" (simplest)

---

### UI-5. Camera Mode Label Inconsistency (LOW)
**Location:** `activity_main.xml` lines 82, 96

**Issue:**
- **Android:** "Person" and "Document"
- **Frontend:** "Person photo" and "Document"
- **Impact:** Minor inconsistency

**Resolution Required:**
- Standardize labels across platforms

---

### UI-6. Status Badge Color Conflict (CRITICAL)
**Location:** `status_badge.xml` vs whitish theme

**Issue:**
- **Current:** Dark semi-transparent background (#CC1a1A1A) with white text
- **Required for Whitish Theme:** Light background with dark text
- **Impact:** Badge won't be visible on whitish background

**Resolution Required:**
- Change badge to light background (#FFFFFF or #F8FAFC) with dark text

---

### UI-7. Gradient Overlay Conflict (CRITICAL)
**Location:** `dark_gradient_top.xml`, `dark_gradient_bottom.xml`

**Issue:**
- **Current:** Dark gradients (#CC000000 to transparent)
- **Required for Whitish Theme:** Light gradients or no gradients
- **Impact:** Dark overlays will ruin whitish theme

**Resolution Required:**
- Change to light gradients or remove entirely

---

### UI-8. Framing Reticle Color (LOW)
**Location:** `activity_main.xml` lines 107, 116, 125, 134

**Issue:**
- **Current:** Gold accent color (#FFD700)
- **Whitish Theme:** May need different color for visibility
- **Impact:** Gold may not be visible on whitish background

**Resolution Required:**
- Test visibility on whitish background, adjust if needed

---

## UX CONFLICTS

### UX-1. Missing Android Verdict Display (HIGH)
**Location:** Android app - feature completely missing

**Issue:**
- **PROJECT.md Requirement:** "Display screening verdict and risk summary banner upon completion"
- **Actual Implementation:** Android app only uploads photos, never receives or displays results
- **Impact:** Critical feature missing, incomplete user workflow

**Resolution Required:**
- Add API endpoint to fetch screening results
- Add UI components to display verdict banner
- Implement result polling or WebSocket

---

### UX-2. No Android Settings Screen (HIGH)
**Location:** Android app - feature completely missing

**Issue:**
- **Required:** Server URL configuration, device ID view, outbox management
- **Actual:** No settings screen exists
- **Impact:** Cannot configure app, no way to manage outbox

**Resolution Required:**
- Add SettingsActivity
- Add preferences for server URL, device ID
- Add outbox management UI

---

### UX-3. Hardcoded Server URL (HIGH)
**Location:** `CompanionApiService.kt` line 18

**Issue:**
- **Current:** `http://10.0.2.2:8000` (emulator only)
- **Required:** Configurable for real devices
- **Impact:** Cannot connect to real devices

**Resolution Required:**
- Add settings screen to configure server URL
- Store in SharedPreferences
- Add network discovery for local desktop

---

### UX-4. Outbox Items Never Deleted (MEDIUM)
**Location:** `OutboxManager.kt` lines 97-100

**Issue:**
- **Current:** Items exceeding retry limit are skipped but never deleted
- **Impact:** Database grows unbounded, no cleanup mechanism

**Resolution Required:**
- Delete items after retry limit exceeded
- Add separate cleanup job
- Add UI to show failed items

---

### UX-5. No Network Error Notifications (MEDIUM)
**Location:** `MainActivity.kt` upload handling

**Issue:**
- **Current:** Upload failures silently fall back to outbox
- **Impact:** User not notified of network issues

**Resolution Required:**
- Add toast notifications for network errors
- Add manual retry button
- Show connection quality indicator

---

### UX-6. No Camera Error Recovery (MEDIUM)
**Location:** `MainActivity.kt` line 156

**Issue:**
- **Current:** Generic error message, no recovery mechanism
- **Impact:** User must restart app on camera failure

**Resolution Required:**
- Add specific error messages
- Add retry camera button
- Add camera permission request flow

---

### UX-7. USB-Centric Connection Instructions (MEDIUM)
**Location:** `ConnectModal.tsx` lines 44-47

**Issue:**
- **Current:** Only mentions USB connection
- **PROJECT.md:** Mentions both USB reverse tethering and local Wi-Fi hotspot
- **Impact:** Users with Wi-Fi-only setups confused

**Resolution Required:**
- Add Wi-Fi connection option to instructions
- Clarify both connection methods

---

### UX-8. Alert Instead of Toast (LOW)
**Location:** `Dropzone.tsx` line 28

**Issue:**
- **Current:** Uses browser `alert()` for errors
- **Impact:** Poor UX, blocks thread

**Resolution Required:**
- Use toast notification or inline error message

---

### UX-9. Misleading Button Labels (LOW)
**Location:** `WebCamCapture.tsx` line 171

**Issue:**
- **Current:** Upload button labeled "Take photo"
- **Impact:** Confusing - button uploads file but says "Take photo"

**Resolution Required:**
- Change label to "Upload photo" or "Choose file"

---

### UX-10. Inconsistent Button Terminology (LOW)
**Location:** Multiple components

**Issue:**
- **WebCamCapture:** "Snap Photo" vs "Take photo"
- **IngestionPanel:** "Check document" vs "Run Screening"
- **Impact:** Inconsistent terminology

**Resolution Required:**
- Standardize on consistent terminology across all buttons

---

## SYNCING CONFLICTS

### SYNC-1. API Contract Mismatch: capture_type (HIGH)
**Location:** Multiple files

**Issue:**
- **Android sends:** `"selfie"` or `"document"` (MainActivity.kt line 192)
- **Backend expects:** `"traveler_live"` (PROJECT.md line 44)
- **Frontend types:** `'document' | 'selfie' | 'face' | string` (api.ts line 267)
- **Impact:** Uploads may fail or be misclassified

**Resolution Required:**
- Align all three components on same enum values
- Recommended: Use `"selfie"` and `"document"`
- Update backend documentation
- Update PROJECT.md

---

### SYNC-2. Missing Android Result Fetching API (HIGH)
**Location:** Android app - endpoint missing

**Issue:**
- **Required:** API to fetch screening results after upload
- **Current:** No endpoint exists in CompanionApiService
- **Impact:** Cannot display verdict on Android

**Resolution Required:**
- Add backend endpoint: `GET /api/v1/companion/result/{sequence_id}`
- Add method to CompanionApiService
- Implement polling or WebSocket in MainActivity

---

### SYNC-3. Wrong API Endpoint in Header (MEDIUM)
**Location:** `Header.tsx` line 46

**Issue:**
- **Current:** `fetch('/api/v1/devices')` (relative path)
- **Required:** `${API_BASE_URL}/api/v1/devices` (full URL)
- **Impact:** Will fail in production or if frontend not on same domain

**Resolution Required:**
- Use API_BASE_URL pattern like other API calls

---

### SYNC-4. Hardcoded Device ID in Upload (MEDIUM)
**Location:** `CompanionApiService.kt` line 27

**Issue:**
- **Current:** Hardcoded `"android_field_unit_01"`
- **Required:** Should use actual device ID from getDeviceId()
- **Impact:** All devices appear as same device

**Resolution Required:**
- Use `getDeviceId(context)` instead of hardcoded value
- Call method in uploadPhoto()

---

### SYNC-5. Hardcoded Checkpoint ID (MEDIUM)
**Location:** `CompanionApiService.kt` line 28

**Issue:**
- **Current:** Hardcoded `"field_checkpoint_01"`
- **Required:** Should be configurable or from settings
- **Impact:** Cannot change checkpoint without code change

**Resolution Required:**
- Add checkpoint selection to Android settings
- Pass checkpoint ID from settings to upload

---

### SYNC-6. Missing Companion Clear API Call (LOW)
**Location:** Frontend - not implemented

**Issue:**
- **PROJECT.md:** `POST /api/v1/companion/clear` should reset buffer
- **Current:** Frontend never calls clear endpoint
- **Impact:** Buffer may accumulate old captures

**Resolution Required:**
- Add clear call after processing companion photo
- Add manual clear button if needed

---

### SYNC-7. No Sequence ID Tracking (MEDIUM)
**Location:** Android app - not implemented

**Issue:**
- **Backend returns:** `sequence_id` in upload response
- **Current:** Android doesn't track or use sequence_id
- **Impact:** Cannot fetch specific result, no deduplication

**Resolution Required:**
- Capture sequence_id from upload response
- Store with outbox item
- Use for result fetching

---

### SYNC-8. File Name Inconsistency (LOW)
**Location:** Multiple files

**Issue:**
- **Android upload:** `"field_capture.jpg"` (CompanionApiService.kt line 24)
- **Frontend upload:** `"document.jpg"`, `"live_face.jpg"` (api.ts lines 79, 82)
- **Impact:** Inconsistent file naming

**Resolution Required:**
- Standardize file naming convention
- Use descriptive names based on capture type

---

### SYNC-9. Multipart vs JSON Upload (LOW)
**Location:** Android vs Frontend

**Issue:**
- **Android:** Uses MultipartBody (CompanionApiService.kt)
- **Frontend:** Uses FormData (api.ts)
- **Backend:** Should accept both per PROJECT.md
- **Impact:** May cause parsing issues if backend doesn't handle both

**Resolution Required:**
- Verify backend handles both formats
- Or standardize on one format

---

### SYNC-10. No Sync Status Indicator on Android (MEDIUM)
**Location:** Android app - missing feature

**Issue:**
- **Frontend:** Shows "Phone connected" status
- **Android:** Shows "Connected" but no sync status
- **Impact:** User doesn't know if sync is working

**Resolution Required:**
- Add sync status indicator to Android
- Show last sync time
- Show pending upload count

---

## SUMMARY BY SEVERITY (UPDATED)

### Critical (Must Fix Before Release)
1. Android Theme Mismatch - Dark theme instead of required whitish theme
2. Android Native Library Crash - Will crash on startup
3. activity_main.xml Line 7 - Hardcoded dark background
4. colors.xml - Entire file wrong theme
5. themes.xml - Entire file wrong theme
6. dark_gradient_top.xml - Wrong gradient
7. dark_gradient_bottom.xml - Wrong gradient
8. status_badge.xml - Dark badge background
9. UI-1. Theme Mismatch Between Android and Frontend
10. UI-6. Status Badge Color Conflict
11. UI-7. Gradient Overlay Conflict

### High (Should Fix Soon)
12. API Contract Mismatch - capture_type values inconsistent
13. Missing Android Verdict Display - Feature completely missing
14. No Android Settings Screen - No configuration possible
15. ConnectModal.tsx - USB-centric instructions missing Wi-Fi option
16. Header.tsx - Wrong API endpoint (relative path)
17. UX-1. Missing Android Verdict Display
18. UX-2. No Android Settings Screen
19. UX-3. Hardcoded Server URL
20. SYNC-1. API Contract Mismatch: capture_type
21. SYNC-2. Missing Android Result Fetching API

### Medium (Should Fix)
22. Hardcoded Server URL - Cannot connect to real devices
23. Outbox Retry Limit Not Enforced - Database bloat
24. Inconsistent Terminology - UX confusion
25. No Error Handling for Network Failures
26. No Camera Error Recovery
27. App.tsx - Fake SHA256 hash generation
28. UI-2. Button Size Inconsistency
29. UI-3. Missing Shutter Button Text
30. UX-4. Outbox Items Never Deleted
31. UX-5. No Network Error Notifications
32. UX-6. No Camera Error Recovery
33. UX-7. USB-Centric Connection Instructions
34. SYNC-3. Wrong API Endpoint in Header
35. SYNC-4. Hardcoded Device ID in Upload
36. SYNC-5. Hardcoded Checkpoint ID
37. SYNC-7. No Sequence ID Tracking
38. SYNC-10. No Sync Status Indicator on Android

### Low (Nice to Have)
39. Unused Retrofit Dependencies
40. Room Annotation Processor Duplication
41. Unused Methods (getDeviceId, setServerUrl, calculateSHA256)
42. Unused Imports (ByteArrayOutputStream, JSONObject, IOException, MessageDigest)
43. ConnectModal Server URL Prop Unused
44. Missing Gradle Properties
45. ProGuard Rules Incomplete
46. Shutter Button Size Mismatch
47. Shutter Button Text Missing
48. Connection Status Text Mismatch
49. Deprecated Kotlin Version
50. Repository Mode Conflict
51. Duplicate Model Version Strings
52. Inconsistent Companion Notification
53. Alert Instead of Toast
54. Misleading Button Labels
55. Outdated Theme Comments
56. Hardcoded Fallback Message
57. Loose Type Definition
58. UI-4. Connection Status Display Inconsistency
59. UI-5. Camera Mode Label Inconsistency
60. UI-8. Framing Reticle Color
61. UX-8. Alert Instead of Toast
62. UX-9. Misleading Button Labels
63. UX-10. Inconsistent Button Terminology
64. SYNC-6. Missing Companion Clear API Call
65. SYNC-8. File Name Inconsistency
66. SYNC-9. Multipart vs JSON Upload

---

## RECOMMENDED FIX ORDER

1. **Fix crash:** Remove native library load (Issue #2)
2. **Fix theme:** Convert to whitish theme (Issue #1)
3. **Align API:** Standardize capture_type values (Issue #3)
4. **Add missing feature:** Implement verdict display (Issue #4)
5. **Add configuration:** Implement settings screen (Issue #18)
6. **Fix networking:** Make server URL configurable (Issue #5)
7. **Improve UX:** Add error handling and recovery (Issues #19, #20)
8. **Clean up:** Remove unused code and dependencies (Issues #9-13)
9. **Polish:** Fix UI inconsistencies (Issues #6-8, #15)
10. **Finalize:** Complete build configuration (Issues #16-17)

---

## TESTING CHECKLIST

After fixing conflicts, verify:

- [ ] Android app builds without errors
- [ ] Android app launches without crashing
- [ ] Android theme is whitish and sunlight-legible
- [ ] Camera preview works on front and back cameras
- [ ] Photo upload succeeds to backend
- [ ] Connection status displays correctly
- [ ] Outbox sync works when connection restored
- [ ] Verdict display shows screening results
- [ ] Settings screen allows server URL configuration
- [ ] Frontend companion sync works with Android uploads
- [ ] All API contracts aligned (capture_type, etc.)
- [ ] No unused dependencies in build.gradle
- [ ] ProGuard rules work for release builds
- [ ] Error handling works for network failures
- [ ] Camera errors are recoverable

---

## NOTES FOR AI AGENTS

- The Android app was implemented with a dark theme despite PROJECT.md requiring whitish theme
- This appears to be a complete misalignment with requirements
- The native library load is a copy-paste error from a template
- API contracts need alignment between Android, frontend, and backend
- Several features mentioned in PROJECT.md are not implemented in Android
- Focus on critical and high-severity issues first
- Test thoroughly after each fix
