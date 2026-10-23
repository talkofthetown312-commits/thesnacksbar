import React, { useState } from 'react';
import {
  Download,
  Monitor,
  Smartphone,
  Laptop,
  Terminal,
  Check,
  Copy,
  X,
  Globe,
  FileText,
  HardDrive,
  Cpu
} from 'lucide-react';
import { usePWAInstall, DetectedOS } from '../hooks/usePWAInstall';

interface DownloadInstallModalProps {
  onClose?: () => void;
  inline?: boolean;
}

interface PlatformPackageSpec {
  id: DetectedOS;
  name: string;
  subtitle: string;
  formats: string;
  artifactName: string;
  buildCommand: string;
  quickInstallSteps: string[];
  nativeSteps: string[];
}

const PLATFORM_SPECS: PlatformPackageSpec[] = [
  {
    id: 'windows',
    name: 'Windows Desktop',
    subtitle: 'Windows 10 & Windows 11 (x64 / ARM64)',
    formats: 'NSIS Installer (.exe) · Portable (.exe) · Standalone PWA',
    artifactName: 'TalkOS-Windows-2.4.0.exe',
    buildCommand: 'npm run build:win',
    quickInstallSteps: [
      'Open this application in Microsoft Edge or Google Chrome on Windows.',
      'Click "Install Instant App" above, or click the Install App icon on the right side of the browser address bar.',
      'TalkOS launches in its own standalone desktop window with Start Menu & Taskbar shortcuts and offline database sync.'
    ],
    nativeSteps: [
      'Local CLI Build: Run `npm run build:win` in the project root to generate `release/TalkOS-Windows-2.4.0.exe` via Electron Builder.',
      'GitHub Actions CI: Push a release tag (`git tag v2.4.0 && git push origin v2.4.0`) and download the `talkos-windows-exe` artifact from the Actions tab.',
      'Includes native silent 80mm/58mm thermal printing and RJ-11/RJ-12 cash drawer pulse (`ESC p 0 25 250`).'
    ]
  },
  {
    id: 'macos',
    name: 'macOS Desktop',
    subtitle: 'macOS 12+ (Apple Silicon M1/M2/M3/M4 & Intel)',
    formats: 'Disk Image (.dmg) · Archive (.zip) · Standalone PWA',
    artifactName: 'TalkOS-macOS-2.4.0.dmg',
    buildCommand: 'npm run build:mac',
    quickInstallSteps: [
      'In Chrome / Edge on macOS: Click "Install Instant App" or the address bar install icon.',
      'In Safari on macOS (Sonoma+): Click File → Add to Dock to install TalkOS as a standalone macOS application.',
      'Supports full keyboard shortcuts (F2 New Sale, F4 Hold, F8 History, F9 Pay, F10 Drawer).'
    ],
    nativeSteps: [
      'Local CLI Build: Run `npm run build:mac` on a Mac to generate `release/TalkOS-macOS-2.4.0.dmg` and `.zip`.',
      'GitHub Actions CI: Download the `talkos-macos-dmg` artifact built automatically on `macos-latest`.',
      'Drag TalkOS.app into your `/Applications` folder to complete installation.'
    ]
  },
  {
    id: 'linux',
    name: 'Linux Desktop',
    subtitle: 'Ubuntu, Debian, Fedora, Arch & POS Terminals',
    formats: 'Universal AppImage (.AppImage) · Debian Package (.deb) · PWA',
    artifactName: 'TalkOS-Linux-2.4.0.AppImage / .deb',
    buildCommand: 'npm run build:linux',
    quickInstallSteps: [
      'Open the application in Chromium, Google Chrome, or Brave on Linux.',
      'Click "Install Instant App" or Menu (⋮) → Save and Share → Install Talk of the Town POS.',
      'Creates a desktop launcher entry (`~/.local/share/applications`) with full offline IndexedDB storage.'
    ],
    nativeSteps: [
      'Local CLI Build: Run `npm run build:linux` to compile `release/TalkOS-Linux-2.4.0.AppImage` and `TalkOS-Linux-2.4.0.deb`.',
      'To install the Debian package: `sudo dpkg -i release/TalkOS-Linux-2.4.0.deb`.',
      'To run the AppImage on any distro: `chmod +x release/TalkOS-Linux-2.4.0.AppImage && ./release/TalkOS-Linux-2.4.0.AppImage`.'
    ]
  },
  {
    id: 'android',
    name: 'Android Mobile & POS Tablet',
    subtitle: 'Android 9.0+ Smartphones, Handhelds & Touch POS Terminals',
    formats: 'Android Package (.apk) · Google Play Bundle (.aab) · Mobile PWA',
    artifactName: 'app-release.apk / app-release.aab',
    buildCommand: 'npm run build:android && cd android && ./gradlew assembleDebug',
    quickInstallSteps: [
      'Open this URL in Google Chrome on your Android phone or tablet.',
      'Tap "Install Instant App" above, or tap the Chrome Menu (⋮) → Install app / Add to Home screen.',
      'Runs full-screen with edge-to-edge touch navigation, camera barcode scanning, and offline sync.'
    ],
    nativeSteps: [
      'Local CLI Build: Run `npm run build:android` to build web assets, initialize the Capacitor `android/` project if needed, and sync.',
      'Compile APK: Run `cd android && ./gradlew assembleDebug` (APK saved at `android/app/build/outputs/apk/debug/app-debug.apk`).',
      'GitHub Actions CI: Download `talkos-android-apk-aab` from GitHub Actions for ready-to-install `.apk` and Play Store `.aab` bundles.'
    ]
  },
  {
    id: 'ios',
    name: 'iOS & iPadOS',
    subtitle: 'iPhone & iPad POS Terminals (iOS 15.0+)',
    formats: 'Safari Home Screen App · Capacitor Xcode Archive (.ipa)',
    artifactName: 'talkos-ios-xcode-project.zip',
    buildCommand: 'npm run build:ios && npx cap open ios',
    quickInstallSteps: [
      'Open this application in Safari on your iPhone or iPad.',
      'Tap the Share button (square with arrow pointing up) in the Safari toolbar.',
      'Scroll down and tap "Add to Home Screen", then tap "Add" in the top-right corner.'
    ],
    nativeSteps: [
      'Local CLI Build (macOS with Xcode): Run `npm run build:ios` to compile the bundle, auto-create the Capacitor `ios/` workspace, and sync.',
      'Open in Xcode: Run `npx cap open ios`, select your Apple Developer Team under Signing & Capabilities, and click Product → Archive.',
      'GitHub Actions CI: Download the `talkos-ios-xcode-project` artifact from GitHub Actions ready for Xcode signing.'
    ]
  }
];

export function DownloadInstallModal({ onClose, inline = false }: DownloadInstallModalProps) {
  const { isInstallable, isInstalled, detectedOS, isElectron, isCapacitor, triggerInstall } = usePWAInstall();
  const [selectedOS, setSelectedOS] = useState<DetectedOS>(detectedOS);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [installFeedback, setInstallFeedback] = useState<string | null>(null);

  const activeSpec = PLATFORM_SPECS.find((p) => p.id === selectedOS) || PLATFORM_SPECS[0];

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCmd(label);
      setTimeout(() => setCopiedCmd(null), 2000);
    } catch {
      setCopiedCmd(null);
    }
  };

  const handleOneClickPWA = async () => {
    const result = await triggerInstall();
    if (result === 'accepted') {
      setInstallFeedback('Application installation started.');
    } else if (result === 'manual') {
      if (detectedOS === 'ios') {
        setInstallFeedback('On iPhone/iPad Safari: Tap the Share button → "Add to Home Screen" to install.');
      } else {
        setInstallFeedback(
          'Use your browser address bar "Install App" icon (Chrome/Edge) or Menu (⋮) → "Install Talk of the Town POS".'
        );
      }
    }
  };

  const handleDownloadGuide = () => {
    const guideContent = `# TalkOS Enterprise ERP — Multi-Platform Download & Build Guide
Version: 2.4.0
Firestore Database: ai-studio-talkosarchitectu-438c4707-59bb-4b28-aa84-26b8ca15c574

## 1. Instant Zero-Build Installation (Web PWA — All Platforms)
- **Windows / macOS / Linux (Chrome, Edge, Brave):** Click the "Install App" icon on the right side of the address bar or Menu (⋮) -> Install Talk of the Town POS.
- **Android (Chrome):** Tap Menu (⋮) -> Install app / Add to Home screen.
- **iOS / iPadOS (Safari):** Tap Share -> Add to Home Screen.

## 2. Native Desktop Installers (Electron Builder)
- **Windows (.exe NSIS & Portable):**
  Command: \`npm run build:win\`
  Output: \`release/TalkOS-Windows-2.4.0.exe\`

- **macOS (.dmg & .zip):**
  Command: \`npm run build:mac\`
  Output: \`release/TalkOS-macOS-2.4.0.dmg\`

- **Linux (.AppImage & .deb):**
  Command: \`npm run build:linux\`
  Output: \`release/TalkOS-Linux-2.4.0.AppImage\` and \`release/TalkOS-Linux-2.4.0.deb\`

## 3. Native Mobile Packages (Capacitor)
- **Android (.apk & .aab):**
  Command: \`npm run build:android && cd android && ./gradlew assembleDebug\`
  Output: \`android/app/build/outputs/apk/debug/app-debug.apk\`

- **iOS / iPadOS (Xcode .ipa):**
  Command: \`npm run build:ios && npx cap open ios\`
  Action: In Xcode, select Signing Team -> Product -> Archive.

## 4. Automated GitHub Actions Cloud Releases
Push any \`v*\` tag (\`git tag v2.4.0 && git push origin v2.4.0\`) or trigger "TalkOS Multi-Platform Production Release" via \`workflow_dispatch\` in GitHub Actions to build and download:
- \`talkos-windows-exe\`
- \`talkos-macos-dmg\`
- \`talkos-linux-appimage-deb\`
- \`talkos-android-apk-aab\`
- \`talkos-ios-xcode-project\`
`;
    const blob = new Blob([guideContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'TalkOS-MultiPlatform-Install-Guide.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const content = (
    <div className="bg-white border border-[#ebd5da] rounded-xl overflow-hidden text-[#800000]">
      {/* Header Bar */}
      <div className="px-5 py-4 border-b border-[#ebd5da] bg-[#fdf5f6] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#800000] text-white flex items-center justify-center shrink-0">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#800000] leading-tight">
              Download & Install TalkOS ERP
            </h2>
            <p className="text-xs text-[#800000]/70 mt-0.5">
              Windows · macOS · Linux · Android · iOS/iPadOS · Offline-First Cloud Sync
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDownloadGuide}
            className="px-3 py-1.5 rounded-lg border border-[#ebd5da] bg-white hover:bg-[#fee8eb] text-xs font-semibold text-[#800000] transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Download Guide (.md)</span>
          </button>
          {onClose && !inline && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close download center"
              className="p-1.5 rounded-lg text-[#800000]/70 hover:text-[#800000] hover:bg-[#fee8eb] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Instant Browser / Standalone Install Callout */}
        <div className="p-4 rounded-xl bg-[#fdf5f6] border border-[#ebd5da] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs text-[#800000]/70">
              Detected Platform: <span className="font-semibold text-[#800000] uppercase">{detectedOS}</span>
              {' · '}
              <span>
                {isElectron
                  ? 'Running in Electron Native Desktop'
                  : isCapacitor
                  ? 'Running in Capacitor Native Shell'
                  : isInstalled
                  ? 'Installed in Standalone Mode'
                  : 'Browser Session'}
              </span>
            </div>
            <h3 className="text-sm font-bold text-[#800000]">
              Instant 1-Click Standalone App Installation (No Compiler Required)
            </h3>
            <p className="text-xs text-[#800000]/80 max-w-2xl">
              Install TalkOS directly onto this device right now with full offline IndexedDB persistence, background sync to Firestore, and thermal printer support.
            </p>
            {installFeedback && (
              <p className="text-xs font-semibold text-[#800000] bg-white border border-[#ebd5da] rounded-lg px-3 py-2 mt-2">
                {installFeedback}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isInstalled ? (
              <div className="px-3.5 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0">
                <Check className="w-4 h-4" />
                <span>Installed on Device</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleOneClickPWA}
                className="px-4 py-2 rounded-lg bg-[#800000] hover:bg-[#600000] text-white text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>{isInstallable ? 'Install App Now' : 'Install Instant App'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Platform Selector Tabs */}
        <div>
          <div className="text-xs font-semibold text-[#800000]/70 mb-2">
            Select Operating System for Native Installer & Packaging Instructions:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {PLATFORM_SPECS.map((platform) => {
              const active = selectedOS === platform.id;
              const isCurrentOS = detectedOS === platform.id;
              return (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => setSelectedOS(platform.id)}
                  className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#800000] text-white border-[#800000]'
                      : 'bg-white text-[#800000] border-[#ebd5da] hover:bg-[#fdf5f6]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    {platform.id === 'windows' || platform.id === 'linux' ? (
                      <Monitor className="w-4 h-4 shrink-0" />
                    ) : platform.id === 'macos' ? (
                      <Laptop className="w-4 h-4 shrink-0" />
                    ) : (
                      <Smartphone className="w-4 h-4 shrink-0" />
                    )}
                    {isCurrentOS && (
                      <span
                        className={`text-[10px] font-medium ${
                          active ? 'text-white/80' : 'text-[#800000]/60'
                        }`}
                      >
                        Current OS
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold mt-2 truncate">{platform.name}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Platform Detail View */}
        <div className="border border-[#ebd5da] rounded-xl p-4 space-y-5 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#ebd5da]">
            <div>
              <h3 className="text-base font-bold text-[#800000]">{activeSpec.name}</h3>
              <p className="text-xs text-[#800000]/70 mt-0.5">
                {activeSpec.subtitle} · {activeSpec.formats}
              </p>
            </div>
            <div className="text-xs font-mono text-[#800000] bg-[#fdf5f6] border border-[#ebd5da] px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0">
              Target: {activeSpec.artifactName}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column 1: Instant Install Steps */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#800000]">
                <Globe className="w-4 h-4" />
                <span>Method A: Instant Browser / Home Screen Install</span>
              </div>
              <ol className="space-y-2.5 text-xs text-[#800000]/80 list-decimal list-inside">
                {activeSpec.quickInstallSteps.map((step, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {/* Column 2: Native Binary Packaging & CI Artifacts */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#800000]">
                <HardDrive className="w-4 h-4" />
                <span>Method B: Native Binary Installer ({activeSpec.artifactName})</span>
              </div>
              <ol className="space-y-2.5 text-xs text-[#800000]/80 list-decimal list-inside">
                {activeSpec.nativeSteps.map((step, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {step}
                  </li>
                ))}
              </ol>

              {/* Copyable CLI Build Command */}
              <div className="pt-2">
                <div className="text-[11px] font-semibold text-[#800000]/70 mb-1">
                  One-Command Local Build ({activeSpec.name}):
                </div>
                <div className="flex items-center justify-between gap-2 bg-[#fdf5f6] border border-[#ebd5da] rounded-lg px-3 py-2">
                  <code className="text-xs font-mono text-[#800000] truncate">
                    {activeSpec.buildCommand}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(activeSpec.buildCommand, activeSpec.id)}
                    className="px-2.5 py-1 rounded bg-white border border-[#ebd5da] hover:bg-[#fee8eb] text-[11px] font-semibold text-[#800000] flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {copiedCmd === activeSpec.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-700" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* All-Platform CLI & CI Reference Table */}
        <div className="border border-[#ebd5da] rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-[#fdf5f6] border-b border-[#ebd5da] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-[#800000]">
              <Terminal className="w-4 h-4" />
              <span>Multi-Platform Build & GitHub Actions Artifact Matrix</span>
            </div>
            <span className="text-[11px] text-[#800000]/70 font-mono tabular-nums">
              .github/workflows/production-release.yml
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#ebd5da] text-[#800000]/70 bg-white">
                  <th className="py-2.5 px-4 font-semibold">Platform</th>
                  <th className="py-2.5 px-4 font-semibold">Local Build Command</th>
                  <th className="py-2.5 px-4 font-semibold">Output Path / CI Artifact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ebd5da] font-mono text-[11px]">
                <tr className="hover:bg-[#fdf5f6]">
                  <td className="py-2.5 px-4 font-sans font-semibold text-[#800000]">Windows (.exe)</td>
                  <td className="py-2.5 px-4">npm run build:win</td>
                  <td className="py-2.5 px-4">release/TalkOS-Windows-2.4.0.exe · talkos-windows-exe</td>
                </tr>
                <tr className="hover:bg-[#fdf5f6]">
                  <td className="py-2.5 px-4 font-sans font-semibold text-[#800000]">macOS (.dmg / .zip)</td>
                  <td className="py-2.5 px-4">npm run build:mac</td>
                  <td className="py-2.5 px-4">release/TalkOS-macOS-2.4.0.dmg · talkos-macos-dmg</td>
                </tr>
                <tr className="hover:bg-[#fdf5f6]">
                  <td className="py-2.5 px-4 font-sans font-semibold text-[#800000]">Linux (.AppImage / .deb)</td>
                  <td className="py-2.5 px-4">npm run build:linux</td>
                  <td className="py-2.5 px-4">release/TalkOS-Linux-2.4.0.AppImage · talkos-linux-appimage-deb</td>
                </tr>
                <tr className="hover:bg-[#fdf5f6]">
                  <td className="py-2.5 px-4 font-sans font-semibold text-[#800000]">Android (.apk / .aab)</td>
                  <td className="py-2.5 px-4">npm run build:android</td>
                  <td className="py-2.5 px-4">android/app/build/outputs/apk/ · talkos-android-apk-aab</td>
                </tr>
                <tr className="hover:bg-[#fdf5f6]">
                  <td className="py-2.5 px-4 font-sans font-semibold text-[#800000]">iOS / iPadOS (Xcode)</td>
                  <td className="py-2.5 px-4">npm run build:ios</td>
                  <td className="py-2.5 px-4">ios/App/App.xcworkspace · talkos-ios-xcode-project</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl my-auto max-h-[92vh] overflow-y-auto rounded-xl shadow-xl">
        {content}
      </div>
    </div>
  );
}
