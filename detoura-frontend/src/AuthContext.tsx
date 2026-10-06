import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface DetouraUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  provider?: string;
}

interface AuthContextType {
  user: DetouraUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DetouraUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Strictly subscribe to Firebase Authentication state listener
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: User | null) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Traveler'),
          photoURL: firebaseUser.photoURL,
          provider: firebaseUser.providerData?.[0]?.providerId || 'password'
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const clearError = () => setError(null);

  // Email/Password LOGIN: Strictly authenticates with Firebase Authentication.
  // Never creates fallback accounts or accepts arbitrary credentials.
  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Traveler'),
        photoURL: firebaseUser.photoURL,
        provider: 'password'
      });
    } catch (err: any) {
      setUser(null);
      if (
        err?.code === 'auth/invalid-credential' ||
        err?.code === 'auth/user-not-found' ||
        err?.code === 'auth/wrong-password'
      ) {
        const msg = 'No account found / invalid credentials. Please check your email and password.';
        setError(msg);
        throw new Error(msg);
      } else if (err?.code === 'auth/configuration-not-found') {
        const msg = 'Firebase Authentication is not yet enabled in project detoura-f8a96. Please enable Email/Password in the Firebase Console.';
        setError(msg);
        throw new Error(msg);
      } else if (err?.code === 'auth/invalid-email') {
        const msg = 'Please enter a valid email address.';
        setError(msg);
        throw new Error(msg);
      } else if (err?.code === 'auth/too-many-requests') {
        const msg = 'Access to this account has been temporarily disabled due to many failed login attempts. Try again later.';
        setError(msg);
        throw new Error(msg);
      } else {
        const msg = err?.message || 'Failed to sign in. Please verify your credentials.';
        setError(msg);
        throw new Error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // SIGN UP: Uses createUserWithEmailAndPassword, then creates users/{uid} in Firestore
  const signup = async (email: string, password: string, name?: string) => {
    setLoading(true);
    setError(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      const displayName = name && name.trim() ? name.trim() : (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Traveler');

      try {
        await updateProfile(firebaseUser, { displayName });
      } catch (profileErr) {
        console.warn('Could not update Firebase display name:', profileErr);
      }

      // Create Firestore users/{uid} document
      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          uid: firebaseUser.uid,
          name: displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL || null,
          provider: 'password',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          role: 'traveler'
        }, { merge: true });
      } catch (firestoreErr) {
        console.warn('Firestore users/{uid} creation notice:', firestoreErr);
      }

      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName,
        photoURL: firebaseUser.photoURL,
        provider: 'password'
      });
    } catch (err: any) {
      setUser(null);
      if (err?.code === 'auth/email-already-in-use') {
        const msg = 'This email is already registered. Please sign in instead.';
        setError(msg);
        throw new Error(msg);
      } else if (err?.code === 'auth/weak-password') {
        const msg = 'Password should be at least 6 characters long.';
        setError(msg);
        throw new Error(msg);
      } else if (err?.code === 'auth/invalid-email') {
        const msg = 'Please enter a valid email address.';
        setError(msg);
        throw new Error(msg);
      } else if (err?.code === 'auth/configuration-not-found') {
        const msg = 'Firebase Authentication is not yet enabled in project detoura-f8a96. Please enable Email/Password in the Firebase Console.';
        setError(msg);
        throw new Error(msg);
      } else {
        const msg = err?.message || 'Failed to create account. Please try again.';
        setError(msg);
        throw new Error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // GOOGLE SIGN-IN: Uses GoogleAuthProvider and signInWithPopup
  const loginWithGoogle = async () => {
    setLoading(true);
    setError(null);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const userCredential = await signInWithPopup(auth, provider);
      const firebaseUser = userCredential.user;
      const displayName = firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Traveler');

      const userDocRef = doc(db, 'users', firebaseUser.uid);
      try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          // Existing Google user: update updatedAt
          await setDoc(userDocRef, {
            updatedAt: serverTimestamp(),
            name: displayName,
            photoURL: firebaseUser.photoURL || null
          }, { merge: true });
        } else {
          // First-time Google user: create users/{uid}
          await setDoc(userDocRef, {
            uid: firebaseUser.uid,
            name: displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL || null,
            provider: 'google',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      } catch (firestoreErr) {
        console.warn('Firestore users/{uid} Google sync notice:', firestoreErr);
      }

      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName,
        photoURL: firebaseUser.photoURL,
        provider: 'google'
      });
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        // User voluntarily closed the popup; do not display an alarming error
        return;
      }
      if (err?.code === 'auth/configuration-not-found') {
        const msg = 'Google Sign-In is not yet enabled in the Firebase Console for project detoura-f8a96. Please enable the Google provider.';
        setError(msg);
        throw new Error(msg);
      }
      const msg = err?.message || 'Google sign-in could not be completed. Please try again.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Firebase signOut notice:', err);
    } finally {
      setUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, signup, loginWithGoogle, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
