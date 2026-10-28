// lib/services/attendance.ts

import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  type QueryConstraint,
  type Unsubscribe,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase/client";
import { AttendanceRecord, AttendanceFilters, AttendanceWithStudent, DashboardStats, WeeklyTrendPoint, ClassAttendanceStat } from "@/types";
import { DEMO_ATTENDANCE, DEMO_STUDENTS, DEMO_CLASSES } from "@/lib/demo/data";
import { getTodayDateKey } from "@/lib/utils/timezone";

const ATTENDANCE_COL = "attendance";

function toRecord(data: Record<string, unknown>): AttendanceRecord {
  return {
    ...data,
    checkInAt:
      data.checkInAt instanceof Timestamp
        ? data.checkInAt.toDate().toISOString()
        : (data.checkInAt as string),
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string),
  } as AttendanceRecord;
}

export async function getAttendanceRecords(
  filters: AttendanceFilters = {}
): Promise<AttendanceWithStudent[]> {
  const timezone = "Asia/Kolkata";

  if (!isFirebaseConfigured) {
    // Demo mode
    let results = DEMO_ATTENDANCE.map((a) => {
      const student = DEMO_STUDENTS.find((s) => s.studentId === a.studentId);
      const cls = DEMO_CLASSES.find((c) => c.classId === a.classId);
      return {
        ...a,
        studentName: student?.fullName,
        rollNumber: student?.rollNumber,
        className: cls ? `${cls.name} - ${cls.section}` : a.classId,
      };
    });

    if (filters.dateKey) results = results.filter((r) => r.dateKey === filters.dateKey);
    if (filters.classId) results = results.filter((r) => r.classId === filters.classId);
    if (filters.status) results = results.filter((r) => r.status === filters.status);
    if (filters.studentSearch) {
      const sq = filters.studentSearch.toLowerCase();
      results = results.filter(
        (r) =>
          r.studentName?.toLowerCase().includes(sq) ||
          r.rollNumber?.toLowerCase().includes(sq)
      );
    }

    return results.sort(
      (a, b) => new Date(b.checkInAt).getTime() - new Date(a.checkInAt).getTime()
    );
  }

  const constraints: QueryConstraint[] = [];
  if (filters.dateKey) constraints.push(where("dateKey", "==", filters.dateKey));
  if (filters.classId) constraints.push(where("classId", "==", filters.classId));
  if (filters.status) constraints.push(where("status", "==", filters.status));
  constraints.push(orderBy("checkInAt", "desc"));

  const q = query(collection(db, ATTENDANCE_COL), ...constraints);
  const snap = await getDocs(q);
  const records = snap.docs.map((d) => toRecord(d.data() as Record<string, unknown>) as AttendanceWithStudent);
  return enrichWithStudentData(records);
}

export async function getTodayAttendance(timezone: string = "Asia/Kolkata"): Promise<AttendanceRecord[]> {
  const dateKey = getTodayDateKey(timezone);
  return getAttendanceRecords({ dateKey });
}

export async function getStudentAttendance(studentId: string): Promise<AttendanceRecord[]> {
  if (!isFirebaseConfigured) {
    return DEMO_ATTENDANCE.filter((a) => a.studentId === studentId)
      .sort((a, b) => new Date(b.dateKey).getTime() - new Date(a.dateKey).getTime());
  }

  const q = query(
    collection(db, ATTENDANCE_COL),
    where("studentId", "==", studentId),
    orderBy("dateKey", "desc"),
    limit(60)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toRecord(d.data() as Record<string, unknown>));
}

export async function getAttendanceRecord(attendanceId: string): Promise<AttendanceRecord | null> {
  if (!isFirebaseConfigured) {
    return DEMO_ATTENDANCE.find((a) => a.attendanceId === attendanceId) ?? null;
  }

  const snap = await getDoc(doc(db, ATTENDANCE_COL, attendanceId));
  if (!snap.exists()) return null;
  return toRecord(snap.data() as Record<string, unknown>);
}

export async function updateAttendanceRecord(
  attendanceId: string,
  data: { status: string; correctedBy: string; correctionReason: string }
): Promise<void> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase not configured.");
  }
  await updateDoc(doc(db, ATTENDANCE_COL, attendanceId), {
    ...data,
    source: "manual",
    updatedAt: Timestamp.now(),
  });
}

export async function getDashboardStats(
  timezone: string = "Asia/Kolkata"
): Promise<DashboardStats> {
  const dateKey = getTodayDateKey(timezone);
  const totalStudents = isFirebaseConfigured ? 0 : DEMO_STUDENTS.filter((s) => s.isActive).length;

  const todayRecords = await getAttendanceRecords({ dateKey });
  const presentToday = todayRecords.filter((r) => r.status === "present").length;
  const lateToday = todayRecords.filter((r) => r.status === "late").length;
  const absentToday = Math.max(0, totalStudents - presentToday - lateToday);

  return {
    totalStudents,
    presentToday,
    absentToday,
    lateToday,
    attendancePercentage:
      totalStudents > 0
        ? Math.round(((presentToday + lateToday) / totalStudents) * 100)
        : 0,
    dateKey,
  };
}

export async function getWeeklyTrend(
  timezone: string = "Asia/Kolkata"
): Promise<WeeklyTrendPoint[]> {
  const now = new Date();
  const points: WeeklyTrendPoint[] = [];
  const totalStudents = isFirebaseConfigured ? 0 : DEMO_STUDENTS.filter((s) => s.isActive).length;

  for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const dateKey = d.toISOString().slice(0, 10);
    const records = await getAttendanceRecords({ dateKey });
    const present = records.filter((r) => r.status === "present").length;
    const late = records.filter((r) => r.status === "late").length;
    const absent = Math.max(0, totalStudents - present - late);

    points.push({
      date: dateKey,
      present,
      late,
      absent,
      total: totalStudents,
    });
  }

  return points;
}

export async function getClassAttendanceStats(
  dateKey: string
): Promise<ClassAttendanceStat[]> {
  const records = await getAttendanceRecords({ dateKey });

  return DEMO_CLASSES.map((cls) => {
    const classRecords = records.filter((r) => r.classId === cls.classId);
    const students = DEMO_STUDENTS.filter(
      (s) => s.classId === cls.classId && s.isActive
    );
    const present = classRecords.filter(
      (r) => r.status === "present" || r.status === "late"
    ).length;

    return {
      classId: cls.classId,
      className: `${cls.name} - ${cls.section}`,
      present,
      absent: Math.max(0, students.length - present),
      total: students.length,
      percentage:
        students.length > 0 ? Math.round((present / students.length) * 100) : 0,
    };
  });
}

export async function getRecentActivity(
  limitCount: number = 10
): Promise<AttendanceWithStudent[]> {
  if (!isFirebaseConfigured) {
    return (await getAttendanceRecords({})).slice(0, limitCount);
  }

  // For real Firestore: fetch with limit and enrich with student/class data
  const q = query(
    collection(db, ATTENDANCE_COL),
    orderBy("checkInAt", "desc"),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  const records = snap.docs.map((d) => toRecord(d.data() as Record<string, unknown>) as AttendanceWithStudent);
  return enrichWithStudentData(records);
}

/**
 * Enrich attendance records with student name, roll number, and class name.
 * Batches Firestore reads where possible. Falls back gracefully for unknown students.
 */
async function enrichWithStudentData(
  records: AttendanceWithStudent[]
): Promise<AttendanceWithStudent[]> {
  if (!isFirebaseConfigured || records.length === 0) return records;

  // Collect unique studentIds and classIds to avoid redundant reads
  const studentIds = [...new Set(records.map((r) => r.studentId))];
  const classIds = [...new Set(records.map((r) => r.classId))];

  // Fetch students and classes in parallel
  const [studentDocs, classDocs] = await Promise.all([
    Promise.all(
      studentIds.map((id) =>
        getDoc(doc(db, "students", id)).then((s) => (s.exists() ? { id, data: s.data() } : null))
      )
    ),
    Promise.all(
      classIds.map((id) =>
        getDoc(doc(db, "classes", id)).then((c) => (c.exists() ? { id, data: c.data() } : null))
      )
    ),
  ]);

  const studentMap = new Map(
    studentDocs
      .filter(Boolean)
      .map((s) => [s!.id, s!.data])
  );
  const classMap = new Map(
    classDocs
      .filter(Boolean)
      .map((c) => [c!.id, c!.data])
  );

  return records.map((r) => {
    const student = studentMap.get(r.studentId);
    const cls = classMap.get(r.classId);
    return {
      ...r,
      studentName: student?.fullName ?? undefined,
      rollNumber: student?.rollNumber ?? undefined,
      className: cls ? `${cls.name} - ${cls.section}` : undefined,
    };
  });
}

/**
 * Subscribe to real-time attendance updates (latest N records).
 * Returns an Unsubscribe function — call it to stop listening.
 * Falls back to a no-op in demo mode (demo data is static).
 */
export function subscribeRecentActivity(
  limitCount: number = 10,
  onData: (records: AttendanceWithStudent[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!isFirebaseConfigured) {
    // Demo mode: push initial data once, no live updates
    getRecentActivity(limitCount).then(onData).catch((e) => onError?.(e));
    return () => {};
  }

  const q = query(
    collection(db, ATTENDANCE_COL),
    orderBy("checkInAt", "desc"),
    limit(limitCount)
  );

  return onSnapshot(
    q,
    async (snap) => {
      try {
        const records = snap.docs.map(
          (d) => toRecord(d.data() as Record<string, unknown>) as AttendanceWithStudent
        );
        const enriched = await enrichWithStudentData(records);
        onData(enriched);
      } catch (e) {
        onError?.(e instanceof Error ? e : new Error(String(e)));
      }
    },
    (err) => onError?.(err)
  );
}
