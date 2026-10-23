import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { KeyRound, ArrowLeft, Loader2, Delete, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext';

export function PinAuthPage() {
  const navigate = useNavigate();
  const { loginWithPin } = useAuth();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submitPin = async (pinToVerify: string) => {
    setError('');
    setLoading(true);
    try {
      await loginWithPin(pinToVerify);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid PIN');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitPin(pin);
  };

  const handleDigitPress = (digit: string) => {
    if (pin.length >= 8) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    setError('');
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/auth" className="p-1.5 rounded-lg text-[#800000]/70 hover:text-[#800000] hover:bg-[#fdf5f6]">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h2 className="text-xl font-black text-[#800000] ml-2">Staff Terminal PIN</h2>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#fdf5f6] border border-[#ebd5da] text-[#800000]">
          <ShieldCheck className="w-3.5 h-3.5" /> Offline Ready
        </span>
      </div>

      <p className="text-xs text-[#800000]/75 mb-4 font-medium">
        Enter your staff PIN for immediate local POS, KDS &amp; Inventory access. No Google or cloud login is required for daily counter operations.
      </p>

      {error && (
        <div role="alert" className="mb-4 bg-[#fee8eb] border border-[#ebd5da] text-[#800000] px-4 py-3 rounded-lg text-xs font-bold">
          {error}
        </div>
      )}

      <form onSubmit={handlePinLogin} className="space-y-4">
        <div>
          <label htmlFor="staff-pin-input" className="block text-xs font-bold uppercase tracking-wider text-[#800000]/80 mb-1">
            Staff Access PIN
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <KeyRound className="h-5 w-5 text-[#800000]/60" />
            </div>
            <input
              id="staff-pin-input"
              type="password"
              required
              maxLength={8}
              pattern="[0-9]*"
              inputMode="numeric"
              autoFocus
              className="block w-full pl-10 pr-3 py-3 border-2 border-[#ebd5da] rounded-xl bg-[#fdf5f6] text-[#800000] placeholder-[#800000]/30 focus:outline-none focus:border-[#800000] text-2xl font-black text-center tracking-[0.6em]"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            />
          </div>
        </div>

        {/* Touch Keypad for Android Tablets / POS Terminals */}
        <div className="grid grid-cols-3 gap-2 select-none">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigitPress(digit)}
              className="py-3 rounded-xl border border-[#ebd5da] bg-white hover:bg-[#fdf5f6] active:bg-[#fee8eb] text-lg font-black text-[#800000] shadow-2xs transition-colors cursor-pointer"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPin('')}
            className="py-3 rounded-xl border border-[#ebd5da] bg-[#fdf5f6] hover:bg-[#fee8eb] text-xs font-black uppercase text-[#800000] transition-colors cursor-pointer"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleDigitPress('0')}
            className="py-3 rounded-xl border border-[#ebd5da] bg-white hover:bg-[#fdf5f6] active:bg-[#fee8eb] text-lg font-black text-[#800000] shadow-2xs transition-colors cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            aria-label="Backspace"
            className="py-3 rounded-xl border border-[#ebd5da] bg-[#fdf5f6] hover:bg-[#fee8eb] flex items-center justify-center text-[#800000] transition-colors cursor-pointer"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <button
          type="submit"
          disabled={loading || pin.length < 4}
          className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-black text-white bg-[#800000] hover:bg-[#680016] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000] disabled:opacity-50 cursor-pointer transition-colors"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Unlock Terminal'}
        </button>
      </form>

      {/* Quick Role Reference for Staff Setup */}
      <div className="mt-5 pt-4 border-t border-[#ebd5da]">
        <p className="text-[11px] font-bold text-[#800000]/70 uppercase tracking-wider mb-2 text-center">
          Default Role PINs (Configurable in Settings)
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => submitPin('1234')}
            className="p-2 rounded-lg border border-[#ebd5da] bg-[#fdf5f6] hover:bg-[#fee8eb] text-left cursor-pointer"
          >
            <span className="font-black text-[#800000] block">Owner / Admin</span>
            <span className="text-[11px] text-[#800000]/70 font-mono">PIN: 1234</span>
          </button>
          <button
            type="button"
            onClick={() => submitPin('2222')}
            className="p-2 rounded-lg border border-[#ebd5da] bg-[#fdf5f6] hover:bg-[#fee8eb] text-left cursor-pointer"
          >
            <span className="font-black text-[#800000] block">Duty Manager</span>
            <span className="text-[11px] text-[#800000]/70 font-mono">PIN: 2222</span>
          </button>
          <button
            type="button"
            onClick={() => submitPin('1111')}
            className="p-2 rounded-lg border border-[#ebd5da] bg-[#fdf5f6] hover:bg-[#fee8eb] text-left cursor-pointer"
          >
            <span className="font-black text-[#800000] block">POS Cashier</span>
            <span className="text-[11px] text-[#800000]/70 font-mono">PIN: 1111</span>
          </button>
          <button
            type="button"
            onClick={() => submitPin('3333')}
            className="p-2 rounded-lg border border-[#ebd5da] bg-[#fdf5f6] hover:bg-[#fee8eb] text-left cursor-pointer"
          >
            <span className="font-black text-[#800000] block">Kitchen (KDS)</span>
            <span className="text-[11px] text-[#800000]/70 font-mono">PIN: 3333</span>
          </button>
        </div>
      </div>
    </div>
  );
}
