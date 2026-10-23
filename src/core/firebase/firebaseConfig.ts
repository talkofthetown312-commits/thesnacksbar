import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  Firestore,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';
import appletConfig from '../../../firebase-applet-config.json';
export { OperationType, handleFirestoreError } from './firestoreErrorHandler';
export type { FirestoreErrorInfo } from './firestoreErrorHandler';

const envMeta = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : ({} as Record<string, string>);

export const resolvedConfig = {
  apiKey: envMeta.VITE_FIREBASE_API_KEY || appletConfig.apiKey,
  authDomain: envMeta.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain,
  projectId: envMeta.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId,
  storageBucket: envMeta.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket,
  messagingSenderId: envMeta.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId,
  appId: envMeta.VITE_FIREBASE_APP_ID || appletConfig.appId,
  measurementId: envMeta.VITE_FIREBASE_MEASUREMENT_ID || appletConfig.measurementId || '',
};

export const databaseId =
  envMeta.VITE_FIREBASE_DATABASE_ID ||
  appletConfig.firestoreDatabaseId ||
  'ai-studio-talkosarchitectu-438c4707-59bb-4b28-aa84-26b8ca15c574';

function createResilientFirebaseApp(): FirebaseApp {
  try {
    return getApps().length > 0 ? getApp() : initializeApp(resolvedConfig);
  } catch (err) {
    console.warn('[TalkOS Firebase] Primary initialization fallback triggered:', err);
    return getApps()[0] || initializeApp(appletConfig);
  }
}

function createResilientFirestore(firebaseApp: FirebaseApp): Firestore {
  try {
    if (typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined') {
      return initializeFirestore(
        firebaseApp,
        {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
          }),
          ignoreUndefinedProperties: true
        },
        databaseId
      );
    }
  } catch {
    // Already initialized or IndexedDB unavailable (e.g. Node/Vitest or restricted iframe)
  }

  try {
    return initializeFirestore(
      firebaseApp,
      {
        localCache: memoryLocalCache(),
        ignoreUndefinedProperties: true
      },
      databaseId
    );
  } catch {
    return getFirestore(firebaseApp, databaseId);
  }
}

export const app: FirebaseApp = createResilientFirebaseApp();
export const auth: Auth = getAuth(app);
export const db: Firestore = createResilientFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

let analytics: any = null;
if (typeof window !== 'undefined' && resolvedConfig.measurementId) {
  isSupported()
    .then((supported) => {
      if (supported) {
        try {
          analytics = getAnalytics(app);
        } catch {
          // Analytics safely ignored if dynamic config blocked
        }
      }
    })
    .catch(() => {
      // Ignored in unsupported environments
    });
}
export { analytics };

// Non-blocking boot connection check (never throws or interrupts offline/PIN operations)
async function testConnection() {
  if (typeof window === 'undefined' || !db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[TalkOS Firebase] Client is currently offline; operating in local-first IndexedDB mode.');
    }
  }
}
void testConnection();

export default {
  app,
  auth,
  db,
  storage,
  analytics,
  resolvedConfig,
  databaseId
};
