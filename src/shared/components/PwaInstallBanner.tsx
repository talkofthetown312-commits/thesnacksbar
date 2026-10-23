import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { DownloadInstallModal } from './DownloadInstallModal';

export function PwaInstallBanner() {
  const { isInstallable, isInstalled, isIOS, triggerInstall } = usePWAInstall();
  const [showBanner, setShowBanner] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [manualTip, setManualTip] = useState<string | null>(null);

  useEffect(() => {
    if (isInstalled) {
      setShowBanner(false);
      return;
    }
    const dismissed = localStorage.getItem('tott_pwa_dismissed');
    if (!dismissed && (isInstallable || isIOS)) {
      setShowBanner(true);
    }
  }, [isInstallable, isInstalled, isIOS]);

  const handleInstallClick = async () => {
    const res = await triggerInstall();
    if (res === 'accepted') {
      setShowBanner(false);
    } else if (res === 'manual') {
      setManualTip('Tap "All Platforms" for step-by-step install guides for iOS, Android, Windows, macOS & Linux.');
      setShowDownloadModal(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('tott_pwa_dismissed', 'true');
  };

  return (
    <>
      {showBanner && !isInstalled && (
        <div className="bg-[#800000] text-white px-4 py-2.5 flex items-center justify-between text-xs shadow-md z-40">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm block leading-tight">Install Talk of the Town POS</span>
              <span className="text-[11px] text-[#fbe6ea] font-medium">
                {manualTip || 'Install as a native desktop or mobile app with offline support'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-lg bg-white text-[#800000] font-bold hover:bg-[#fee8eb] transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install App</span>
            </button>
            <button
              type="button"
              onClick={() => setShowDownloadModal(true)}
              className="hidden sm:inline-flex px-2.5 py-1.5 rounded-lg border border-white/30 text-white hover:bg-white/10 font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              All Platforms
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 rounded hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {showDownloadModal && (
        <DownloadInstallModal onClose={() => setShowDownloadModal(false)} />
      )}
    </>
  );
}
