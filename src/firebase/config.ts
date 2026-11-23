import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  Firestore
} from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';

export interface FirebaseAppConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
  oAuthClientId?: string;
}

const firebaseConfig: FirebaseAppConfig = firebaseConfigData as FirebaseAppConfig;

// Inicialización de la App de Firebase (Singleton)
export const app: FirebaseApp = getApps().length > 0 
  ? getApp() 
  : initializeApp({
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
    });

// Inicialización de Firebase Auth
export const auth: Auth = getAuth(app);

// Proveedor de Google Sign-In con Firebase Auth
export const googleProvider = new GoogleAuthProvider();
// Añadir scopes de Google Calendar para sincronización de itinerarios de vuelo
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');
googleProvider.addScope('https://www.googleapis.com/auth/calendar');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Cache en memoria para el access token de Google Workspace (sin almacenar en storage)
let cachedGoogleAccessToken: string | null = null;

export function getCachedGoogleAccessToken(): string | null {
  return cachedGoogleAccessToken;
}

export function setCachedGoogleAccessToken(token: string | null): void {
  cachedGoogleAccessToken = token;
}

/**
 * Solicita de forma interactiva un nuevo Access Token de Google con los scopes de Calendar
 */
export async function requestGoogleAccessTokenWithScopes(scopes: string[] = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar'
]): Promise<string | null> {
  if (cachedGoogleAccessToken) {
    return cachedGoogleAccessToken;
  }

  // 1. Intentar mediante Firebase Auth popup con GoogleAuthProvider y scopes
  try {
    const customProvider = new GoogleAuthProvider();
    scopes.forEach(scope => customProvider.addScope(scope));
    customProvider.setCustomParameters({ prompt: 'consent' });

    const result = await signInWithPopup(auth, customProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedGoogleAccessToken = credential.accessToken;
      return cachedGoogleAccessToken;
    }
  } catch (popupErr) {
    console.warn('Firebase popup token request error, attempting token client fallback:', popupErr);
  }

  // 2. Si Google Identity Services (GSI) está presente
  if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2 && firebaseConfig.oAuthClientId) {
    return new Promise((resolve, reject) => {
      try {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: firebaseConfig.oAuthClientId,
          scope: scopes.join(' '),
          callback: (response: any) => {
            if (response.error) {
              reject(new Error(response.error_description || response.error));
            } else if (response.access_token) {
              cachedGoogleAccessToken = response.access_token;
              resolve(response.access_token);
            } else {
              reject(new Error('No se obtuvo token de acceso'));
            }
          }
        });
        client.requestAccessToken({ prompt: 'consent' });
      } catch (gsiErr) {
        reject(gsiErr);
      }
    });
  }

  return cachedGoogleAccessToken;
}

// Inicialización de Cloud Firestore con Long Polling para compatibilidad con iframes y sandboxes
let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, firebaseConfig.firestoreDatabaseId || undefined);
} catch (err) {
  try {
    firestoreInstance = firebaseConfig.firestoreDatabaseId
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
  } catch (fallbackErr) {
    firestoreInstance = getFirestore(app);
  }
}

export const db: Firestore = firestoreInstance;

/**
 * Autenticación con Google vía Firebase Auth (Popup con fallback a Redirect si es necesario)
 */
export async function signInWithGoogle(): Promise<FirebaseUser> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedGoogleAccessToken = credential.accessToken;
    }
    return result.user;
  } catch (error: any) {
    console.warn('Fallo en signInWithPopup, intentando redirect o reportando error:', error);
    // Si el popup fue bloqueado en un entorno embebido (iframe), sugerir abrir o usar redirect
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
      throw new Error(
        'La ventana emergente de Google Sign-In fue cerrada o bloqueada por el navegador. Asegúrate de permitir popups o abre la app en una nueva pestaña.'
      );
    }
    throw error;
  }
}

/**
 * Cierre de sesión de Firebase Auth
 */
export async function signOutFirebase(): Promise<void> {
  cachedGoogleAccessToken = null;
  await signOut(auth);
}

/**
 * Suscripción al estado de autenticación de Firebase
 */
export function onFirebaseAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      cachedGoogleAccessToken = null;
    }
    callback(user);
  });
}

export { firebaseConfig };
