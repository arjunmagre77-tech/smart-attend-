// lib/auth/session.ts
// Server-side session and role verification

import { adminAuth, adminDb, isAdminConfigured, isAdminInitialized } from "@/lib/firebase/admin";
import { AppUser } from "@/types";
import { NextRequest } from "next/server";

/**
 * Verify a Firebase ID token from the Authorization header.
 * Returns the decoded token or null if invalid.
 */
export async function verifyIdToken(req: NextRequest): Promise<{ uid: string } | null> {
  if (!isAdminConfigured) return null;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid };
  } catch {
    return null;
  }
}

/**
 * Get the app user record and role for a Firebase UID.
 */
export async function getAppUser(uid: string): Promise<AppUser | null> {
  if (!isAdminConfigured) return null;

  try {
    const snap = await adminDb.collection("users").doc(uid).get();
    if (!snap.exists) return null;
    const data = snap.data()!;
    return {
      ...data,
      userId: uid,
      createdAt:
        data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    } as AppUser;
  } catch {
    return null;
  }
}

/**
 * Verify a device secret from the request headers.
 * Returns the deviceId if valid, null otherwise.
 */
export async function verifyDeviceSecret(req: NextRequest): Promise<string | null> {
  const deviceId = req.headers.get("X-Device-ID");
  const secret = req.headers.get("X-Device-Secret");

  if (!deviceId || !secret) return null;

  // Fall back to demo/sim device check when:
  // - Admin SDK is not configured (no env vars), OR
  // - Admin SDK env vars exist but initialization failed (e.g. malformed private key)
  if (!isAdminInitialized) {
    const demoSecret = process.env.DEMO_DEVICE_SECRET ?? "demo-secret-key-for-testing";
    const validDevices: Record<string, string> = {
      "demo-device": demoSecret,
      "sim-device-dev": demoSecret,  // Used by /api/attendance/simulate in dev
    };
    if (deviceId in validDevices && secret === validDevices[deviceId]) {
      return deviceId;
    }
    return null;
  }

  try {
    const bcrypt = await import("bcryptjs");
    const snap = await adminDb.collection("devices").doc(deviceId).get();
    if (!snap.exists) return null;

    const device = snap.data()!;
    if (!device.isActive) return null;

    const valid = await bcrypt.compare(secret, device.secretHash);
    if (!valid) return null;

    // Update lastSeen
    await adminDb.collection("devices").doc(deviceId).update({
      lastSeen: new Date(),
    });

    return deviceId;
  } catch {
    return null;
  }
}
