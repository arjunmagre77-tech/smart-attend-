"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase/client";
import { AppUser } from "@/types";

interface AuthContextValue {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isDemo: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Demo user for development
const DEMO_USER: AppUser = {
  userId: "demo-admin",
  email: "admin@demo.school",
  displayName: "Demo Administrator",
  role: "admin",
  isActive: true,
  createdAt: new Date("2026-06-01").toISOString(),
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isDemo = !isFirebaseConfigured;

  useEffect(() => {
    if (isDemo) {
      // Auto-sign in as demo user
      setAppUser(DEMO_USER);
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Fetch the app user document to get role
        try {
          const { getDoc, doc } = await import("firebase/firestore");
          const { db } = await import("@/lib/firebase/client");
          const snap = await getDoc(doc(db, "users", firebaseUser.uid));
          if (snap.exists()) {
            const data = snap.data();
            setAppUser({
              ...data,
              userId: firebaseUser.uid,
              createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
            } as AppUser);
          } else {
            // New user — default to teacher role
            setAppUser({
              userId: firebaseUser.uid,
              email: firebaseUser.email ?? "",
              displayName: firebaseUser.displayName ?? "User",
              role: "teacher",
              isActive: true,
              createdAt: new Date().toISOString(),
            });
          }
        } catch {
          // Firestore lookup failed — still treat as authenticated using
          // basic Firebase Auth info so the redirect to dashboard works.
          setAppUser({
            userId: firebaseUser.uid,
            email: firebaseUser.email ?? "",
            displayName: firebaseUser.displayName ?? "User",
            role: "teacher",
            isActive: true,
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        setAppUser(null);
      }

      setLoading(false);
    });

    return () => unsub();
  }, [isDemo]);

  async function signIn(email: string, password: string): Promise<void> {
    if (isDemo) {
      // Demo login — accept any credentials
      setAppUser(DEMO_USER);
      return;
    }
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signOut(): Promise<void> {
    if (isDemo) {
      setAppUser(null);
      return;
    }
    await firebaseSignOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, appUser, loading, signIn, signOut, isDemo }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
