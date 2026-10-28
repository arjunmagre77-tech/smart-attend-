// lib/firebase/admin.ts
// Server-only Firebase Admin SDK — NEVER import in client components

import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

let adminApp: App;
let adminDb: Firestore;
let adminAuth: Auth;

export const isAdminConfigured = Boolean(
  process.env.FIREBASE_ADMIN_PROJECT_ID &&
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
    process.env.FIREBASE_ADMIN_PRIVATE_KEY
);

function initAdmin() {
  if (!isAdminConfigured) return;

  try {
    if (getApps().length > 0) {
      adminApp = getApps()[0];
    } else {
      adminApp = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      });
    }

    adminDb = getFirestore(adminApp);
    adminAuth = getAuth(adminApp);
  } catch (err) {
    // Credential parsing failed (e.g. malformed private key).
    // Log the error and fall back to demo mode — the isAdminConfigured
    // guards in route handlers will prevent any Admin SDK calls.
    console.error(
      "[Firebase Admin] Failed to initialize — falling back to demo mode.",
      err
    );
  }
}

initAdmin();

/**
 * True only when env vars are present AND the Admin SDK successfully initialized.
 * Use this (not isAdminConfigured) when deciding whether Admin SDK calls are safe.
 */
export const isAdminInitialized = Boolean(adminDb);

export { adminDb, adminAuth };
