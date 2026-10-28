// ============================================================
// SmartAttend — Shared TypeScript Types
// ============================================================

export type UserRole = "admin" | "teacher";
export type AttendanceStatus = "present" | "late" | "absent" | "manual";
export type AttendanceSource = "rfid" | "manual" | "demo";
export type NotificationStatus = "pending" | "sent" | "delivered" | "failed";
export type NotificationChannel = "whatsapp" | "sms" | "email" | "simulator";

// ──────────────────────────────────────────────
// Student
// ──────────────────────────────────────────────
export interface Student {
  studentId: string;
  fullName: string;
  rollNumber: string;
  classId: string;
  rfidUid: string | null;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  isActive: boolean;
  createdAt: string; // ISO string (serialised from Firestore Timestamp)
  updatedAt: string;
}

export interface StudentWithClass extends Student {
  className?: string;
}

// ──────────────────────────────────────────────
// Class
// ──────────────────────────────────────────────
export interface SchoolClass {
  classId: string;
  name: string;
  section: string;
  teacherId: string;
  isActive: boolean;
  createdAt: string;
}

// ──────────────────────────────────────────────
// Attendance
// ──────────────────────────────────────────────
export interface AttendanceRecord {
  attendanceId: string;
  studentId: string;
  classId: string;
  dateKey: string;       // "YYYY-MM-DD" in school timezone
  checkInAt: string;     // ISO string
  status: AttendanceStatus;
  deviceId: string;
  source: AttendanceSource;
  correctedBy?: string;
  correctionReason?: string;
  eventId: string;
  createdAt: string;
}

export interface AttendanceWithStudent extends AttendanceRecord {
  studentName?: string;
  rollNumber?: string;
  className?: string;
}

// ──────────────────────────────────────────────
// Device
// ──────────────────────────────────────────────
export interface Device {
  deviceId: string;
  name: string;
  location: string;
  secretHash: string;
  isActive: boolean;
  lastSeen: string | null;
  createdAt: string;
}

// ──────────────────────────────────────────────
// Notification
// ──────────────────────────────────────────────
export interface NotificationRecord {
  notificationId: string;
  attendanceId: string;
  studentId: string;
  studentName: string;
  parentName: string;
  parentPhoneMasked: string;
  channel: NotificationChannel;
  message: string;
  status: NotificationStatus;
  providerResponseId?: string;
  errorDetails?: string;
  attempts: number;
  isDemo: boolean;
  createdAt: string;
  sentAt?: string;
  deliveredAt?: string;
}

// ──────────────────────────────────────────────
// User / Auth
// ──────────────────────────────────────────────
export interface AppUser {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  classIds?: string[];
  isActive: boolean;
  createdAt: string;
}

// ──────────────────────────────────────────────
// School Settings
// ──────────────────────────────────────────────
export interface SchoolSettings {
  schoolName: string;
  timezone: string;
  cutoffTime: string;    // e.g. "09:30"
  absentCutoff: string;  // e.g. "11:00"
  notificationChannel: NotificationChannel;
  isDemoMode: boolean;
}

// ──────────────────────────────────────────────
// Dashboard Statistics
// ──────────────────────────────────────────────
export interface DashboardStats {
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  attendancePercentage: number;
  dateKey: string;
}

export interface WeeklyTrendPoint {
  date: string;
  present: number;
  absent: number;
  late: number;
  total: number;
}

export interface ClassAttendanceStat {
  classId: string;
  className: string;
  present: number;
  absent: number;
  total: number;
  percentage: number;
}

// ──────────────────────────────────────────────
// API Responses
// ──────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface ScanResponse {
  success: boolean;
  message: string;
  student?: {
    studentId: string;
    name: string;
  };
  attendance?: {
    date: string;
    status: AttendanceStatus;
  };
}

// ──────────────────────────────────────────────
// Form Types
// ──────────────────────────────────────────────
export interface StudentFormData {
  fullName: string;
  rollNumber: string;
  classId: string;
  rfidUid?: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  isActive: boolean;
}

export interface ClassFormData {
  name: string;
  section: string;
  teacherId: string;
}

export interface DeviceFormData {
  deviceId: string;
  name: string;
  location: string;
  secret: string;
}

export interface AttendanceCorrectionData {
  status: AttendanceStatus;
  correctionReason: string;
}

// ──────────────────────────────────────────────
// Filters
// ──────────────────────────────────────────────
export interface AttendanceFilters {
  dateKey?: string;
  classId?: string;
  studentSearch?: string;
  status?: AttendanceStatus | "";
  page?: number;
  pageSize?: number;
}

export interface StudentFilters {
  classId?: string;
  isActive?: boolean | "";
  search?: string;
  page?: number;
  pageSize?: number;
}
