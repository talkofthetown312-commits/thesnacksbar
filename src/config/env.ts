import appletConfig from '../../firebase-applet-config.json';

const envMeta = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : ({} as Record<string, string>);

export const env = {
  firebase: {
    apiKey: envMeta.VITE_FIREBASE_API_KEY || appletConfig.apiKey || '',
    authDomain: envMeta.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain || '',
    projectId: envMeta.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId || '',
    databaseId: envMeta.VITE_FIREBASE_DATABASE_ID || appletConfig.firestoreDatabaseId || '',
    storageBucket: envMeta.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket || '',
    messagingSenderId: envMeta.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId || '',
    appId: envMeta.VITE_FIREBASE_APP_ID || appletConfig.appId || '',
    measurementId: envMeta.VITE_FIREBASE_MEASUREMENT_ID || appletConfig.measurementId || '',
    oAuthClientId: appletConfig.oAuthClientId || '',
  },
  app: {
    env: envMeta.VITE_ENV || 'production',
    logLevel: envMeta.VITE_LOG_LEVEL || 'info',
  }
};
