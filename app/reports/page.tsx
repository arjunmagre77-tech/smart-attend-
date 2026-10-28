"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Download, Calendar, BarChart2, TrendingUp } from "lucide-react";
import {
  getAttendanceRecords,
  getClassAttendanceStats,
} from "@/lib/services/attendance";
import { getStudents } from "@/lib/services/students";
import { getClasses } from "@/lib/services/classes";
import { SchoolClass, AttendanceRecord, Student } from "@/types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { format, parseISO, startOfWeek, subWeeks, eachDayOfInterval, endOfWeek } from "date-fns";
import { toast } from "sonner";

export default function ReportsPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [classFilter, setClassFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cls, studs, atts] = await Promise.all([
        getClasses(),
        getStudents(),
        getAttendanceRecords({ classId: classFilter || undefined }),
      ]);
      setClasses(cls);
      setStudents(studs);
      // Filter by date range client-side
      const filtered = atts.filter(
        (r) => r.dateKey >= dateFrom && r.dateKey <= dateTo
      );
      setRecords(filtered);
    } catch {
      toast.error("Failed to load report data");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, classFilter]);

  useEffect(() => { load(); }, [load]);

  // Build daily trend
  const dailyMap = new Map<string, { present: number; late: number; absent: number; total: number }>();
  const activeStudentCount = students.filter((s) =>
    classFilter ? s.classId === classFilter : true
  ).filter((s) => s.isActive).length;

  records.forEach((r) => {
    if (!dailyMap.has(r.dateKey)) {
      dailyMap.set(r.dateKey, { present: 0, late: 0, absent: 0, total: activeStudentCount });
    }
    const entry = dailyMap.get(r.dateKey)!;
    if (r.status === "present") entry.present++;
    else if (r.status === "late") entry.late++;
    else if (r.status === "absent") entry.absent++;
  });

  const dailyTrend = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({
      date: (() => { try { return format(parseISO(date), "MM/dd"); } catch { return date; } })(),
      present: d.present,
      late: d.late,
      absent: Math.max(0, d.total - d.present - d.late),
      percentage: d.total > 0 ? Math.round(((d.present + d.late) / d.total) * 100) : 0,
    }));

  // Per-student summary
  const studentMap = Object.fromEntries(students.map((s) => [s.studentId, s]));
  const classMap = Object.fromEntries(
    classes.map((c) => [c.classId, `${c.name}-${c.section}`])
  );

  const studentSummaries = students
    .filter((s) => (classFilter ? s.classId === classFilter : true) && s.isActive)
    .map((s) => {
      const sRecords = records.filter((r) => r.studentId === s.studentId);
      const present = sRecords.filter((r) => r.status === "present" || r.status === "late").length;
      const total = sRecords.length || 1;
      return {
        studentId: s.studentId,
        name: s.fullName,
        roll: s.rollNumber,
        className: classMap[s.classId] ?? s.classId,
        present,
        total: sRecords.length,
        percentage: sRecords.length > 0 ? Math.round((present / sRecords.length) * 100) : 0,
      };
    })
    .sort((a, b) => b.percentage - a.percentage);

  function handleExport() {
    const params = new URLSearchParams();
    if (classFilter) params.set("classId", classFilter);
    window.open(`/api/attendance/export?${params}`, "_blank");
    toast.success("CSV export started");
  }

  return (
    <DashboardLayout
      pageTitle="Reports"
      pageSubtitle="Attendance analytics and summaries"
      onRefresh={load}
    >
      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Calendar size={14} style={{ color: "hsl(var(--muted-foreground))" }} />
          <span style={{ fontSize: "12.5px", color: "hsl(var(--muted-foreground))" }}>From</span>
          <input type="date" className="form-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ flex: "none", width: "150px" }} id="report-from-date" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12.5px", color: "hsl(var(--muted-foreground))" }}>To</span>
          <input type="date" className="form-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ flex: "none", width: "150px" }} id="report-to-date" />
        </div>
        <select className="form-input" value={classFilter} onChange={(e) => setClassFilter(e.target.value)} style={{ width: "180px" }} id="report-class-filter">
          <option value="">All Classes</option>
          {classes.map((c) => (
            <option key={c.classId} value={c.classId}>{c.name} - {c.section}</option>
          ))}
        </select>
        <button className="btn btn-secondary" onClick={handleExport} id="report-export-btn">
          <Download size={15} /> Export CSV
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "14px", marginBottom: "20px" }}>
            {[
              { label: "Total Records", value: records.length, color: "#2d5a9e" },
              { label: "Present / Late", value: records.filter((r) => r.status === "present" || r.status === "late").length, color: "#0d9488" },
              { label: "Absences", value: records.filter((r) => r.status === "absent").length, color: "#dc2626" },
              {
                label: "Avg Attendance",
                value: dailyTrend.length > 0
                  ? `${Math.round(dailyTrend.reduce((s, d) => s + d.percentage, 0) / dailyTrend.length)}%`
                  : "N/A",
                color: "#7c3aed",
              },
            ].map((card) => (
              <div key={card.label} className="stat-card">
                <p style={{ fontSize: "11.5px", color: "hsl(var(--muted-foreground))", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500 }}>{card.label}</p>
                <p style={{ fontSize: "24px", fontWeight: 700, margin: 0, color: card.color }}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Daily trend chart */}
          {dailyTrend.length > 0 && (
            <div className="card" style={{ padding: "20px", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 4px" }}>Daily Attendance Trend</h3>
              <p style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", margin: "0 0 16px" }}>
                {dateFrom} → {dateTo}
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dailyTrend} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: "10px", fontSize: "12px", border: "1px solid hsl(var(--border))" }} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: "11.5px" }}>{v}</span>} />
                  <Line type="monotone" dataKey="present" name="Present" stroke="#0d9488" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="late" name="Late" stroke="#d97706" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                  <Line type="monotone" dataKey="absent" name="Absent" stroke="#dc2626" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Student attendance summary */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(var(--border))" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>Student Attendance Summary</h3>
              <p style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", margin: "2px 0 0" }}>
                Sorted by attendance percentage (highest first)
              </p>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Student</th>
                    <th>Class</th>
                    <th>Days Present</th>
                    <th>Total Days</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {studentSummaries.map((s, i) => (
                    <tr key={s.studentId}>
                      <td style={{ color: "hsl(var(--muted-foreground))", fontSize: "12.5px" }}>#{i + 1}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{s.name}</div>
                        <div style={{ fontSize: "11.5px", color: "hsl(var(--muted-foreground))" }}>Roll #{s.roll}</div>
                      </td>
                      <td style={{ color: "hsl(var(--muted-foreground))", fontSize: "12.5px" }}>{s.className}</td>
                      <td style={{ fontVariantNumeric: "tabular-nums" }}>{s.present}</td>
                      <td style={{ fontVariantNumeric: "tabular-nums" }}>{s.total}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div
                            style={{
                              width: "80px",
                              height: "6px",
                              background: "hsl(var(--muted))",
                              borderRadius: "100px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${s.percentage}%`,
                                height: "100%",
                                background:
                                  s.percentage >= 90 ? "#0d9488" :
                                  s.percentage >= 75 ? "#d97706" : "#dc2626",
                                borderRadius: "100px",
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: "12.5px",
                              fontWeight: 600,
                              color:
                                s.percentage >= 90 ? "#0f766e" :
                                s.percentage >= 75 ? "#b45309" : "#b91c1c",
                            }}
                          >
                            {s.percentage}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {studentSummaries.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "hsl(var(--muted-foreground))" }}>
                        No data for selected filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
