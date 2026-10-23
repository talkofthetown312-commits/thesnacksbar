import { useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type DetectedOS = 'windows' | 'macos' | 'linux' | 'android' | 'ios';

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    notifyListeners();
  });
}

export function detectUserOS(): DetectedOS {
  if (typeof window === 'undefined') return 'windows';
  const ua = window.navigator.userAgent.toLowerCase();
  const platform = (window.navigator.platform || '').toLowerCase();

  if (/iphone|ipad|ipod/.test(ua) || (platform === 'macintel' && window.navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  if (/android/.test(ua)) {
    return 'android';
  }
  if (/mac/.test(platform) || /macintosh|mac os x/.test(ua)) {
    return 'macos';
  }
  if (/win/.test(platform) || /windows/.test(ua)) {
    return 'windows';
  }
  if (/linux/.test(platform) || /linux/.test(ua)) {
    return 'linux';
  }
  return 'windows';
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      Boolean((window as unknown as { electronAPI?: { isElectron?: boolean } }).electronAPI?.isElectron) ||
      Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.())
    );
  });

  const detectedOS = detectUserOS();
  const isIOS = detectedOS === 'ios';
  const isElectron =
    typeof window !== 'undefined' &&
    Boolean((window as unknown as { electronAPI?: { isElectron?: boolean } }).electronAPI?.isElectron);
  const isCapacitor =
    typeof window !== 'undefined' &&
    Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());

  useEffect(() => {
    const syncState = () => {
      setDeferredPrompt(globalDeferredPrompt);
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        Boolean((window as unknown as { electronAPI?: { isElectron?: boolean } }).electronAPI?.isElectron) ||
        Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
      setIsInstalled(standalone);
    };

    listeners.add(syncState);
    syncState();

    return () => {
      listeners.delete(syncState);
    };
  }, []);

  const triggerInstall = async (): Promise<'accepted' | 'dismissed' | 'manual'> => {
    if (!globalDeferredPrompt) {
      return 'manual';
    }
    await globalDeferredPrompt.prompt();
    const { outcome } = await globalDeferredPrompt.userChoice;
    if (outcome === 'accepted') {
      globalDeferredPrompt = null;
      setIsInstalled(true);
      notifyListeners();
      return 'accepted';
    }
    return 'dismissed';
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    isElectron,
    isCapacitor,
    detectedOS,
    triggerInstall,
  };
}
