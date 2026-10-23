import { App, initializeApp, cert, applicationDefault, getApps, getApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth, Auth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore, Firestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import appletConfig from '../../../firebase-applet-config.json';

dotenv.config();

let adminApp: App | null = null;
let initAttempted = false;

function parseServiceAccountFromEnv(): Record<string, any> | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    if (raw.trim().startsWith('{')) {
      return JSON.parse(raw);
    }
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function getFirebaseAdmin(): App | null {
  if (adminApp) return adminApp;
  if (getApps().length > 0) {
    adminApp = getApp();
    return adminApp;
  }
  if (initAttempted) return adminApp;
  initAttempted = true;

  const projectId =
    process.env.VITE_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    appletConfig.projectId;

  try {
    const serviceAccount = parseServiceAccountFromEnv();
    if (serviceAccount) {
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      adminApp = initializeApp({
        credential: applicationDefault(),
        projectId
      });
    } else {
      adminApp = initializeApp({
        projectId
      });
    }
    return adminApp;
  } catch (error) {
    console.warn('[TalkOS Firebase Admin] Running without service-account credentials; local & client sync active.');
    return null;
  }
}

export function getAdminAuthService(): Auth | null {
  try {
    const app = getFirebaseAdmin();
    return app ? getAdminAuth(app) : null;
  } catch {
    return null;
  }
}

export function getAdminFirestoreService(): Firestore | null {
  try {
    const app = getFirebaseAdmin();
    if (!app) return null;
    const databaseId =
      process.env.VITE_FIREBASE_DATABASE_ID ||
      process.env.FIREBASE_DATABASE_ID ||
      appletConfig.firestoreDatabaseId;
    try {
      if (databaseId && databaseId !== '(default)') {
        return getAdminFirestore(app, databaseId);
      }
    } catch {
      // Fallback to default database instance
    }
    return getAdminFirestore(app);
  } catch {
    return null;
  }
}
