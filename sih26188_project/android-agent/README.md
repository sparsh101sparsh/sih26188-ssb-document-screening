# SSB Field Camera - Android Companion App

A camera-only companion app for SSB border checkpoints that captures traveler photos and documents, syncing them to the desktop screening station.

## Design Philosophy

**The desktop is the screening station. The phone is a field camera that feeds it.**

This app is intentionally minimal:
- **Dark full-screen camera** - No white UI glare at checkpoints
- **Single shutter button** - Frame person → Snap → Confirm sent
- **Offline outbox** - Photos saved locally if connection fails
- **Auto-sync** - Retries upload when connection restored

## What's Included

- ✅ Full-bleed CameraX viewfinder with dark HUD
- ✅ Front camera for traveler selfies (default)
- ✅ Back camera for document capture
- ✅ Big 56dp shutter button
- ✅ Connection status indicator (CONNECTED/OFFLINE)
- ✅ Offline Room database with retry logic
- ✅ SHA-256 audit hashing
- ✅ Companion upload to desktop endpoint

## What's Removed

- ❌ Results, risk scores, officer decisions
- ❌ Pipeline, discrepancy tables, audit UI
- ❌ Presets, diagnostics screens
- ❌ 3-tab navigation
- ❌ White dashboard UI

## Setup

### Prerequisites

- Android Studio Hedgehog or later
- Android SDK API 24+ (Android 7.0+)
- Desktop screening station running on same network

### Build

```bash
cd android-agent
./gradlew assembleDebug
```

### Install

```bash
./gradlew installDebug
```

## Connection Methods

### 1. USB Reverse Tethering (Recommended)

Fastest, most reliable connection for hackathon demos.

```bash
# On desktop with Android device connected via USB
adb reverse tcp:8000 tcp:8000
```

The app will connect to `http://10.0.2.2:8000` (emulator localhost).

### 2. Local Wi-Fi Hotspot

For real field deployment:

1. Desktop broadcasts local Wi-Fi hotspot (e.g., `SSB_GATEWAY`)
2. Android connects to same network
3. App auto-discovers desktop server

### 3. Offline Mode

If no connection available:
- Photos saved to local Room database
- Auto-sync when connection restored
- 3-retry limit per photo

## API Endpoints

### Upload Photo

```
POST /api/v1/companion/upload
Content-Type: multipart/form-data

Fields:
- file: JPEG image (≤1280px, 80% quality)
- capture_type: "selfie" or "document"
- device_id: "android_field_unit_01"
- checkpoint_id: "field_checkpoint_01"

Response:
{
  "status": "ok",
  "sequence_id": 42,
  "filename": "companion_42.jpg",
  "timestamp": "2026-08-24T01:30:00Z"
}
```

### Health Check

```
GET /api/v1/health

Response:
{
  "status": "healthy",
  "engine_mode": "darwin_arm64_coreml",
  "models_loaded": {...},
  "uptime_seconds": 3420.5
}
```

## UI States

### IDLE
- Camera preview active
- Status: "CONNECTED" or "OFFLINE"
- Message: "Frame traveler face" or "Frame document"

### CAPTURING
- Shutter button disabled
- Message: "Capturing..."

### UPLOADING
- Message: "Uploading..."
- On success: "✓ Sent to desktop"
- On failure: "Saved to outbox (offline)"

### OFFLINE OUTBOX
- Badge shows pending count: "X PENDING"
- Auto-sync when connection restored
- Max 3 retries per photo

## Project Structure

```
app/src/main/java/com/ssb/fieldcamera/
├── MainActivity.kt              # CameraX setup, UI logic
├── CompanionApiService.kt       # Upload to desktop endpoint
└── OutboxManager.kt            # Room DB, offline sync

app/src/main/res/
├── layout/
│   └── activity_main.xml       # Dark camera UI
├── drawable/                    # Dark HUD elements
├── values/
│   ├── colors.xml              # Dark theme colors
│   └── themes.xml              # Full-screen dark theme
└── AndroidManifest.xml         # Permissions, config
```

## Configuration

### Server URL

Edit `CompanionApiService.kt`:

```kotlin
private val serverUrl = "http://YOUR_DESKTOP_IP:8000"
```

### Device ID

Edit `MainActivity.kt`:

```kotlin
.addFormDataPart("device_id", "YOUR_DEVICE_ID")
```

## Testing

### Unit Tests

```bash
./gradlew test
```

### Instrumented Tests

```bash
./gradlew connectedAndroidTest
```

## Troubleshooting

### Camera not starting
- Check camera permission in Settings
- Ensure device has front camera

### Upload failing
- Verify desktop server is running
- Check network connectivity
- Try USB reverse tethering

### Outbox not syncing
- Check connection status indicator
- Verify server URL is correct
- Check desktop `/api/v1/health` endpoint

## Security Notes

- All photos transmitted over HTTP (air-gapped network)
- SHA-256 hashes computed for audit trail
- No permanent biometric retention
- Photos cleared from desktop after screening

## License

Confidential - Ministry of Home Affairs, Government of India
