# Investigation Report: Android Gradle Build & Test Environment Configuration

**Agent**: `teamwork_preview_explorer_m1_fix3_s4`  
**Working Directory**: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_m1_fix3_s4`  
**Target Subsystem**: `sih26188_project/android-screening`  
**Date**: 2026-09-09  
**Type**: Hard Handoff (Investigation Complete)

---

## 1. Observation

### 1.1 Host Filesystem Symlink Status
Direct inspection of developer user home directories (`~/.gradle` and `~/.android`) revealed:
```bash
ls -ld ~/.gradle ~/.android
# lrwxr-xr-x@ 1 iamsparsh00321 staff 38 Aug 30 20:44 /Users/iamsparsh00321/.android -> /Volumes/issparsh/Android_Dev/.android
# lrwxr-xr-x@ 1 iamsparsh00321 staff 37 Aug 30 20:44 /Users/iamsparsh00321/.gradle -> /Volumes/issparsh/Android_Dev/.gradle
```
Inspection of `/Volumes/issparsh`:
```bash
ls -ld /Volumes/issparsh
# ls: /Volumes/issparsh: No such file or directory (Exit code: 1)
```
Both `~/.gradle` and `~/.android` are dangling symbolic links pointing to an unmounted external volume.

### 1.2 Failure Modes Under Naive Gradle Invocations
1. **Unredirected Gradle User Home**:
   Executing `./gradlew --version` without redirection flags produces an immediate wrapper crash:
   ```text
   Exception in thread "main" java.lang.RuntimeException: Could not create parent directory for lock file /Users/iamsparsh00321/.gradle/wrapper/dists/gradle-9.3.1-bin/23ovyewtku6u96viwx3xl3oks/gradle-9.3.1-bin.zip.lck
       at org.gradle.wrapper.Install.createDist(SourceFile:22)
       at org.gradle.wrapper.GradleWrapperMain.lambda$prepareWrapper$0(SourceFile:2)
       at org.gradle.wrapper.GradleWrapperMain.main(SourceFile:2)
   ```
2. **Unredirected Android User Home**:
   Executing `./gradlew -g /tmp/gradle_user_home help` without `ANDROID_USER_HOME` set fails immediately in Android Gradle Plugin (AGP 9.1.1) at `app/build.gradle.kts:3`:
   ```text
   * Where:
   Build file '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/android-screening/app/build.gradle.kts' line: 3
   * What went wrong:
   An exception occurred applying plugin request [id: 'com.android.application', version: '9.1.1']
   > Failed to apply plugin 'com.android.internal.application'.
      > /Users/iamsparsh00321/.android
   ```
3. **Invalid `ANDROID_SDK_HOME` Flag Pitfall**:
   Setting `ANDROID_SDK_HOME=/tmp/.android` causes AGP service initialization failure:
   ```text
   * What went wrong:
   An exception occurred applying plugin request [id: 'com.android.application', version: '9.1.1']
   > Failed to apply plugin 'com.android.internal.application'.
      > Failed to create service 'com.android.build.gradle.internal.services.AndroidLocationsBuildService_...'.
         > Could not create an instance of type com.android.build.gradle.internal.services.AndroidLocationsBuildService.
            > Could not create provider for value source AndroidLocationsBuildService.AndroidDirectoryCreator.
   ```
   *Explanation*: Historically, `ANDROID_SDK_HOME` was defined as the parent directory *containing* `.android`. Setting `ANDROID_SDK_HOME=/tmp/.android` causes conflicts. Only `ANDROID_USER_HOME=/tmp/.android` must be used.

### 1.3 Available Java Runtimes and Android SDK
- **Java Virtual Machines**:
  - Adoptium OpenJDK 25.0.3+9-LTS: `/Library/Java/JavaVirtualMachines/temurin-25.jdk/Contents/Home`
  - Homebrew OpenJDK 21.0.12: `/opt/homebrew/opt/openjdk@21` (also at `/opt/homebrew/Cellar/openjdk@21/21.0.12/libexec/openjdk.jdk/Contents/Home`)
  - Android Studio JetBrains Runtime 25.0.2: `/Applications/Android Studio.app/Contents/jbr/Contents/Home`
- **Gradle & AGP Compatibility**:
  - Gradle 9.3.1 runs successfully on both JDK 21 and JDK 25.
  - When `JAVA_HOME` is omitted in the shell, Gradle Wrapper auto-discovers `/Library/Java/JavaVirtualMachines/temurin-25.jdk/Contents/Home`.
- **Android SDK**:
  - Located at `/Users/iamsparsh00321/Library/Android/sdk` as referenced in `android-screening/local.properties:1` (`sdk.dir=/Users/iamsparsh00321/Library/Android/sdk`).
  - Contains build-tools: `34.0.0`, `35.0.0`, `36.0.0`.
  - Contains platforms: `android-34`, `android-35`, `android-36.1`, `android-37.0`.

### 1.4 Cache & Dependency Readiness
- In `/tmp/gradle_user_home`:
  - Gradle distribution `gradle-9.3.1-bin` is already extracted in `/tmp/gradle_user_home/wrapper/dists/gradle-9.3.1-bin/23ovyewtku6u96viwx3xl3oks/gradle-9.3.1/`.
  - 547 cached modules exist in `/tmp/gradle_user_home/caches/modules-2/files-2.1`, covering all Android dependencies (Compose BOM 2024.09.00, Kotlin 2.2.10, Room 2.7.0, Moshi 1.15.2, Robolectric 4.16.1, Roborazzi 1.59.0).
  - Offline unit testing executes without downloading dependencies.

### 1.5 Android Compilation and Test Execution Findings
- Executing:
  ```bash
  mkdir -p /tmp/.android
  ANDROID_USER_HOME=/tmp/.android ./gradlew -g /tmp/gradle_user_home testDebugUnitTest
  ```
  successfully resolves all plugins and executes 23 tasks (`:app:preBuild`, `:app:generateDebugBuildConfig`, `:app:kspDebugKotlin`, etc.) up to `:app:compileDebugKotlin`, where it halts on the type mismatch at `SsbRepository.kt:474:32`:
  `Argument type mismatch: actual type is 'List<String> & List<String>', but 'List<CriticalViolation>' was expected.`
- **Crucial Import Finding for Implementer**:
  In `SsbRepository.kt`, `CriticalViolation` is NOT currently imported. If the implementer updates line 474 to instantiate `CriticalViolation(...)` without adding the import, the compilation fails with:
  `Unresolved reference 'CriticalViolation'`.
  The file `SsbRepository.kt` must include:
  ```kotlin
  import com.ssb.fieldscreening.data.model.CriticalViolation
  ```
- **Unit Test Execution Once Compilation Is Fixed**:
  When tested in an out-of-tree sandbox with `CriticalViolation` imported and instantiated:
  - All compilation tasks pass (`:app:compileDebugKotlin`, `:app:compileDebugJavaWithJavac`, `:app:compileDebugUnitTestKotlin`).
  - Unit test suite runs 54 tests: **53 tests PASS, 1 test fails**.
  - The single failure is:
    ```text
    RepositoryNetworkRobustnessTest > test autoDetectGateway safely probes candidate IPs and returns null if unreachable FAILED
        java.lang.AssertionError at RepositoryNetworkRobustnessTest.kt:179
    ```
    This is the documented defect **TEST-02** in `bug_report.md` (unmocked HTTP probe connects to live host port 8000, scheduled for Milestone 3).
  - Targeted unit test execution (e.g. `AndroidEmpiricalChallengerTest`) runs with 100% pass rate in ~4 seconds.

---

## 2. Logic Chain

1. **Host State**: `~/.gradle` and `~/.android` point to an unmounted volume `/Volumes/issparsh`. Gradle and AGP default to these paths, causing immediate fatal file/directory creation exceptions.
2. **Path Redirection**: Setting `ANDROID_USER_HOME=/tmp/.android` and `-g /tmp/gradle_user_home` (along with `export GRADLE_USER_HOME=/tmp/gradle_user_home`) redirects all cache, lock, analytics, and keystore lookups into existing local directories, completely circumventing the broken symlinks.
3. **Variable Distinction**: Setting `ANDROID_SDK_HOME` breaks AGP's `AndroidLocationsBuildService`; only `ANDROID_USER_HOME` should be supplied.
4. **Toolchain Resolution**: OpenJDK 25 (`/Library/Java/JavaVirtualMachines/temurin-25.jdk/Contents/Home`) and OpenJDK 21 (`/opt/homebrew/opt/openjdk@21`) are verified functional. Setting `JAVA_HOME` explicitly avoids reliance on macOS `/usr/libexec/java_home` path resolution.
5. **Compilation Dependencies**: `:app:compileDebugKotlin` is an absolute prerequisite for unit test execution. Resolving `SsbRepository.kt:474` requires both updating the call site and importing `com.ssb.fieldscreening.data.model.CriticalViolation`.
6. **Test Baseline**: Once compilation succeeds, 53/54 unit tests pass immediately. The single failure is the pre-existing, documented TEST-02 defect, confirming that the test runner environment and dependencies are fully operational.

---

## 3. Caveats

1. **Host Symlink Persistence**: The broken symlinks in `~/.gradle` and `~/.android` remain in the user's home directory. Any script or agent running `./gradlew` without `ANDROID_USER_HOME` and `-g /tmp/gradle_user_home` will fail.
2. **Defect TEST-02**: If the backend server (or any process) is listening on port 8000, `RepositoryNetworkRobustnessTest` will fail until TEST-02 is patched in Milestone 3. To run non-network unit tests or specific test classes, use `--tests`.
3. **Gradle Configuration Cache**: When switching directories or paths, run with `--no-configuration-cache` if Gradle complains about cached inputs. In the main repo path, configuration caching works normally.

---

## 4. Conclusion

The Android build and test environment is healthy and fully cached in `/tmp/gradle_user_home`. The test execution failures reported during audit are 100% explained by:
1. Broken host symlinks requiring explicit `ANDROID_USER_HOME=/tmp/.android` and `-g /tmp/gradle_user_home`.
2. The compilation mismatch in `SsbRepository.kt:474:32` combined with a missing import `com.ssb.fieldscreening.data.model.CriticalViolation`.

Once the worker adds the import and aligns the call site, Android unit tests execute reliably.

### Verified Recipe for Building & Running Android Unit Tests

```bash
# Step 1: Pre-create temporary home directories
mkdir -p /tmp/.android /tmp/gradle_user_home

# Step 2: Set environment variables
export ANDROID_USER_HOME=/tmp/.android
export GRADLE_USER_HOME=/tmp/gradle_user_home
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-25.jdk/Contents/Home
export ANDROID_HOME=/Users/iamsparsh00321/Library/Android/sdk

# Step 3: Change to android project root
cd /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/android-screening

# Step 4: Run Android unit tests
./gradlew -g /tmp/gradle_user_home testDebugUnitTest

# Target specific test classes:
./gradlew -g /tmp/gradle_user_home testDebugUnitTest --tests com.ssb.fieldscreening.AndroidEmpiricalChallengerTest
./gradlew -g /tmp/gradle_user_home testDebugUnitTest --tests com.ssb.fieldscreening.CameraPipelineTest
./gradlew -g /tmp/gradle_user_home testDebugUnitTest --tests com.ssb.fieldscreening.ImageUtilsTest

# Build debug APK:
./gradlew -g /tmp/gradle_user_home assembleDebug
```

---

## 5. Verification Method

To independently verify this recipe:

1. **Verify Broken Symlink Failure Without Flags**:
   ```bash
   cd /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/android-screening
   ./gradlew --version
   ```
   *Expected result*: Crashes with `IOException` / `RuntimeException: Could not create parent directory for lock file /Users/iamsparsh00321/.gradle/...`.

2. **Verify Clean Task Graph Dry-Run With Recipe Flags**:
   ```bash
   mkdir -p /tmp/.android /tmp/gradle_user_home
   ANDROID_USER_HOME=/tmp/.android ./gradlew -g /tmp/gradle_user_home testDebugUnitTest --dry-run
   ```
   *Expected result*: `BUILD SUCCESSFUL` (all 35+ tasks scheduled clean).

3. **Verify Assemble Debug Task Graph**:
   ```bash
   mkdir -p /tmp/.android /tmp/gradle_user_home
   ANDROID_USER_HOME=/tmp/.android ./gradlew -g /tmp/gradle_user_home assembleDebug --dry-run
   ```
   *Expected result*: `BUILD SUCCESSFUL`.
