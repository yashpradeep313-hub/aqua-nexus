import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  collection,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  SEED_ZONES,
  SEED_SENSITIVITIES,
  SEED_ANOMALIES,
  PRECOMPUTED_FORECASTS,
  SEED_METRICS
} from '../data/seedData';
import {
  Zone,
  HourlyForecast,
  ZoneSensitivity,
  Anomaly,
  ModelMetricsReport,
  ScenarioDefinition,
  SavedPlan,
  UserProfile,
  UserRole,
  AuditLogEntry,
  AdminMember
} from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
  return errInfo;
}

// Connection test mandated by Firebase skill
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is currently offline or unreachable.');
    }
    return false;
  }
}

/**
 * Seeds Firestore with precomputed data if not already present.
 */
export async function seedFirestoreIfEmpty(): Promise<{ seeded: boolean; message: string }> {
  try {
    const zonesRef = collection(db, 'zones');
    const snapshot = await getDocs(zonesRef);
    if (!snapshot.empty) {
      return { seeded: false, message: 'Firestore already populated with water grid data.' };
    }

    // Seed zones
    for (const z of SEED_ZONES) {
      await setDoc(doc(db, 'zones', z.id), z);
    }

    // Seed sensitivities
    for (const s of SEED_SENSITIVITIES) {
      await setDoc(doc(db, 'sensitivity', s.zoneId), s);
    }

    // Seed anomalies
    for (const a of SEED_ANOMALIES) {
      await setDoc(doc(db, 'anomalies', a.id), a);
    }

    // Seed model metrics
    await setDoc(doc(db, 'metrics', 'latest'), SEED_METRICS);

    // Seed first 24h forecasts per zone
    const sampleForecasts = PRECOMPUTED_FORECASTS.filter(f => f.horizonHour <= 24);
    for (const f of sampleForecasts) {
      const forecastId = `${f.zoneId}_h${f.horizonHour}`;
      await setDoc(doc(db, 'forecasts', forecastId), f);
    }

    return { seeded: true, message: 'Successfully seeded 6 zones, sensitivities, forecasts, and anomaly telemetry.' };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seed');
    return { seeded: false, message: 'Seeding to Firestore skipped or failed (offline demo fallback active).' };
  }
}

export async function loginWithGoogle() {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    return res.user;
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
}

export async function logoutUser() {
  await signOut(auth);
}

export async function updateAnomalyStatus(anomalyId: string, status: 'Investigating' | 'Resolved' | 'False alarm') {
  try {
    const anomRef = doc(db, 'anomalies', anomalyId);
    await updateDoc(anomRef, {
      status,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `anomalies/${anomalyId}`);
    throw error;
  }
}

export async function saveOperatorPlan(plan: SavedPlan) {
  try {
    const planRef = doc(db, 'plans', plan.id);
    await setDoc(planRef, plan);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `plans/${plan.id}`);
    throw error;
  }
}

export async function saveOperatorScenario(scenario: ScenarioDefinition) {
  try {
    const scenRef = doc(db, 'scenarios', scenario.id);
    await setDoc(scenRef, scenario);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `scenarios/${scenario.id}`);
    throw error;
  }
}

export const BOOTSTRAP_ADMIN_EMAIL = 'yashpradeep313@gmail.com';
export const ADMIN_PASSCODE = 'AQUA-ADMIN-2026';

// Seeded mock users for initial database population or demo offline fallback
export const SEED_USERS: UserProfile[] = [
  {
    uid: 'admin-lead-01',
    email: 'yashpradeep313@gmail.com',
    displayName: 'Lead System Admin',
    role: 'admin',
    department: 'Municipal Operations Directorate',
    status: 'active',
    createdAt: '2026-10-01T08:00:00Z',
    lastLogin: new Date().toISOString()
  },
  {
    uid: 'op-elena-02',
    email: 'elena.vance@aquanexus.gov',
    displayName: 'Elena Vance',
    role: 'operator',
    department: 'Zone Hydraulic Dispatch (MC-01, EV-04)',
    status: 'active',
    createdAt: '2026-10-02T09:30:00Z',
    lastLogin: new Date(Date.now() - 3600000).toISOString()
  },
  {
    uid: 'op-marcus-03',
    email: 'm.brody@aquanexus.gov',
    displayName: 'Marcus Brody',
    role: 'operator',
    department: 'Trunk Main Inter-connection Unit',
    status: 'active',
    createdAt: '2026-10-04T11:15:00Z',
    lastLogin: new Date(Date.now() - 7200000).toISOString()
  },
  {
    uid: 'op-sarah-04',
    email: 'sarah.lin@aquanexus.gov',
    displayName: 'Sarah Lin',
    role: 'operator',
    department: 'Acoustic Leak & Anomaly Response',
    status: 'active',
    createdAt: '2026-10-06T14:40:00Z',
    lastLogin: new Date(Date.now() - 14400000).toISOString()
  }
];

export const SEED_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log-seed-01',
    timestamp: new Date(Date.now() - 18000000).toISOString(),
    actorUid: 'admin-lead-01',
    actorEmail: 'yashpradeep313@gmail.com',
    actorRole: 'admin',
    action: 'SYSTEM_BOOTSTRAP',
    details: 'Provisioned Aqua Nexus water grid database, deployed security rules, configured default 46.0 ML crisis baseline.'
  },
  {
    id: 'log-seed-02',
    timestamp: new Date(Date.now() - 12000000).toISOString(),
    actorUid: 'op-elena-02',
    actorEmail: 'elena.vance@aquanexus.gov',
    actorRole: 'operator',
    action: 'ANOMALY_STATUS_UPDATE',
    details: 'Updated anomaly EV-04 (East Valley commercial surge) status to Investigating.'
  },
  {
    id: 'log-seed-03',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    actorUid: 'op-marcus-03',
    actorEmail: 'm.brody@aquanexus.gov',
    actorRole: 'operator',
    action: 'DISPATCH_PLAN_SIMULATION',
    details: 'Evaluated P90 deficit mitigation: Protected Metro Core hospital trunk main via 3.20 ML transfer.'
  },
  {
    id: 'log-seed-04',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    actorUid: 'admin-lead-01',
    actorEmail: 'yashpradeep313@gmail.com',
    actorRole: 'admin',
    action: 'RBAC_SECURITY_AUDIT',
    details: 'Verified Firestore security rules: Default deny active, PII isolation verified on /users collection.'
  }
];

/**
 * Registers a new user with Email & Password.
 * Creates an entry in `/users/{uid}`, and if role is admin adds to `/admins/{uid}`.
 */
export async function registerWithEmail(params: {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  department?: string;
  adminPasscode?: string;
}): Promise<{ user: FirebaseUser; profile: UserProfile }> {
  const { email, password, displayName, role, department, adminPasscode } = params;

  // Admin validation passcode check
  if (role === 'admin') {
    const isBootstrap = email.trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
    const isValidPasscode = adminPasscode?.trim() === ADMIN_PASSCODE;
    if (!isBootstrap && !isValidPasscode) {
      throw new Error(
        `Invalid Admin Verification Passcode. Enter the administrator key (${ADMIN_PASSCODE}) to register as System Admin.`
      );
    }
  }

  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  if (displayName) {
    try {
      await updateProfile(user, { displayName });
    } catch {
      // Non-fatal if display name update fails
    }
  }

  const profile: UserProfile = {
    uid: user.uid,
    email: user.email || email,
    displayName: displayName || (role === 'admin' ? 'System Administrator' : 'Grid Operator'),
    role,
    department: department || (role === 'admin' ? 'Municipal Administration' : 'Hydraulic Operations'),
    status: 'active',
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  };

  try {
    // Save user profile to Firestore
    await setDoc(doc(db, 'users', user.uid), profile);

    // If admin, record in /admins
    if (role === 'admin') {
      await setDoc(doc(db, 'admins', user.uid), {
        uid: user.uid,
        email: user.email || email,
        assignedBy: 'Self Registration (Verified)',
        createdAt: new Date().toISOString()
      });
    }

    // Record audit log
    await recordAuditLog(
      'USER_SIGN_UP',
      `Registered as ${role.toUpperCase()}: ${profile.displayName} (${profile.email})`,
      { uid: user.uid, email: profile.email, role }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
  }

  return { user, profile };
}

/**
 * Signs in an existing user with Email & Password.
 */
export async function signInWithEmail(email: string, password: string): Promise<{ user: FirebaseUser; profile: UserProfile }> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  let profile = await fetchUserProfile(user.uid);
  if (!profile) {
    // Fallback profile creation if not yet stored
    const role: UserRole = user.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase() ? 'admin' : 'operator';
    profile = {
      uid: user.uid,
      email: user.email || email,
      displayName: user.displayName || user.email?.split('@')[0] || 'Aqua Operator',
      role,
      department: role === 'admin' ? 'Municipal Administration' : 'Hydraulic Operations',
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'users', user.uid), profile);
      if (role === 'admin') {
        await setDoc(doc(db, 'admins', user.uid), {
          uid: user.uid,
          email: user.email,
          assignedBy: 'System Bootstrapper',
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  } else {
    // Update lastLogin
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        lastLogin: new Date().toISOString()
      });
    } catch {
      // Ignore
    }
  }

  await recordAuditLog(
    'USER_SIGN_IN',
    `Authenticated via Email/Password: ${profile.displayName} (${profile.role})`,
    { uid: user.uid, email: profile.email, role: profile.role }
  );

  return { user, profile };
}

/**
 * Fetches user profile from Firestore /users/{uid}.
 */
export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${uid}`);
    return null;
  }
}

/**
 * Enhanced Google Login with Profile Resolution & Role Determination
 */
export async function loginWithGoogleWithRole(preferredRole: UserRole = 'operator'): Promise<{ user: FirebaseUser; profile: UserProfile }> {
  const user = await loginWithGoogle();
  let profile = await fetchUserProfile(user.uid);

  if (!profile) {
    const isBootstrapAdmin = user.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
    const role: UserRole = isBootstrapAdmin ? 'admin' : preferredRole;

    profile = {
      uid: user.uid,
      email: user.email || 'operator@aquanexus.gov',
      displayName: user.displayName || user.email?.split('@')[0] || 'Water Operator',
      role,
      department: role === 'admin' ? 'Municipal Administration' : 'Hydraulic Operations',
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'users', user.uid), profile);
      if (role === 'admin') {
        await setDoc(doc(db, 'admins', user.uid), {
          uid: user.uid,
          email: user.email,
          assignedBy: 'Bootstrap / Google Auth',
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  } else {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        lastLogin: new Date().toISOString()
      });
    } catch {
      // Ignore
    }
  }

  await recordAuditLog(
    'GOOGLE_SIGN_IN',
    `Signed in via Google OAuth: ${profile.displayName} (${profile.role})`,
    { uid: user.uid, email: profile.email, role: profile.role }
  );

  return { user, profile };
}

/**
 * Fetches all registered users from /users.
 * If empty, seeds initial verified operators and admin.
 */
export async function fetchAllUsers(): Promise<UserProfile[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    if (!snap.empty) {
      const users: UserProfile[] = [];
      snap.forEach(d => users.push(d.data() as UserProfile));
      return users;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'users');
  }

  // If empty or offline, return seed users
  return SEED_USERS;
}

/**
 * Promotes or demotes user role between 'operator' and 'admin'.
 */
export async function updateUserRole(
  targetUid: string,
  newRole: UserRole,
  adminActor: { uid: string; email: string }
): Promise<void> {
  try {
    const userRef = doc(db, 'users', targetUid);
    await updateDoc(userRef, { role: newRole });

    if (newRole === 'admin') {
      await setDoc(doc(db, 'admins', targetUid), {
        uid: targetUid,
        assignedBy: adminActor.email,
        createdAt: new Date().toISOString()
      });
    } else {
      await deleteDoc(doc(db, 'admins', targetUid));
    }

    await recordAuditLog(
      'ROLE_PERMISSION_CHANGE',
      `Changed role of user ${targetUid} to ${newRole.toUpperCase()} by ${adminActor.email}`,
      { uid: adminActor.uid, email: adminActor.email, role: 'admin' }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
    throw err;
  }
}

/**
 * Records an immutable audit log entry in /audit_logs.
 */
export async function recordAuditLog(
  action: string,
  details: string,
  actor: { uid: string; email: string; role: UserRole }
): Promise<void> {
  const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const entry: AuditLogEntry = {
    id: logId,
    timestamp: new Date().toISOString(),
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action,
    details
  };

  try {
    await setDoc(doc(db, 'audit_logs', logId), entry);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `audit_logs/${logId}`);
  }
}

/**
 * Fetches recent audit logs from /audit_logs.
 */
export async function fetchAuditLogs(): Promise<AuditLogEntry[]> {
  try {
    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(50));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const logs: AuditLogEntry[] = [];
      snap.forEach(d => logs.push(d.data() as AuditLogEntry));
      return logs;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'audit_logs');
  }

  // Fallback to seed logs
  return SEED_AUDIT_LOGS;
}

/**
 * Populates /users, /admins, and initial /audit_logs if not present.
 */
export async function seedUsersAndAdminsIfEmpty(): Promise<void> {
  try {
    const userSnap = await getDocs(collection(db, 'users'));
    if (userSnap.empty) {
      for (const u of SEED_USERS) {
        await setDoc(doc(db, 'users', u.uid), u);
        if (u.role === 'admin') {
          await setDoc(doc(db, 'admins', u.uid), {
            uid: u.uid,
            email: u.email,
            assignedBy: 'System Bootstrapper',
            createdAt: u.createdAt
          });
        }
      }
      for (const l of SEED_AUDIT_LOGS) {
        await setDoc(doc(db, 'audit_logs', l.id), l);
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'users_seed');
  }
}
