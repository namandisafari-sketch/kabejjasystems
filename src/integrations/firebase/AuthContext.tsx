import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { getFirebaseAuth } from './config';
import { setHasuraToken, clearHasuraAuth } from '../hasura/client';
import { supabase } from '../supabase/client';

interface FirebaseAuthContextType {
  user: User | null;
  loading: boolean;
  isFirebaseEnabled: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const defaultContext: FirebaseAuthContextType = {
  user: null,
  loading: false,
  isFirebaseEnabled: false,
  signIn: async () => { throw new Error('Firebase not configured'); },
  signUp: async () => { throw new Error('Firebase not configured'); },
  signOut: async () => { throw new Error('Firebase not configured'); },
  signInWithGoogle: async () => { throw new Error('Firebase not configured'); },
  resetPassword: async () => { throw new Error('Firebase not configured'); },
  getIdToken: async () => null,
};

const FirebaseAuthContext = createContext<FirebaseAuthContextType>(defaultContext);

export const useFirebaseAuth = () => {
  return useContext(FirebaseAuthContext);
};

interface FirebaseAuthProviderProps {
  children: ReactNode;
}

export const FirebaseAuthProvider: React.FC<FirebaseAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = getFirebaseAuth();
  const isFirebaseEnabled = !!auth;

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Get Firebase ID token and exchange for Hasura-compatible JWT
        try {
          const idToken = await firebaseUser.getIdToken();
          
          // Call edge function to get Hasura JWT
          const { data, error } = await supabase.functions.invoke('firebase-to-hasura', {
            body: { firebaseToken: idToken }
          });
          
          if (data?.hasuraToken) {
            setHasuraToken(data.hasuraToken);
          }
        } catch (error) {
          console.error('Error getting Hasura token:', error);
        }
      } else {
        clearHasuraAuth();
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  const signIn = async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase not initialized');
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase not initialized');
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    if (!auth) throw new Error('Firebase not initialized');
    await firebaseSignOut(auth);
    clearHasuraAuth();
  };

  const signInWithGoogle = async () => {
    if (!auth) throw new Error('Firebase not initialized');
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const resetPassword = async (email: string) => {
    if (!auth) throw new Error('Firebase not initialized');
    await sendPasswordResetEmail(auth, email);
  };

  const getIdToken = async (): Promise<string | null> => {
    if (!user) return null;
    return user.getIdToken();
  };

  return (
    <FirebaseAuthContext.Provider
      value={{
        user,
        loading,
        isFirebaseEnabled,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
        resetPassword,
        getIdToken,
      }}
    >
      {children}
    </FirebaseAuthContext.Provider>
  );
};
