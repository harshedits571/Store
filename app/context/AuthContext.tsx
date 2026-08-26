'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

type AuthContextType = {
  user: any;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser && currentUser.email) {
        try {
          const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase');
          
          const email = currentUser.email.toLowerCase();
          
          // --- Start Customer Registration ---
          // Register the user in the 'customers' collection if they don't exist yet
          const customerRef = doc(db, 'customers', email);
          const customerSnap = await getDoc(customerRef);
          if (!customerSnap.exists()) {
            await setDoc(customerRef, {
              email: email,
              name: currentUser.displayName || 'Unknown User',
              createdAt: serverTimestamp(),
              lastSeen: serverTimestamp(),
              ordersCount: 0,
              totalSpent: 0,
              photoURL: currentUser.photoURL || null
            }).catch(() => { /* Suppress error to avoid Next.js dev overlay */ });
          } else {
             await setDoc(customerRef, {
                lastSeen: serverTimestamp(),
                photoURL: currentUser.photoURL || customerSnap.data().photoURL
             }, { merge: true }).catch(() => {});
          }
          // --- End Customer Registration ---
          
          if (email === 'harshks12345@gmail.com') {
             await setDoc(doc(db, 'admins', email), { role: 'admin' }).catch(() => {});
          }

          const adminDoc = await getDoc(doc(db, 'admins', email));
          setIsAdmin(adminDoc.exists());
        } catch (e) {
          console.error("Error fetching admin status:", e);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google Sign-in Error", error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, signInWithGoogle, logout }}>
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
