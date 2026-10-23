import React, { useState, useEffect } from 'react';
import { useAdminStore } from '../store/adminStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/Card';
import {
  Save,
  Database,
  RefreshCw,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  CloudUpload
} from 'lucide-react';
import { offlineDB, SyncStatusSummary } from '../../../core/offline/db';
import { useAuth } from '../../../core/auth/AuthContext';

export function SystemConfigForm() {
  const { config, updateSystemConfig, loadAdminData } = useAdminStore();
  const { profile, changeStaffPin } = useAuth();

  const [companyName, setCompanyName] = useState(config?.companyName || 'Talk of the Town');
  const [defaultCurrency, setDefaultCurrency] = useState(config?.defaultCurrency || 'INR');
  const [taxType, setTaxType] = useState<'GST' | 'VAT'>((config?.taxType as 'GST' | 'VAT') || 'GST');
  const [timezone, setTimezone] = useState(config?.timezone || 'Asia/Kolkata');
  const [defaultStaffPin, setDefaultStaffPin] = useState(config?.defaultStaffPin || '1234');

  // Staff PIN self-service update
  const [newStaffPin, setNewStaffPin] = useState('');
  const [pinSaveMsg, setPinSaveMsg] = useState<string | null>(null);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveBanner, setSaveBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync & DB Initialization state
  const [syncStatus, setSyncStatus] = useState<SyncStatusSummary>({
    pendingCount: 0,
    lastSyncedAt: null,
    lastError: null,
    isSyncing: false,
    dbInitialized: true
  });
  const [initializingDb, setInitializingDb] = useState(false);
  const [flushingSync, setFlushingSync] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (config) {
      setCompanyName(config.companyName);
      setDefaultCurrency(config.defaultCurrency);
      setTaxType((config.taxType as 'GST' | 'VAT') || 'GST');
      setTimezone(config.timezone);
      setDefaultStaffPin(config.defaultStaffPin || '1234');
    }
  }, [config]);

  useEffect(() => {
    return offlineDB.subscribeSyncStatus(setSyncStatus);
  }, []);

  if (!config) return null;

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveBanner(null);
    try {
      await updateSystemConfig({
        companyName: companyName.trim() || 'Talk of the Town',
        defaultCurrency,
        taxType,
        timezone,
        defaultStaffPin: defaultStaffPin.trim() || '1234'
      });
      setSaveBanner({ type: 'success', text: 'System configuration saved to local & cloud storage.' });
    } catch (err: any) {
      setSaveBanner({ type: 'error', text: err?.message || 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMyPin = async () => {
    if (!/^\d{4,8}$/.test(newStaffPin.trim())) {
      setPinSaveMsg('PIN must be 4 to 8 digits.');
      return;
    }
    try {
      await changeStaffPin(newStaffPin.trim(), profile?.uid || 'staff_owner');
      setPinSaveMsg('Your terminal PIN has been updated.');
      setNewStaffPin('');
      await loadAdminData();
    } catch (err: any) {
      setPinSaveMsg(err?.message || 'Failed to update PIN');
    }
  };

  const handleInitializeMasterDb = async () => {
    setInitializingDb(true);
    setBackupMessage(null);
    try {
      const res = await offlineDB.initializeTalkOSDatabase({ syncToCloud: true });
      setBackupMessage({
        type: 'success',
        text: `Master database verified (${res.inventoryCount} inventory items, ${res.menuItemsCount} menu items, ${res.menuSizesCount} size variants, ${res.recipesCount} recipes). Existing stock balances were preserved.`
      });
    } catch (err: any) {
      setBackupMessage({
        type: 'error',
        text: err?.message || 'Database initialization encountered an error.'
      });
    } finally {
      setInitializingDb(false);
    }
  };

  const handleFlushSync = async () => {
    setFlushingSync(true);
    try {
      const res = await offlineDB.flushSyncQueue();
      setBackupMessage({
        type: 'success',
        text: `Sync queue processed (${res.synced} synced, ${res.failed} remaining in local outbox).`
      });
    } catch (err: any) {
      setBackupMessage({
        type: 'error',
        text: err?.message || 'Could not flush sync queue.'
      });
    } finally {
      setFlushingSync(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const snapshot = await offlineDB.exportBackupSnapshot();
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `talkos-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupMessage({
        type: 'success',
        text: 'Full TalkOS JSON backup downloaded successfully.'
      });
    } catch (err: any) {
      setBackupMessage({
        type: 'error',
        text: err?.message || 'Failed to export database backup.'
      });
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackupMessage(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const validation = offlineDB.validateBackupSnapshot(parsed);
      if (!validation.valid) {
        setBackupMessage({
          type: 'error',
          text: `Invalid backup file: ${validation.errors.join(', ')}`
        });
        return;
      }
      await offlineDB.restoreBackupSnapshot(parsed, { syncToCloud: true });
      await loadAdminData();
      const colCount = Object.keys(parsed.collections || {}).length;
      setBackupMessage({
        type: 'success',
        text: `Backup restored (${colCount} collections verified and synchronized).`
      });
    } catch (err: any) {
      setBackupMessage({
        type: 'error',
        text: err?.message || 'Failed to parse or restore backup file.'
      });
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <form onSubmit={handleSaveConfig} className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">System Configuration</h2>
            <p className="text-xs text-slate-500">Restaurant profile, currency, tax & PIN terminal preferences</p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold text-sm disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {saveBanner && (
          <div className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${
            saveBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300'
          }`}>
            {saveBanner.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{saveBanner.text}</span>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">General Restaurant Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Default Currency</label>
                <select
                  value={defaultCurrency}
                  onChange={e => setDefaultCurrency(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tax Type</label>
                <select
                  value={taxType}
                  onChange={e => setTaxType(e.target.value as 'GST' | 'VAT')}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="GST">GST (5% Split CGST/SGST)</option>
                  <option value="VAT">VAT</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Time Zone</label>
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-indigo-600" />
              Staff PIN & Local Screen Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-slate-500">
              Daily restaurant operations do not require Google Sign-In. Staff can unlock the terminal offline or online using their 4-digit PIN (Owner: 1234, Manager: 2222, Cashier: 1111, Kitchen: 3333).
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Default Owner Fallback PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  value={defaultStaffPin}
                  onChange={e => setDefaultStaffPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Update Active User PIN ({profile?.displayName || 'Current Staff'})
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    placeholder="New 4-8 digit PIN"
                    value={newStaffPin}
                    onChange={e => setNewStaffPin(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleUpdateMyPin}
                    className="px-3 py-2 bg-slate-900 dark:bg-slate-700 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Update PIN
                  </button>
                </div>
                {pinSaveMsg && <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">{pinSaveMsg}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Database, Sync & Backup Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            Database Initialization, Sync Queue & Backups
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {backupMessage && (
            <div className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${
              backupMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
                : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300'
            }`}>
              {backupMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{backupMessage.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <div>
              <span className="text-slate-500 block">Database Engine</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {syncStatus.dbInitialized ? 'Initialized (Offline-First + Cloud)' : 'Initializing...'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Pending Outbox Queue</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {syncStatus.pendingCount} mutation(s) queued
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Last Cloud Sync</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {syncStatus.lastSyncedAt ? new Date(syncStatus.lastSyncedAt).toLocaleTimeString('en-IN') : 'Local Active'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleInitializeMasterDb}
              disabled={initializingDb}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs font-semibold disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${initializingDb ? 'animate-spin' : ''}`} />
              {initializingDb ? 'Verifying Master Data...' : 'Verify & Seed Master Data (144 Items)'}
            </button>

            <button
              type="button"
              onClick={handleFlushSync}
              disabled={flushingSync}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold disabled:opacity-50 cursor-pointer"
            >
              <CloudUpload className="w-4 h-4" />
              {flushingSync ? 'Syncing...' : 'Sync Pending Outbox Now'}
            </button>

            <button
              type="button"
              onClick={handleExportBackup}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs font-semibold cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export JSON Backup
            </button>

            <label className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-xs font-semibold cursor-pointer">
              <Upload className="w-4 h-4" />
              Restore JSON Backup
              <input
                type="file"
                accept="application/json,.json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
