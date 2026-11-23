import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  auth,
  signOutFirebase,
  onFirebaseAuthStateChanged
} from './config';
import {
  getUsersFromFirestore,
  saveUserToFirestore,
  subscribeToUsers,
  isPrincipalAdmin
} from './firestoreService';
import { User, UserRole } from '../types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  currentUser: User | null;
  allUsers: User[];
  isLoading: boolean;
  isFirebaseConnected: boolean;
  authError: string | null;
  isCurrentPrincipalAdmin: boolean;
  clearAuthError: () => void;
  selectUser: (user: User) => void;
  logout: () => Promise<void>;
  updateCurrentProfile: (updates: Partial<User>) => Promise<void>;
  refreshCurrentUserData: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Inicializar usuarios de Firestore y suscripción en tiempo real
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    const initData = async () => {
      try {
        const users = await getUsersFromFirestore();
        setAllUsers(users);

        // Suscribirse a cambios en Firestore
        unsubscribeFirestore = subscribeToUsers((updatedUsers) => {
          setAllUsers(updatedUsers);
          // Si el usuario actual fue actualizado en Firestore, reflejar cambios
          setCurrentUser((prev) => {
            if (!prev) return prev;
            const match = updatedUsers.find((u) => u.id === prev.id || (prev.correo && u.correo.toLowerCase() === prev.correo.toLowerCase()));
            return match || prev;
          });
        });

        setIsFirebaseConnected(true);
      } catch (err) {
        console.error('Error al inicializar Firestore:', err);
        setIsFirebaseConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    initData();

    return () => {
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, []);

  // Suscribirse al estado de Firebase Auth
  useEffect(() => {
    const unsubscribeAuth = onFirebaseAuthStateChanged(async (fbUser) => {
      setFirebaseUser(fbUser);
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // Seleccionar usuario para acceso rápido por rol / switch de perfil
  const selectUser = (user: User) => {
    setCurrentUser(user);
    setAuthError(null);
  };

  // Cerrar sesión
  const logout = async () => {
    try {
      await signOutFirebase();
    } catch (err) {
      console.warn('Error al cerrar sesión en Firebase Auth:', err);
    }
    setFirebaseUser(null);
    setCurrentUser(null);
  };

  // Actualizar perfil de usuario en Firestore
  const updateCurrentProfile = async (updates: Partial<User>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    setCurrentUser(updated);
    await saveUserToFirestore(updated);
  };

  // Re-consultar los datos del usuario actual directamente desde Firestore
  const refreshCurrentUserData = async (): Promise<User | null> => {
    try {
      const freshUsers = await getUsersFromFirestore();
      setAllUsers(freshUsers);
      if (currentUser) {
        const freshCurrent = freshUsers.find(
          u => u.id === currentUser.id || (currentUser.correo && u.correo.toLowerCase() === currentUser.correo.toLowerCase())
        );
        if (freshCurrent) {
          setCurrentUser(freshCurrent);
          return freshCurrent;
        }
      }
    } catch (err) {
      console.error('Error al refrescar datos del usuario actual:', err);
    }
    return currentUser;
  };

  const isCurrentPrincipalAdmin = isPrincipalAdmin(currentUser);

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        currentUser,
        allUsers,
        isLoading,
        isFirebaseConnected,
        authError,
        isCurrentPrincipalAdmin,
        clearAuthError,
        selectUser,
        logout,
        updateCurrentProfile,
        refreshCurrentUserData
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
