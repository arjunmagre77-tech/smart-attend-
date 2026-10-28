// lib/demo/data.ts
// Demo seed data — fictional students, classes, and attendance records
// All records are tagged source:"demo" and will not mix into real data

import {
  Student,
  SchoolClass,
  AttendanceRecord,
  Device,
  SchoolSettings,
} from "@/types";

export const DEMO_CLASSES: SchoolClass[] = [
  {
    classId: "CLS001",
    name: "Grade 9",
    section: "A",
    teacherId: "TEACHER001",
    isActive: true,
    createdAt: new Date("2026-06-01").toISOString(),
  },
  {
    classId: "CLS002",
    name: "Grade 9",
    section: "B",
    teacherId: "TEACHER002",
    isActive: true,
    createdAt: new Date("2026-06-01").toISOString(),
  },
  {
    classId: "CLS003",
    name: "Grade 10",
    section: "A",
    teacherId: "TEACHER001",
    isActive: true,
    createdAt: new Date("2026-06-01").toISOString(),
  },
];

export const DEMO_STUDENTS: Student[] = [
  {
    studentId: "STU001",
    fullName: "Aryan Mehta",
    rollNumber: "001",
    classId: "CLS001",
    rfidUid: "A31F2B09",
    parentName: "Rajesh Mehta",
    parentPhone: "+91 98765 43210",
    parentEmail: "rajesh.mehta@example.com",
    isActive: true,
    createdAt: new Date("2026-06-10").toISOString(),
    updatedAt: new Date("2026-06-10").toISOString(),
  },
  {
    studentId: "STU002",
    fullName: "Priya Sharma",
    rollNumber: "002",
    classId: "CLS001",
    rfidUid: "B44C1D3A",
    parentName: "Sunita Sharma",
    parentPhone: "+91 87654 32109",
    parentEmail: "sunita.sharma@example.com",
    isActive: true,
    createdAt: new Date("2026-06-10").toISOString(),
    updatedAt: new Date("2026-06-10").toISOString(),
  },
  {
    studentId: "STU003",
    fullName: "Rohan Patel",
    rollNumber: "003",
    classId: "CLS001",
    rfidUid: "C55D2E4B",
    parentName: "Kiran Patel",
    parentPhone: "+91 76543 21098",
    parentEmail: "kiran.patel@example.com",
    isActive: true,
    createdAt: new Date("2026-06-10").toISOString(),
    updatedAt: new Date("2026-06-10").toISOString(),
  },
  {
    studentId: "STU004",
    fullName: "Ananya Singh",
    rollNumber: "004",
    classId: "CLS001",
    rfidUid: null,
    parentName: "Mohan Singh",
    parentPhone: "+91 65432 10987",
    parentEmail: "mohan.singh@example.com",
    isActive: true,
    createdAt: new Date("2026-06-10").toISOString(),
    updatedAt: new Date("2026-06-10").toISOString(),
  },
  {
    studentId: "STU005",
    fullName: "Dev Kumar",
    rollNumber: "005",
    classId: "CLS001",
    rfidUid: "D66E3F5C",
    parentName: "Vikram Kumar",
    parentPhone: "+91 54321 09876",
    parentEmail: "vikram.kumar@example.com",
    isActive: true,
    createdAt: new Date("2026-06-10").toISOString(),
    updatedAt: new Date("2026-06-10").toISOString(),
  },
  {
    studentId: "STU006",
    fullName: "Meera Iyer",
    rollNumber: "001",
    classId: "CLS002",
    rfidUid: "E77F4G6D",
    parentName: "Lakshmi Iyer",
    parentPhone: "+91 43210 98765",
    parentEmail: "lakshmi.iyer@example.com",
    isActive: true,
    createdAt: new Date("2026-06-10").toISOString(),
    updatedAt: new Date("2026-06-10").toISOString(),
  },
  {
    studentId: "STU007",
    fullName: "Karan Joshi",
    rollNumber: "002",
    classId: "CLS002",
    rfidUid: "F88G5H7E",
    parentName: "Suresh Joshi",
    parentPhone: "+91 32109 87654",
    parentEmail: "suresh.joshi@example.com",
    isActive: true,
    createdAt: new Date("2026-06-10").toISOString(),
    updatedAt: new Date("2026-06-10").toISOString(),
  },
  {
    studentId: "STU008",
    fullName: "Sneha Gupta",
    rollNumber: "003",
    classId: "CLS002",
    rfidUid: null,
    parentName: "Anil Gupta",
    parentPhone: "+91 21098 76543",
    parentEmail: "anil.gupta@example.com",
    isActive: true,
    createdAt: new Date("2026-06-10").toISOString(),
    updatedAt: new Date("2026-06-10").toISOString(),
  },
  {
    studentId: "STU009",
    fullName: "Aarav Verma",
    rollNumber: "001",
    classId: "CLS003",
    rfidUid: "G99H6I8F",
    parentName: "Deepak Verma",
    parentPhone: "+91 10987 65432",
    parentEmail: "deepak.verma@example.com",
    isActive: true,
    createdAt: new Date("2026-06-10").toISOString(),
    updatedAt: new Date("2026-06-10").toISOString(),
  },
  {
    studentId: "STU010",
    fullName: "Riya Nair",
    rollNumber: "002",
    classId: "CLS003",
    rfidUid: "H00I7J9G",
    parentName: "Priya Nair",
    parentPhone: "+91 09876 54321",
    parentEmail: "priya.nair@example.com",
    isActive: true,
    createdAt: new Date("2026-06-10").toISOString(),
    updatedAt: new Date("2026-06-10").toISOString(),
  },
];

// Generate demo attendance for the last 7 days
function generateDemoAttendance(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const now = new Date();

  for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

    const dateKey = date.toISOString().slice(0, 10);

    DEMO_STUDENTS.forEach((student, idx) => {
      // Simulate realistic attendance: ~85% present, ~10% late, ~5% absent
      const rand = Math.random();
      if (rand < 0.05) return; // absent — no record

      const status = rand < 0.15 ? "late" : "present";
      const checkInHour = status === "late" ? 9 : 8;
      const checkInMinute = Math.floor(Math.random() * 30) + (status === "late" ? 31 : 0);
      const checkInAt = new Date(date);
      checkInAt.setHours(checkInHour, checkInMinute, Math.floor(Math.random() * 60), 0);

      records.push({
        attendanceId: `${student.studentId}_${dateKey}`,
        studentId: student.studentId,
        classId: student.classId,
        dateKey,
        checkInAt: checkInAt.toISOString(),
        status,
        deviceId: "demo-device",
        source: "demo",
        eventId: `demo_${student.studentId}_${dateKey}_${idx}`,
        createdAt: checkInAt.toISOString(),
      });
    });
  }

  return records;
}

export const DEMO_ATTENDANCE: AttendanceRecord[] = generateDemoAttendance();

export const DEMO_DEVICES: Device[] = [
  {
    deviceId: "demo-device",
    name: "Main Gate Scanner",
    location: "School Main Entrance",
    secretHash: "$2b$10$demo_hash_placeholder",
    isActive: true,
    lastSeen: new Date().toISOString(),
    createdAt: new Date("2026-09-01").toISOString(),
  },
];

export const DEMO_SETTINGS: SchoolSettings = {
  schoolName: "SmartAttend Demo School",
  timezone: "Asia/Kolkata",
  cutoffTime: "09:00",
  absentCutoff: "11:00",
  notificationChannel: "simulator",
  isDemoMode: true,
};
