// lib/services/notifications.ts

import {
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase/client";
import { NotificationRecord, NotificationStatus } from "@/types";
import { maskPhone } from "@/lib/utils/export";

const NOTIFICATIONS_COL = "notifications";

function toRecord(data: Record<string, unknown>): NotificationRecord {
  return {
    ...data,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string),
    sentAt:
      data.sentAt instanceof Timestamp
        ? data.sentAt.toDate().toISOString()
        : (data.sentAt as string | undefined),
    deliveredAt:
      data.deliveredAt instanceof Timestamp
        ? data.deliveredAt.toDate().toISOString()
        : (data.deliveredAt as string | undefined),
  } as NotificationRecord;
}

// Demo notification records
const DEMO_NOTIFICATIONS: NotificationRecord[] = [
  {
    notificationId: "NOTIF001",
    attendanceId: "STU001_2026-10-14",
    studentId: "STU001",
    studentName: "Aryan Mehta",
    parentName: "Rajesh Mehta",
    parentPhoneMasked: "+91 ****3210",
    channel: "simulator",
    message: "[DEMO] Attendance Update: Your child Aryan Mehta checked in at 08:45 AM on 14 Oct 2026.",
    status: "delivered",
    providerResponseId: "SIM_1234567890",
    attempts: 1,
    isDemo: true,
    createdAt: new Date(Date.now() - 60000).toISOString(),
    sentAt: new Date(Date.now() - 59000).toISOString(),
    deliveredAt: new Date(Date.now() - 58000).toISOString(),
  },
  {
    notificationId: "NOTIF002",
    attendanceId: "STU002_2026-10-14",
    studentId: "STU002",
    studentName: "Priya Sharma",
    parentName: "Sunita Sharma",
    parentPhoneMasked: "+91 ****2109",
    channel: "simulator",
    message: "[DEMO] Attendance Update: Your child Priya Sharma checked in at 08:52 AM on 14 Oct 2026.",
    status: "sent",
    providerResponseId: "SIM_1234567891",
    attempts: 1,
    isDemo: true,
    createdAt: new Date(Date.now() - 120000).toISOString(),
    sentAt: new Date(Date.now() - 119000).toISOString(),
  },
  {
    notificationId: "NOTIF003",
    attendanceId: "STU003_2026-10-13",
    studentId: "STU003",
    studentName: "Rohan Patel",
    parentName: "Kiran Patel",
    parentPhoneMasked: "+91 ****1098",
    channel: "simulator",
    message: "[DEMO] Attendance Update: Your child Rohan Patel checked in at 09:15 AM on 13 Oct 2026.",
    status: "failed",
    errorDetails: "Simulated delivery failure for testing",
    attempts: 3,
    isDemo: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export async function getNotifications(limitCount: number = 50): Promise<NotificationRecord[]> {
  if (!isFirebaseConfigured) return DEMO_NOTIFICATIONS;

  const q = query(
    collection(db, NOTIFICATIONS_COL),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toRecord(d.data() as Record<string, unknown>));
}

export async function createNotificationRecord(
  record: Omit<NotificationRecord, "createdAt">
): Promise<void> {
  if (!isFirebaseConfigured) return; // Demo mode: no-op

  await setDoc(doc(db, NOTIFICATIONS_COL, record.notificationId), {
    ...record,
    createdAt: Timestamp.now(),
  });
}

export async function updateNotificationStatus(
  notificationId: string,
  status: NotificationStatus,
  providerResponseId?: string,
  errorDetails?: string
): Promise<void> {
  if (!isFirebaseConfigured) return;

  const updates: Record<string, unknown> = { status, attempts: 1 };
  if (providerResponseId) updates.providerResponseId = providerResponseId;
  if (errorDetails) updates.errorDetails = errorDetails;
  if (status === "sent" || status === "delivered") updates.sentAt = Timestamp.now();
  if (status === "delivered") updates.deliveredAt = Timestamp.now();

  await updateDoc(doc(db, NOTIFICATIONS_COL, notificationId), updates);
}

/**
 * Check if a notification has already been sent for a given attendanceId
 */
export async function isNotificationSent(attendanceId: string): Promise<boolean> {
  if (!isFirebaseConfigured) {
    return DEMO_NOTIFICATIONS.some(
      (n) => n.attendanceId === attendanceId && n.status !== "failed"
    );
  }

  const q = query(
    collection(db, NOTIFICATIONS_COL),
    where("attendanceId", "==", attendanceId),
    where("status", "in", ["sent", "delivered", "pending"])
  );
  const snap = await getDocs(q);
  return !snap.empty;
}
