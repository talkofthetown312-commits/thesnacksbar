# TalkOS Deployment, Download & Multi-Platform Release Guide

## 1. Multi-Platform Architecture Overview
TalkOS uses a single authoritative ERP codebase (React + TypeScript + Express + Firebase Firestore `ai-studio-talkosarchitectu-438c4707-59bb-4b28-aa84-26b8ca15c574`) packaged natively across:
1. **Windows 10/11 Desktop** — Electron NSIS Installer (`.exe`), Portable (`.exe`), and Standalone PWA
2. **macOS Desktop (Apple Silicon & Intel)** — Electron Disk Image (`.dmg`), `.zip`, and Standalone PWA
3. **Linux Desktop** — Universal `.AppImage`, Debian/Ubuntu package (`.deb`), and Standalone PWA
4. **Android Smartphones, Tablets & POS Terminals** — Native Capacitor `.apk`, Google Play `.aab`, and Mobile PWA
5. **iOS & iPadOS** — Native Capacitor Xcode Archive (`.ipa`) and Safari Home Screen Standalone App

---

## 2. Option A: Instant 1-Click Installation (No Build Required)
Open the running application URL on any device or click **Get Apps** in the top navigation bar:

- **Windows / macOS / Linux (Chrome, Edge, Brave):**
  1. Click **Get Apps → Install App Now**, or click the **Install** icon on the right side of the browser address bar.
  2. Confirm installation to launch TalkOS in a standalone desktop window with Start Menu / Dock shortcuts and full offline IndexedDB sync.
- **Android (Chrome):**
  1. Open the app URL in Chrome on Android.
  2. Tap the **Install App** banner or tap **Menu (⋮) → Install app / Add to Home screen**.
- **iOS & iPadOS (Safari):**
  1. Open the app URL in Safari on iPhone or iPad.
  2. Tap the **Share** icon (square with arrow pointing up) → **Add to Home Screen** → **Add**.

---

## 3. Option B: Local CLI Native Installer Builds

### Prerequisites
```bash
npm install
```

### 1. Windows Desktop (`.exe` NSIS Installer & Portable)
```bash
npm run build:win
```
- **Output:** `release/TalkOS-Windows-2.4.0.exe`

### 2. macOS Desktop (`.dmg` & `.zip`)
```bash
npm run build:mac
```
- **Output:** `release/TalkOS-macOS-2.4.0.dmg` and `release/TalkOS-macOS-2.4.0.zip`

### 3. Linux Desktop (`.AppImage` & `.deb`)
```bash
npm run build:linux
```
- **Output:** `release/TalkOS-Linux-2.4.0.AppImage` and `release/TalkOS-Linux-2.4.0.deb`
- **Install `.deb` on Ubuntu/Debian:** `sudo dpkg -i release/TalkOS-Linux-2.4.0.deb`
- **Run `.AppImage`:** `chmod +x release/TalkOS-Linux-2.4.0.AppImage && ./release/TalkOS-Linux-2.4.0.AppImage`

### 4. Android Native Package (`.apk` & `.aab`)
```bash
# Compiles web assets, auto-initializes android/ if missing, and syncs Capacitor plugins:
npm run build:android

# Build installable Debug APK:
cd android && ./gradlew assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk

# Build Production Release APK & Google Play AAB:
cd android && ./gradlew assembleRelease bundleRelease
```

### 5. iOS & iPadOS Native App (`.ipa` via Xcode on macOS)
```bash
# Compiles web assets, auto-initializes ios/ if missing, and syncs Capacitor plugins:
npm run build:ios

# Open the workspace in Xcode:
npm run cap:ios
```
- In Xcode, select your **Team** under **Signing & Capabilities**, choose **Any iOS Device (arm64)**, and click **Product → Archive** to distribute to TestFlight, the App Store, or connected iPads/iPhones.

---

## 4. Option C: Automated Cloud Builds via GitHub Actions
The workflow `.github/workflows/production-release.yml` automatically builds all platforms in parallel on GitHub-hosted Windows, macOS, and Ubuntu runners:

1. Push a release tag (`git tag v2.4.0 && git push origin v2.4.0`) or click **Run workflow** under **Actions → TalkOS Multi-Platform Production Release**.
2. Once completed, download the compiled installers directly from the workflow run's **Artifacts** section:
   - `talkos-windows-exe` (`TalkOS-Windows-2.4.0.exe`)
   - `talkos-macos-dmg` (`TalkOS-macOS-2.4.0.dmg` & `.zip`)
   - `talkos-linux-appimage-deb` (`TalkOS-Linux-2.4.0.AppImage` & `.deb`)
   - `talkos-android-apk-aab` (`app-debug.apk`, `app-release-unsigned.apk`, `app-release.aab`)
   - `talkos-ios-xcode-project` (Synced `ios/` Xcode project ready for signing)
   - `talkos-web-pwa` (Production web & PWA bundle)
