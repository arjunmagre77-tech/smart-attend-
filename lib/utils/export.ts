// lib/utils/export.ts
import { AttendanceWithStudent } from "@/types";

/**
 * Converts attendance records to a CSV string and triggers browser download
 */
export function exportAttendanceCSV(
  records: AttendanceWithStudent[],
  filename: string = "attendance.csv"
): void {
  const headers = [
    "Date",
    "Student Name",
    "Roll Number",
    "Class",
    "Check-in Time",
    "Status",
    "Source",
    "Device",
  ];

  const rows = records.map((r) => [
    r.dateKey,
    r.studentName ?? r.studentId,
    r.rollNumber ?? "",
    r.className ?? r.classId,
    r.checkInAt ? new Date(r.checkInAt).toLocaleTimeString() : "",
    r.status,
    r.source,
    r.deviceId,
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Masks a phone number for privacy display e.g. "+91 ****6789"
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return "****";
  const last4 = phone.slice(-4);
  const prefix = phone.slice(0, Math.max(0, phone.length - 8));
  return `${prefix} ****${last4}`;
}
