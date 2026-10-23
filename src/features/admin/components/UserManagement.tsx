import React, { useState } from 'react';
import { useAdminStore } from '../store/adminStore';
import { UserPlus, Shield, Trash2, X, Check, Copy, KeyRound } from 'lucide-react';
import { Role } from '../models/admin';

export function UserManagement() {
  const { users, addUser, updateUser, deleteUser } = useAdminStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingPinId, setEditingPinId] = useState<string | null>(null);
  const [editingPinValue, setEditingPinValue] = useState('');
  const [bannerError, setBannerError] = useState<string | null>(null);

  // Form State
  const [uid, setUid] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('CASHIER');
  const [pinCode, setPinCode] = useState('1111');
  const [selectedBranches] = useState<string[]>(['br_main']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Please provide user name and email');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await addUser({
        id: uid.trim() || undefined,
        name: name.trim(),
        email: email.trim(),
        role,
        pin: pinCode.trim() || '1111',
        branchIds: selectedBranches.length ? selectedBranches : ['br_main'],
        status: 'ACTIVE',
        lastLogin: new Date().toISOString()
      });
      setShowAddModal(false);
      setUid('');
      setName('');
      setEmail('');
      setRole('CASHIER');
      setPinCode('1111');
    } catch (err: any) {
      setError(err?.message || 'Failed to add user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavePin = async (userId: string) => {
    if (!/^\d{4,8}$/.test(editingPinValue.trim())) {
      setBannerError('PIN must be 4 to 8 numeric digits.');
      return;
    }
    setBannerError(null);
    await updateUser(userId, { pin: editingPinValue.trim() });
    setEditingPinId(null);
    setEditingPinValue('');
  };

  const handleDelete = async (id: string) => {
    if (id === 'DeQd1Y2YWjQt0eFjQ4iWPThuBAJ3') {
      setBannerError('The primary Owner / Super Administrator UID cannot be removed.');
      return;
    }
    await deleteUser(id);
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Users, Roles & Staff PINs</h2>
          <p className="text-xs text-slate-500">Manage ERP staff, assign branch permissions, UID roles, and local terminal PINs</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium text-sm cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Add User / UID
        </button>
      </div>

      {bannerError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex justify-between items-center">
          <span>{bannerError}</span>
          <button onClick={() => setBannerError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="p-4 font-semibold text-slate-700 dark:text-slate-300">User / UID</th>
                <th className="p-4 font-semibold text-slate-700 dark:text-slate-300">Role</th>
                <th className="p-4 font-semibold text-slate-700 dark:text-slate-300">Terminal PIN</th>
                <th className="p-4 font-semibold text-slate-700 dark:text-slate-300">Status</th>
                <th className="p-4 font-semibold text-slate-700 dark:text-slate-300">Last Login</th>
                <th className="p-4 font-semibold text-slate-700 dark:text-slate-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {users.map((user) => {
                const isOwner = user.id === 'DeQd1Y2YWjQt0eFjQ4iWPThuBAJ3' || user.role === 'OWNER';
                return (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/25 transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white">{user.name}</span>
                          {isOwner && (
                            <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 rounded">
                              Super Admin
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-slate-500">{user.email}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            UID: {user.id}
                          </span>
                          <button
                            onClick={() => handleCopy(user.id)}
                            title="Copy UID"
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                          >
                            {copiedId === user.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md ${
                        user.role === 'OWNER' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800' :
                        user.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                        user.role === 'MANAGER' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        <Shield className="w-3 h-3" />
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      {editingPinId === user.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={8}
                            value={editingPinValue}
                            onChange={e => setEditingPinValue(e.target.value.replace(/\D/g, ''))}
                            className="w-20 px-2 py-1 text-xs font-mono border border-indigo-400 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            placeholder="4 digits"
                          />
                          <button
                            type="button"
                            onClick={() => handleSavePin(user.id)}
                            className="px-2 py-1 text-xs font-bold bg-indigo-600 text-white rounded hover:bg-indigo-700"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPinId(null)}
                            className="px-1.5 py-1 text-xs text-slate-500 hover:text-slate-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-700 dark:text-slate-300">
                            {user.pin ? `•••• (${user.pin})` : 'Not set'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPinId(user.id);
                              setEditingPinValue(user.pin || '1111');
                            }}
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <KeyRound className="w-3 h-3" /> Change
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center justify-center px-2.5 py-1 text-xs font-medium rounded-full ${
                        user.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 text-sm">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleString('en-IN') : 'Active'}
                    </td>
                    <td className="p-4 text-right">
                      {user.id !== 'DeQd1Y2YWjQt0eFjQ4iWPThuBAJ3' && (
                        confirmDeleteId === user.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDelete(user.id)}
                              className="px-2 py-1 text-xs font-bold bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setConfirmDeleteId(user.id)}
                            className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                            title="Remove user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 dark:text-white">Add Staff / Register UID & PIN</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="p-5 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Firebase UID (Optional / Auto-generated if blank)
                </label>
                <input
                  type="text"
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                  placeholder="e.g. staff_cashier_2"
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Talk of the Town Manager"
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. talkofthetown312@gmail.com"
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    System Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="OWNER">OWNER</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="ACCOUNTANT">ACCOUNTANT</option>
                    <option value="HR">HR</option>
                    <option value="CASHIER">CASHIER</option>
                    <option value="CHEF">CHEF</option>
                    <option value="WAITER">WAITER</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Terminal PIN (4-8 digits) *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    maxLength={8}
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="1111"
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
