# E2E Test Infra: SIH26188 Border Screening & Companion Camera

## Test Philosophy
- Opaque-box, requirement-driven. Derived from ORIGINAL_REQUEST.md.
- Multi-tier systematic coverage: Category-Partition, Boundary Value Analysis, Pairwise Combinations, Real-World Workloads, and White-Box Adversarial Hardening.

## Feature Inventory & Test Mapping
| # | Feature | Requirement | Tier 1 (Feature) | Tier 2 (Boundary) | Tier 3 (Cross) | Tier 4 (Scenario) |
|---|---------|-------------|:----------------:|:-----------------:|:--------------:|:-----------------:|
| 1 | Whitish Theme Tokens & Purity | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 2 | Model Jargon & Math Purge | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 3 | Companion Upload API (`POST /upload`) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 4 | Companion Latest API (`GET /latest`) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 5 | Companion Clear API (`POST /clear`) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 6 | Web Live Sync Indicator & Badge | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| 7 | Web Auto-Trigger Screening | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| 8 | Web Side-by-Side Biometric View | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| 9 | Android Whitish Theme & Sunlight Legibility | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |
| 10 | Android Shutter & Companion Upload | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |
| 11 | Android Verdict Display | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **Backend Test Runner**: Pytest (`pytest backend/tests/`)
- **Frontend Test & Build Runner**: Vitest / Node test runner & `npm run build`
- **Android Test & Build Runner**: Gradle (`./gradlew testDebugUnitTest` & `./gradlew assembleDebug`)
- **E2E Integration Verification**: Full pipeline flow tests simulating Mobile Companion upload -> Web Polling & Auto-Screening -> Side-by-side rendering -> Verdict publication.

## Coverage Thresholds
- Tier 1: ≥5 per feature (55 test cases)
- Tier 2: ≥5 per feature (55 test cases)
- Tier 3: ≥11 cross-feature interaction test cases
- Tier 4: ≥6 realistic application scenarios
- Tier 5: Adversarial edge cases and stress tests
