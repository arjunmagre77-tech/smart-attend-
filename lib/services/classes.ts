// lib/services/classes.ts

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase/client";
import { SchoolClass } from "@/types";
import { DEMO_CLASSES } from "@/lib/demo/data";

const CLASSES_COL = "classes";

function toClass(data: Record<string, unknown>): SchoolClass {
  return {
    ...data,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string),
  } as SchoolClass;
}

export async function getClasses(): Promise<SchoolClass[]> {
  if (!isFirebaseConfigured) return DEMO_CLASSES;

  const q = query(collection(db, CLASSES_COL), orderBy("name"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toClass(d.data() as Record<string, unknown>));
}

export async function getClass(classId: string): Promise<SchoolClass | null> {
  if (!isFirebaseConfigured) {
    return DEMO_CLASSES.find((c) => c.classId === classId) ?? null;
  }

  const snap = await getDoc(doc(db, CLASSES_COL, classId));
  if (!snap.exists()) return null;
  return toClass(snap.data() as Record<string, unknown>);
}

export async function createClass(
  classId: string,
  data: Omit<SchoolClass, "classId" | "createdAt">
): Promise<void> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase not configured.");
  }
  await setDoc(doc(db, CLASSES_COL, classId), {
    ...data,
    classId,
    createdAt: Timestamp.now(),
  });
}

export async function updateClass(
  classId: string,
  data: Partial<Omit<SchoolClass, "classId" | "createdAt">>
): Promise<void> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase not configured.");
  }
  await updateDoc(doc(db, CLASSES_COL, classId), data);
}

/**
 * Returns a map of classId => display name ("Grade 9 - A")
 */
export async function getClassMap(): Promise<Record<string, string>> {
  const classes = await getClasses();
  return Object.fromEntries(
    classes.map((c) => [c.classId, `${c.name} - ${c.section}`])
  );
}
