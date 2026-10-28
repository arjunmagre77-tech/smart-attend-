// app/api/attendance/export/route.ts
// CSV export endpoint for attendance records

import { NextRequest, NextResponse } from "next/server";
import { getAttendanceRecords } from "@/lib/services/attendance";
import { getStudents } from "@/lib/services/students";
import { getClasses } from "@/lib/services/classes";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dateKey = searchParams.get("dateKey") ?? undefined;
  const classId = searchParams.get("classId") ?? undefined;

  const [records, students, classes] = await Promise.all([
    getAttendanceRecords({ dateKey, classId }),
    getStudents(),
    getClasses(),
  ]);

  const studentMap = Object.fromEntries(students.map((s) => [s.studentId, s]));
  const classMap = Object.fromEntries(
    classes.map((c) => [c.classId, `${c.name} - ${c.section}`])
  );

  const headers = [
    "Date",
    "Student ID",
    "Student Name",
    "Roll Number",
    "Class",
    "Check-in Time",
    "Status",
    "Source",
    "Device",
  ];

  const rows = records.map((r) => {
    const student = studentMap[r.studentId];
    return [
      r.dateKey,
      r.studentId,
      student?.fullName ?? r.studentId,
      student?.rollNumber ?? "",
      classMap[r.classId] ?? r.classId,
      r.checkInAt ? new Date(r.checkInAt).toLocaleTimeString("en-IN") : "",
      r.status,
      r.source,
      r.deviceId,
    ];
  });

  const csvLines = [headers, ...rows].map((row) =>
    row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
  );

  const csv = csvLines.join("\n");
  const filename = `attendance_${dateKey ?? "all"}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv;charset=utf-8;",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
