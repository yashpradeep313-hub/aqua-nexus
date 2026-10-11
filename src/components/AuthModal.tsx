import React, { useState } from 'react';
import {
  X,
  Shield,
  User,
  Lock,
  Mail,
  Building,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Database,
  Eye,
  EyeOff
} from 'lucide-react';
import { UserRole, UserProfile } from '../types';
import {
  registerWithEmail,
  signInWithEmail,
  loginWithGoogleWithRole,
  BOOTSTRAP_ADMIN_EMAIL
} from '../services/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
  initialMode?: 'signin' | 'signup';
  defaultRole?: UserRole;
  initialRole?: UserRole;
  onSuccess: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'signin',
  initialMode,
  defaultRole = 'operator',
  initialRole,
  onSuccess
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode || defaultMode);
  const [role, setRole] = useState<UserRole>(initialRole || defaultRole);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [department, setDepartment] = useState('');
  const [adminPasscode, setAdminPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    if (!email || !password) {
      setErrorMessage('Please provide both email address and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must contain at least 6 characters.');
      return;
    }

    // If signing up as Admin, verify security passcode unless bootstrap email
    if (mode === 'signup' && role === 'admin') {
      const isBootstrap = email.trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
      if (!isBootstrap && adminPasscode.trim() !== 'AQUA-ADMIN-2026') {
        setErrorMessage(
          'Security clearance failed: Enter valid Admin Provisioning Passcode (use: AQUA-ADMIN-2026 or authorized admin email).'
        );
        return;
      }
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const result = await registerWithEmail({
          email,
          password,
          displayName: displayName || (role === 'admin' ? 'System Administrator' : 'Grid Operator'),
          role,
          department: department || (role === 'admin' ? 'IT Security & Grid Infrastructure' : 'Water Distribution Ops'),
          adminPasscode
        });
        const userProfile = result.profile;
        setSuccessNotice(`Account successfully registered as ${(role || 'operator').toUpperCase()}! Welcome to Aqua Nexus.`);
        setTimeout(() => {
          onSuccess(userProfile);
          onClose();
        }, 600);
      } else {
        const result = await signInWithEmail(email, password);
        const userProfile = result.profile;
        setSuccessNotice('Signed in successfully.');
        setTimeout(() => {
          onSuccess(userProfile);
          onClose();
        }, 500);
      }
    } catch (err: any) {
      console.error('Auth action error:', err);
      let msg = err.message || 'Authentication error occurred.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password. Please verify credentials or click "Demo Operator" below for instant access.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'This email already exists. Please choose "Sign In" or try a different address.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'The password is too weak. Please use at least 6 characters.';
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = 'Email/Password sign-in method is currently disabled in Firebase Console. Please use "Continue with Google" or Demo Quick Login.';
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await loginWithGoogleWithRole(role);
      if (result && result.profile) {
        setSuccessNotice(`Signed in as ${result.profile.displayName} (${(result.profile.role || 'operator').toUpperCase()}).`);
        setTimeout(() => {
          onSuccess(result.profile);
          onClose();
        }, 400);
      }
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      let msg = err.message || 'Google authentication failed.';
      if (err.code === 'auth/popup-closed-by-user') {
        msg = 'Google sign-in popup was closed before completion.';
      } else if (err.code === 'auth/popup-blocked') {
        msg = 'Google popup was blocked by browser. Please allow popups or use "Demo Operator" / "Demo Admin" below.';
      } else if (err.code === 'auth/unauthorized-domain') {
        msg = 'Domain not authorized in Firebase OAuth settings. Please use Instant Demo accounts below.';
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Instant demo access bypass
  const handleDemoSignIn = (targetRole: UserRole) => {
    setIsLoading(true);
    setTimeout(() => {
      const demoUser: UserProfile = {
        uid: targetRole === 'admin' ? 'demo-admin-yash' : 'demo-op-marcus',
        email: targetRole === 'admin' ? BOOTSTRAP_ADMIN_EMAIL : 'marcus.vance@aquanexus.grid',
        displayName: targetRole === 'admin' ? 'Chief Water System Administrator' : 'Lead Hydrology Dispatcher',
        role: targetRole,
        department: targetRole === 'admin' ? 'Municipal Infrastructure' : 'Central Grid Dispatch',
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };
      setSuccessNotice(`Signed in with verified Demo ${(targetRole || 'operator').toUpperCase()} credentials.`);
      onSuccess(demoUser);
      setIsLoading(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden text-slate-100">
        {/* Header Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 via-cyan-400 to-teal-400" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-950/90 border border-sky-500/50 flex items-center justify-center text-cyan-400 shadow-md">
              {role === 'admin' ? <Shield className="w-4 h-4 text-violet-400" /> : <User className="w-4 h-4 text-cyan-400" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {mode === 'signin' ? 'Aqua Nexus Sign In' : 'Create Operator / Admin Account'}
              </h2>
              <p className="text-[11px] text-cyan-400 font-mono font-medium">
                {role === 'admin' ? 'System Administrator Portal' : 'Municipal Water Grid Console'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs: Sign In vs Sign Up */}
        <div className="flex border border-slate-800 bg-slate-950 p-1 m-4 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === 'signin'
                ? 'bg-slate-800 text-white shadow-md border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-slate-800 text-white shadow-md border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Role Selector Card */}
        <div className="px-5 pb-2">
          <label className="text-[11px] font-mono font-medium text-slate-300 block mb-1.5">
            Select Operational Role
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRole('operator')}
              className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                role === 'operator'
                  ? 'bg-sky-950/80 border-sky-500/60 text-white shadow-md ring-1 ring-sky-500/30'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>Operator</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                Telemetry, leak radar, allocation dispatch
              </p>
            </button>

            <button
              type="button"
              onClick={() => setRole('admin')}
              className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                role === 'admin'
                  ? 'bg-violet-950/80 border-violet-500/60 text-white shadow-md ring-1 ring-violet-500/30'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Shield className="w-3.5 h-3.5 text-violet-400" />
                <span>Admin</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                User roster, security rules & DB ledger
              </p>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 pt-3 space-y-3">
          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="leading-snug">{errorMessage}</div>
            </div>
          )}

          {successNotice && (
            <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Full Name & Department if Sign Up */}
          {mode === 'signup' && (
            <>
              <div>
                <label className="text-[11px] font-mono text-slate-300 block mb-1">
                  Full Name / Title
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="e.g. Marcus Vance (Shift Supervisor)"
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-300 block mb-1">
                  Agency Department / Facility
                </label>
                <div className="relative">
                  <Building className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    placeholder="e.g. Central Metropolitan District Ops"
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>
              </div>
            </>
          )}

          {/* Email */}
          <div>
            <label className="text-[11px] font-mono text-slate-300 block mb-1">
              Operational Email Address
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="operator@aquanexus.grid"
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-mono text-slate-300">
                Security Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
              >
                {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showPassword ? 'Hide' : 'Show'}</span>
              </button>
            </div>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono transition-colors"
              />
            </div>
          </div>

          {/* Admin Verification Passcode if Sign Up as Admin */}
          {mode === 'signup' && role === 'admin' && (
            <div className="p-3 rounded-lg bg-violet-950/80 border border-violet-500/40 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-300">
                <KeyRound className="w-3.5 h-3.5 text-violet-400" />
                <span>Admin Provisioning Clearance Passcode</span>
              </div>
              <input
                type="text"
                value={adminPasscode}
                onChange={e => setAdminPasscode(e.target.value)}
                placeholder="Enter AQUA-ADMIN-2026"
                className="w-full px-3 py-1.5 text-xs rounded-md bg-slate-950 border border-violet-500/50 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-violet-400"
              />
              <p className="text-[10px] text-slate-400 leading-tight">
                Protects the Admin Database. (Pre-authorized admin email {BOOTSTRAP_ADMIN_EMAIL} bypasses passcode).
              </p>
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer shadow-md ${
              role === 'admin'
                ? 'bg-violet-600 hover:bg-violet-500 shadow-violet-900/30'
                : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-900/30'
            }`}
          >
            {isLoading ? (
              <span>Processing authentication...</span>
            ) : mode === 'signin' ? (
              <>
                <span>Sign In as {role === 'admin' ? 'Administrator' : 'Operator'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Create {role === 'admin' ? 'Admin' : 'Operator'} Account</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          {/* Google 1-Click Login */}
          <div className="relative my-3 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <span className="relative px-2 bg-slate-900 text-[10px] font-mono text-slate-400 uppercase">
              Or continue with
            </span>
          </div>

          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={isLoading}
            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-750 hover:bg-slate-700/80 border border-slate-700 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
              />
            </svg>
            <span>Google Account ({role === 'admin' ? 'Admin Access' : 'Operator Access'})</span>
          </button>

          {/* Instant Demo Role Quick Switch */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono text-slate-400 font-medium">Instant Demo Test Accounts</span>
              <span className="text-[10px] text-cyan-400 font-mono font-semibold">1-Click</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoSignIn('operator')}
                className="py-1.5 px-2 rounded-lg bg-sky-950/80 hover:bg-sky-900/80 border border-sky-500/50 text-cyan-300 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <User className="w-3 h-3 text-cyan-400" />
                <span>Demo Operator</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoSignIn('admin')}
                className="py-1.5 px-2 rounded-lg bg-violet-950/80 hover:bg-violet-900/80 border border-violet-500/50 text-violet-300 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <Shield className="w-3 h-3 text-violet-400" />
                <span>Demo Admin</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
