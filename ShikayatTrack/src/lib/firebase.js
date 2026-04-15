import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

function getFirebaseConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  }
}

/**
 * Returns Firestore instance, or null if env is not configured.
 */
export function getDb() {
  const cfg = getFirebaseConfig()
  if (!cfg.apiKey || !cfg.projectId) return null
  const app = getApps().length ? getApps()[0] : initializeApp(cfg)
  return getFirestore(app)
}
