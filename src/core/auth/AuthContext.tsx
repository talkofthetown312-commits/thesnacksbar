import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';
import { logger } from '../logging/logger';
import { authService, UserProfile } from '../../features/auth/services/authService';
import { adminService } from '../../features/admin/services/adminService';
import { offlineDB, DEFAULT_STAFF_PROFILES } from '../offline/db';
import { useAppStore } from '../store/appStore';

const LOCAL_PIN_SESSION_KEY = 'talkos_staff_pin_session_v1';

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  isPinSession: boolean;
  loginWithPin: (pin: string) => Promise<UserProfile>;
  changeStaffPin: (userId: string, newPin: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readSavedPinSession(): { user: any; profile: UserProfile } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_PIN_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.user && parsed.profile) {
      return parsed;
    }
  } catch {
    // ignore corrupted session
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(() => readSavedPinSession()?.user || null);
  const [profile, setProfile] = useState<UserProfile | null>(() => readSavedPinSession()?.profile || null);
  const [isPinSession, setIsPinSession] = useState<boolean>(() => Boolean(readSavedPinSession()));
  const [loading, setLoading] = useState(true);

  const setBranchId = useAppStore(state => state.setBranchId);
  const currentBranchId = useAppStore(state => state.branchId);

  useEffect(() => {
    // Ensure local master database is initialized in background on boot
    offlineDB.initializeTalkOSDatabase({ syncToCloud: false }).catch(err => {
      logger.warn('Background DB initialization warning', err);
    });

    const savedPin = readSavedPinSession();

    if (!auth) {
      if (savedPin) {
        setUser(savedPin.user);
        setProfile(savedPin.profile);
        setIsPinSession(true);
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setIsPinSession(false);
        setUser(currentUser);
        try {
          const isOwnerUid = currentUser.uid === 'DeQd1Y2YWjQt0eFjQ4iWPThuBAJ3' || currentUser.email === 'talkofthetown312@gmail.com';
          const userProfile = await authService.getUserProfile(currentUser.uid);
          if (userProfile) {
            if (isOwnerUid) {
              userProfile.roles = Array.from(new Set([...userProfile.roles, 'OWNER', 'ADMIN', 'MANAGER']));
              userProfile.permissions = ['*'];
            }
            setProfile(userProfile);
            if (userProfile.defaultBranch && !currentBranchId) {
              setBranchId(userProfile.defaultBranch);
            }
          } else {
            setProfile({
              uid: currentUser.uid,
              email: currentUser.email,
              phoneNumber: currentUser.phoneNumber,
              displayName: currentUser.displayName || (isOwnerUid ? 'Talk of the Town (Owner)' : 'Authenticated User'),
              roles: isOwnerUid ? ['OWNER', 'ADMIN', 'MANAGER'] : ['MANAGER'],
              permissions: ['*'],
              branches: ['br_main'],
              createdAt: new Date().toISOString()
            });
          }
          logger.info('User authenticated via Firebase', { uid: currentUser.uid });
        } catch (error) {
          logger.warn('Failed to retrieve user profile, using fallback profile', error);
          const isOwnerUid = currentUser.uid === 'DeQd1Y2YWjQt0eFjQ4iWPThuBAJ3' || currentUser.email === 'talkofthetown312@gmail.com';
          setProfile({
            uid: currentUser.uid,
            email: currentUser.uid,
            phoneNumber: currentUser.phoneNumber,
            displayName: currentUser.displayName || (isOwnerUid ? 'Talk of the Town (Owner)' : 'Authenticated User'),
            roles: isOwnerUid ? ['OWNER', 'ADMIN', 'MANAGER'] : ['MANAGER'],
            permissions: ['*'],
            branches: ['br_main'],
            createdAt: new Date().toISOString()
          });
        }
      } else {
        const localSession = readSavedPinSession();
        if (localSession) {
          setUser(localSession.user);
          setProfile(localSession.profile);
          setIsPinSession(true);
        } else {
          setUser(null);
          setProfile(null);
          setIsPinSession(false);
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [setBranchId, currentBranchId]);

  const loginWithPin = async (pin: string): Promise<UserProfile> => {
    const cleanPin = pin.trim();
    if (!/^\d{4,8}$/.test(cleanPin)) {
      throw new Error('Please enter a valid 4 to 8 digit staff PIN.');
    }

    const [users, sysConfig] = await Promise.all([
      adminService.getUsers().catch(() => DEFAULT_STAFF_PROFILES as any[]),
      adminService.getSystemConfig().catch(() => null)
    ]);

    let matchedStaff = users.find(u => u.status === 'ACTIVE' && u.pin === cleanPin);

    if (!matchedStaff && sysConfig?.defaultStaffPin && cleanPin === sysConfig.defaultStaffPin) {
      matchedStaff = users.find(u => u.role === 'OWNER') || (DEFAULT_STAFF_PROFILES[0] as any);
    }

    if (!matchedStaff) {
      const fallbackMatch = DEFAULT_STAFF_PROFILES.find(s => s.pin === cleanPin);
      if (fallbackMatch) {
        matchedStaff = fallbackMatch as any;
      }
    }

    if (!matchedStaff) {
      throw new Error('Invalid staff PIN. Try 1234 (Owner), 2222 (Manager), 1111 (Cashier), or 3333 (Kitchen).');
    }

    const roles = matchedStaff.role === 'OWNER'
      ? ['OWNER', 'ADMIN', 'MANAGER']
      : [matchedStaff.role || 'CASHIER'];

    const pinProfile: UserProfile = {
      uid: matchedStaff.id,
      email: matchedStaff.email || `${matchedStaff.role.toLowerCase()}@talkofthetown.local`,
      phoneNumber: null,
      displayName: matchedStaff.name,
      roles,
      permissions: ['*'],
      branches: matchedStaff.branchIds || ['br_main'],
      defaultBranch: 'br_main',
      createdAt: new Date().toISOString()
    };

    const pinUser = {
      uid: matchedStaff.id,
      email: pinProfile.email,
      displayName: matchedStaff.name,
      isLocalPinSession: true
    };

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCAL_PIN_SESSION_KEY, JSON.stringify({ user: pinUser, profile: pinProfile }));
    }

    setUser(pinUser);
    setProfile(pinProfile);
    setIsPinSession(true);
    if (!currentBranchId) {
      setBranchId('br_main');
    }

    await adminService.recordAuditLog({
      userId: matchedStaff.id,
      userName: matchedStaff.name,
      action: 'PIN_UNLOCK',
      module: 'AUTH',
      details: `Unlocked terminal via local Staff PIN (${matchedStaff.role})`
    }).catch(() => {});

    return pinProfile;
  };

  const changeStaffPin = async (userId: string, newPin: string): Promise<void> => {
    const cleanPin = newPin.trim();
    if (!/^\d{4,8}$/.test(cleanPin)) {
      throw new Error('New PIN must be 4 to 8 digits.');
    }
    await adminService.updateUser(userId, { pin: cleanPin });
    if (profile?.roles?.includes('OWNER') && userId === profile.uid) {
      await adminService.updateSystemConfig({ defaultStaffPin: cleanPin });
    }
    await adminService.recordAuditLog({
      userId: profile?.uid || userId,
      userName: profile?.displayName || 'Staff',
      action: 'PIN_CHANGE',
      module: 'SECURITY',
      details: `Updated staff access PIN for user ${userId}`
    }).catch(() => {});
  };

  const logout = async () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(LOCAL_PIN_SESSION_KEY);
    }
    setIsPinSession(false);
    setUser(null);
    setProfile(null);
    if (auth && auth.currentUser) {
      await signOut(auth).catch(() => {});
    }
  };

  const hasRole = (role: string): boolean => {
    return profile?.roles?.includes(role) || profile?.roles?.includes('OWNER') || false;
  };

  const hasPermission = (permission: string): boolean => {
    return profile?.permissions?.includes('*') || profile?.permissions?.includes(permission) || false;
  };

  const value: AuthContextType = {
    user,
    profile,
    loading,
    isPinSession,
    loginWithPin,
    changeStaffPin,
    logout,
    hasRole,
    hasPermission
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
