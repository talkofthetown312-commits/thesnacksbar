import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Download } from 'lucide-react';
import { DownloadInstallModal } from '../../../shared/components/DownloadInstallModal';

export function AuthLayout() {
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#800000] text-white font-black text-2xl shadow-md mb-3">
          T
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-[#800000] mb-1">TalkOS</h1>
        <p className="text-[#800000]/70 font-semibold text-xs">Enterprise Restaurant OS</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md space-y-4">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-xl sm:px-10 border border-[#ebd5da]">
          <Outlet />
        </div>

        <div className="text-center px-4">
          <button
            type="button"
            onClick={() => setShowDownloadModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#ebd5da] bg-[#fdf5f6] hover:bg-[#fee8eb] text-xs font-semibold text-[#800000] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Desktop & Mobile App (Windows · macOS · Linux · Android · iOS)</span>
          </button>
        </div>
      </div>

      {showDownloadModal && (
        <DownloadInstallModal onClose={() => setShowDownloadModal(false)} />
      )}
    </div>
  );
}
