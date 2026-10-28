// lib/schemas/scan.ts
// Zod validation schema for ESP32 attendance scan endpoint

import { z } from "zod";

export const scanSchema = z.object({
  rfidUid: z
    .string()
    .min(4, "RFID UID too short")
    .max(32, "RFID UID too long")
    .regex(/^[A-Fa-f0-9]+$/, "RFID UID must be hexadecimal"),
  deviceId: z
    .string()
    .min(3, "Device ID too short")
    .max(64, "Device ID too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid device ID format"),
  eventId: z
    .string()
    .min(6, "Event ID too short")
    .max(128, "Event ID too long"),
});

export type ScanInput = z.infer<typeof scanSchema>;

// ──────────────────────────────────────────────
// Student form schemas
// ──────────────────────────────────────────────
export const studentSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100),
  rollNumber: z.string().min(1, "Roll number is required").max(20),
  classId: z.string().min(1, "Class is required"),
  rfidUid: z
    .string()
    .regex(/^[A-Fa-f0-9]+$/, "RFID UID must be hexadecimal")
    .min(4)
    .max(32)
    .optional()
    .or(z.literal("")),
  parentName: z.string().min(2, "Parent name is required").max(100),
  parentPhone: z
    .string()
    .min(7, "Phone number is required")
    .max(20)
    .regex(/^\+?[\d\s\-()]+$/, "Invalid phone number"),
  parentEmail: z.string().email("Invalid email address").max(100),
  isActive: z.boolean().default(true),
});

export type StudentFormInput = z.infer<typeof studentSchema>;

// ──────────────────────────────────────────────
// Class form schema
// ──────────────────────────────────────────────
export const classSchema = z.object({
  name: z.string().min(2, "Class name required").max(50),
  section: z.string().min(1, "Section required").max(10),
  teacherId: z.string().optional().default(""),
});

export type ClassFormInput = z.infer<typeof classSchema>;

// ──────────────────────────────────────────────
// Device form schema
// ──────────────────────────────────────────────
export const deviceSchema = z.object({
  deviceId: z
    .string()
    .min(3, "Device ID too short")
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, "Only letters, numbers, dashes, underscores"),
  name: z.string().min(2, "Device name required").max(100),
  location: z.string().min(2, "Location required").max(100),
  secret: z.string().min(12, "Secret must be at least 12 characters").max(128),
});

export type DeviceFormInput = z.infer<typeof deviceSchema>;

// ──────────────────────────────────────────────
// Attendance correction schema
// ──────────────────────────────────────────────
export const correctionSchema = z.object({
  status: z.enum(["present", "late", "absent", "manual"]),
  correctionReason: z.string().min(5, "Please provide a reason").max(500),
});

export type CorrectionInput = z.infer<typeof correctionSchema>;

// ──────────────────────────────────────────────
// Settings schema
// ──────────────────────────────────────────────
export const settingsSchema = z.object({
  schoolName: z.string().min(2, "School name required").max(100),
  timezone: z.string().min(1, "Timezone required"),
  cutoffTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Must be HH:MM format"),
  absentCutoff: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Must be HH:MM format"),
  notificationChannel: z.enum(["simulator", "whatsapp", "sms", "email"]),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
