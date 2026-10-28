// lib/services/students.ts
// Student CRUD operations — Firebase-aware with demo fallback

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase/client";
import { Student, StudentFilters, StudentWithClass } from "@/types";
import { DEMO_STUDENTS, DEMO_CLASSES } from "@/lib/demo/data";

const STUDENTS_COL = "students";

function toStudent(data: Record<string, unknown>): Student {
  return {
    ...data,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string),
    updatedAt:
      data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate().toISOString()
        : (data.updatedAt as string),
  } as Student;
}

export async function getStudents(filters: StudentFilters = {}): Promise<StudentWithClass[]> {
  if (!isFirebaseConfigured) {
    // Demo mode — filter locally
    let results = DEMO_STUDENTS.map((s) => {
      const cls = DEMO_CLASSES.find((c) => c.classId === s.classId);
      return { ...s, className: cls ? `${cls.name} - ${cls.section}` : s.classId };
    });

    if (filters.classId) results = results.filter((s) => s.classId === filters.classId);
    if (filters.isActive !== undefined && filters.isActive !== "")
      results = results.filter((s) => s.isActive === filters.isActive);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.rollNumber.toLowerCase().includes(q) ||
          s.studentId.toLowerCase().includes(q)
      );
    }

    return results;
  }

  let q = query(collection(db, STUDENTS_COL), orderBy("fullName"));
  if (filters.classId) q = query(q, where("classId", "==", filters.classId));
  if (filters.isActive !== undefined && filters.isActive !== "")
    q = query(q, where("isActive", "==", filters.isActive));

  const snap = await getDocs(q);
  const students: StudentWithClass[] = snap.docs.map((d) => toStudent(d.data() as Record<string, unknown>) as StudentWithClass);

  // Filter by search client-side (Firestore doesn't support full-text search)
  if (filters.search) {
    const sq = filters.search.toLowerCase();
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(sq) ||
        s.rollNumber.toLowerCase().includes(sq) ||
        s.studentId.toLowerCase().includes(sq)
    );
  }

  return students;
}

export async function getStudent(studentId: string): Promise<Student | null> {
  if (!isFirebaseConfigured) {
    return DEMO_STUDENTS.find((s) => s.studentId === studentId) ?? null;
  }

  const snap = await getDoc(doc(db, STUDENTS_COL, studentId));
  if (!snap.exists()) return null;
  return toStudent(snap.data() as Record<string, unknown>);
}

export async function getStudentByRfid(rfidUid: string): Promise<Student | null> {
  if (!isFirebaseConfigured) {
    return DEMO_STUDENTS.find((s) => s.rfidUid?.toUpperCase() === rfidUid.toUpperCase()) ?? null;
  }

  const q = query(
    collection(db, STUDENTS_COL),
    where("rfidUid", "==", rfidUid.toUpperCase()),
    where("isActive", "==", true)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return toStudent(snap.docs[0].data() as Record<string, unknown>);
}

export async function createStudent(
  studentId: string,
  data: Omit<Student, "studentId" | "createdAt" | "updatedAt">
): Promise<void> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase not configured — cannot create students in demo mode.");
  }

  const now = Timestamp.now();
  await setDoc(doc(db, STUDENTS_COL, studentId), {
    ...data,
    studentId,
    rfidUid: data.rfidUid?.toUpperCase() ?? null,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateStudent(
  studentId: string,
  data: Partial<Omit<Student, "studentId" | "createdAt">>
): Promise<void> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase not configured — cannot update students in demo mode.");
  }

  await updateDoc(doc(db, STUDENTS_COL, studentId), {
    ...data,
    rfidUid: data.rfidUid ? data.rfidUid.toUpperCase() : data.rfidUid,
    updatedAt: Timestamp.now(),
  });
}

export async function checkRfidUnique(
  rfidUid: string,
  excludeStudentId?: string
): Promise<boolean> {
  if (!isFirebaseConfigured) {
    return !DEMO_STUDENTS.some(
      (s) =>
        s.rfidUid?.toUpperCase() === rfidUid.toUpperCase() &&
        s.studentId !== excludeStudentId
    );
  }

  const q = query(
    collection(db, STUDENTS_COL),
    where("rfidUid", "==", rfidUid.toUpperCase()),
    where("isActive", "==", true)
  );
  const snap = await getDocs(q);
  if (snap.empty) return true;
  if (excludeStudentId && snap.docs.every((d) => d.id === excludeStudentId)) return true;
  return false;
}
