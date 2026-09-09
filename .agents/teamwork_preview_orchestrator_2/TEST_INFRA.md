# E2E Test Infra: SIH26188 Android-Laptop Connection & Screening

## Test Philosophy
- Multi-tier requirement-driven verification covering Network Interface Selection, mDNS Registration, Pairing QR API, Idempotent Image Upload, Discovery Tiers, Android Auto-Connect, Exponential Backoff Retry, and Frontend UI.
- Dual testing strategy: Pytest unit & integration tests + Android Robolectric/JUnit unit tests + Frontend Vitest/TypeScript compilation.

## Feature Inventory & Test Coverage
| # | Feature | Test Target | Methodology | Expected Result |
|---|---------|-------------|-------------|-----------------|
| 1 | `select_lan_ip` interface prioritization | `backend/tests/test_network_interface.py` | Unit test with mocked interface tables | Physical (en0/eth0/wlan0) chosen over VPN (utun0, tun0); RFC 1918 10.x/192.168.x handled cleanly |
| 2 | `select_lan_ip` default route detection | `backend/tests/test_network_interface.py` | Unit test with simulated netstat/ip route | Interface matching default gateway chosen |
| 3 | `GET /api/v1/companion/pairing-qr` | `backend/tests/test_network_interface.py` | FastAPI TestClient | 200 OK, returns `SSBPAIR://` formatted `qr_payload`, `pairing_token`, `gateway_id` |
| 4 | Upload deduplication via `capture_id` | `backend/tests/test_network_interface.py` | FastAPI TestClient | 1st upload -> 200 OK `status: "success"`, 2nd upload with same `capture_id` -> 200 OK `status: "duplicate"`, single SQLite row |
| 5 | Legacy companion sync & risk engine | `backend/tests/test_risk_engine.py`, `test_companion_sync.py` | Pytest suite | All tests pass (23/23 on risk engine) |
| 6 | Android QR parser `SSBPAIR://` | Android unit tests | JUnit / Robolectric | Correctly extracts host:port and handles legacy `http://` |
| 7 | Android discovery tier order & blank URL | Android unit tests | JUnit / Robolectric | Empty string returns `""`; discovery executes Tier 0 -> Tier 1 -> Tier 2 -> Tier 3 |
| 8 | Android exponential backoff retry | Android unit tests | JUnit / Robolectric | 5 retry intervals (0s, 2s, 8s, 30s, 60s); preserves image until 200 OK |
| 9 | Frontend build & test | Frontend Vitest / TypeScript | `npm test` & `npm run build` | Zero TypeScript errors, all components render cleanly |
| 10 | Android app compilation | Gradle build | `./gradlew assembleDebug --no-daemon` | Generates valid debug APK, copied to `~/Desktop/SSB-FieldScreening.apk` |

## Forensic Audit Requirements
- Zero dummy implementations or mock facades in production code.
- Zero hardcoded test outputs or fake bypasses.
- Real networking routines, real database migrations, real coroutine state machines.
