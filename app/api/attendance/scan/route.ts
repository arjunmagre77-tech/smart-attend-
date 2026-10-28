// app/api/attendance/scan/route.ts
// ESP32 RFID attendance scan endpoint
// SECURITY: Only server-side. Never expose Firebase Admin or device secrets to the browser.

import { NextRequest, NextResponse } from "next/server";
import { scanSchema } from "@/lib/schemas";
import { verifyDeviceSecret } from "@/lib/auth/session";
import { getStudentByRfid } from "@/lib/services/students";
import { getTodayDateKey, determineStatus } from "@/lib/utils/timezone";
import { ScanResponse } from "@/types";
import { isAdminInitialized, adminDb } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/client";

// Simple in-memory rate limiter (per device, per minute)
const rateLimiter = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // max scans per minute per device

function checkRateLimit(deviceId: string): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(deviceId);

  if (!entry || now > entry.resetAt) {
    rateLimiter.set(deviceId, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// Per-UID cooldown: ignore repeat scans of the same card within a configurable window.
// This prevents two quick taps by the same card from generating duplicate events.
const uidCooldownMap = new Map<string, number>(); // rfidUid -> last scan timestamp (ms)
const UID_COOLDOWN_MS = Number(process.env.SCAN_COOLDOWN_MS ?? 30_000); // default 30 s

function isUidOnCooldown(rfidUid: string): boolean {
  const last = uidCooldownMap.get(rfidUid);
  if (last === undefined) return false;
  return Date.now() - last < UID_COOLDOWN_MS;
}

function markUidScanned(rfidUid: string): void {
  uidCooldownMap.set(rfidUid, Date.now());
  // Housekeeping: evict entries older than 5 minutes to prevent unbounded growth
  const cutoff = Date.now() - 5 * 60_000;
  for (const [uid, ts] of uidCooldownMap) {
    if (ts < cutoff) uidCooldownMap.delete(uid);
  }
}

export async function POST(req: NextRequest) {
  // ── 1. Parse and validate request body ───────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = scanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid request body",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { rfidUid, deviceId, eventId } = parsed.data;

  // ── 2. Authenticate device ────────────────────────────────
  const authenticatedDevice = await verifyDeviceSecret(req);
  if (!authenticatedDevice) {
    return NextResponse.json(
      { success: false, message: "Unauthorized device" },
      { status: 401 }
    );
  }

  if (authenticatedDevice !== deviceId) {
    return NextResponse.json(
      { success: false, message: "Device ID mismatch" },
      { status: 401 }
    );
  }

  // ── 3. Rate limiting ──────────────────────────────────────
  if (!checkRateLimit(deviceId)) {
    return NextResponse.json(
      { success: false, message: "Rate limit exceeded. Try again in a minute." },
      { status: 429 }
    );
  }

  // ── 3b. Per-UID cooldown (prevents rapid duplicate scans) ─
  if (isUidOnCooldown(rfidUid)) {
    return NextResponse.json(
      {
        success: false,
        message: `Card ${rfidUid} was scanned too recently. Please wait before scanning again.`,
        cooldownMs: UID_COOLDOWN_MS,
      },
      { status: 429 }
    );
  }

  // ── 4. Get school settings ────────────────────────────────
  const timezone = process.env.NEXT_PUBLIC_SCHOOL_TIMEZONE ?? "Asia/Kolkata";
  const cutoffTime = process.env.ATTENDANCE_CUTOFF_TIME ?? "09:00";
  const absentCutoff = process.env.ATTENDANCE_ABSENT_CUTOFF ?? "11:00";
  const isDemoMode = !isFirebaseConfigured;

  // ── 5. Resolve student from RFID UID ──────────────────────
  const student = await getStudentByRfid(rfidUid);
  if (!student) {
    // Log the unknown-card event for visibility; do not write an attendance record.
    console.warn(`[scan] Unknown RFID card: ${rfidUid} (device: ${deviceId})`);
    return NextResponse.json(
      {
        success: false,
        message: "RFID card not registered",
        rfidUid,          // Return the UID so the ESP32 can display it for registration
      },
      { status: 404 }
    );
  }

  if (!student.isActive) {
    return NextResponse.json(
      { success: false, message: "Student account is inactive" },
      { status: 409 }
    );
  }

  // ── 6. Generate server-side timestamp ─────────────────────
  const now = new Date();
  const dateKey = getTodayDateKey(timezone);
  const attendanceId = `${student.studentId}_${dateKey}`;
  const status = determineStatus(now, dateKey, timezone, cutoffTime, absentCutoff);

  // ── 7. Idempotency check and attendance write ─────────────
  if (isAdminInitialized) {
    try {
      const result = await adminDb.runTransaction(async (tx) => {
        const attendanceRef = adminDb.collection("attendance").doc(attendanceId);
        const existing = await tx.get(attendanceRef);

        if (existing.exists) {
          // Check if this exact eventId was already processed
          const data = existing.data()!;
          return { isDuplicate: true, data };
        }

        // Check eventId uniqueness for same day
        const eventRef = adminDb
          .collection("attendance")
          .doc(attendanceId)
          .collection("events")
          .doc(eventId);

        const eventSnap = await tx.get(eventRef);
        if (eventSnap.exists) {
          return { isDuplicate: true, data: existing.data() };
        }

        const record = {
          attendanceId,
          studentId: student.studentId,
          classId: student.classId,
          dateKey,
          checkInAt: now,
          status,
          deviceId,
          source: isDemoMode ? "demo" : "rfid",
          eventId,
          createdAt: now,
        };

        tx.set(attendanceRef, record);
        tx.set(eventRef, { processedAt: now });

        return { isDuplicate: false, data: record };
      });

      if (result.isDuplicate) {
        // Record is a same-day duplicate — no need to update cooldown (it's a server-side dedup)
        const response: ScanResponse = {
          success: true,
          message: "Attendance already recorded for today",
          student: { studentId: student.studentId, name: student.fullName },
          attendance: { date: dateKey, status: result.data?.status ?? status },
        };
        return NextResponse.json(response, { status: 200 });
      }

      // ── 8. Queue notification asynchronously ─────────────
      queueNotification({
        attendanceId,
        student,
        checkInAt: now,
        dateKey,
        timezone,
        isDemoMode,
      }).catch(console.error);

      // Mark this UID as recently scanned so rapid re-scans are rejected
      markUidScanned(rfidUid);

      const response: ScanResponse = {
        success: true,
        message: "Attendance recorded",
        student: { studentId: student.studentId, name: student.fullName },
        attendance: { date: dateKey, status },
      };
      return NextResponse.json(response, { status: 201 });
    } catch (error) {
      console.error("[scan] Database error:", error);
      return NextResponse.json(
        { success: false, message: "Database error. Please retry." },
        { status: 500 }
      );
    }
  }

  // ── Demo mode response (no Firebase) ─────────────────────
  const demoResponse: ScanResponse = {
    success: true,
    message: "Demo: Attendance would be recorded",
    student: { studentId: student.studentId, name: student.fullName },
    attendance: { date: dateKey, status },
  };
  return NextResponse.json(demoResponse, { status: 201 });
}

// ── Notification queuing (non-blocking) ──────────────────────
interface NotificationJob {
  attendanceId: string;
  student: {
    studentId: string;
    fullName: string;
    parentName: string;
    parentPhone: string;
    parentEmail: string;
  };
  checkInAt: Date;
  dateKey: string;
  timezone: string;
  isDemoMode: boolean;
}

async function queueNotification(job: NotificationJob) {
  const { sendNotification, buildNotificationMessage } = await import(
    "@/lib/notifications/provider"
  );

  const checkInTime = job.checkInAt.toLocaleTimeString("en-IN", {
    timeZone: job.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const checkInDate = job.checkInAt.toLocaleDateString("en-IN", {
    timeZone: job.timezone,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const channel =
    (process.env.NOTIFICATION_CHANNEL as "simulator" | "whatsapp" | "sms" | "email") ??
    "simulator";

  const result = await sendNotification({
    studentName: job.student.fullName,
    parentName: job.student.parentName,
    parentPhone: job.student.parentPhone,
    parentEmail: job.student.parentEmail,
    checkInTime,
    checkInDate,
    channel,
    isDemo: job.isDemoMode,
  });

  // Record notification in Firestore if configured
  if (isAdminInitialized) {
    const { maskPhone } = await import("@/lib/utils/export");
    const notifId = `NOTIF_${job.attendanceId}`;

    await adminDb.collection("notifications").doc(notifId).set({
      notificationId: notifId,
      attendanceId: job.attendanceId,
      studentId: job.student.studentId,
      studentName: job.student.fullName,
      parentName: job.student.parentName,
      parentPhoneMasked: maskPhone(job.student.parentPhone),
      channel,
      message: buildNotificationMessage({
        studentName: job.student.fullName,
        parentName: job.student.parentName,
        parentPhone: job.student.parentPhone,
        parentEmail: job.student.parentEmail,
        checkInTime,
        checkInDate,
        channel,
        isDemo: job.isDemoMode,
      }),
      status: result.success ? "sent" : "failed",
      providerResponseId: result.providerResponseId ?? null,
      errorDetails: result.errorDetails ?? null,
      attempts: 1,
      isDemo: job.isDemoMode,
      createdAt: new Date(),
      sentAt: result.success ? new Date() : null,
    });
  }
}
