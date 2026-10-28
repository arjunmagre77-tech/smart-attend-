"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Download, Search, Filter, X, ChevronLeft, ChevronRight } from "lucide-react";
import { getAttendanceRecords } from "@/lib/services/attendance";
import { getClasses } from "@/lib/services/classes";
import { AttendanceWithStudent, SchoolClass, AttendanceFilters } from "@/types";
import { getStudents } from "@/lib/services/students";
import { toast } from "sonner";
import { format } from "date-fns";

const PAGE_SIZE = 15;

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "present" ? "badge-present" :
    status === "late" ? "badge-late" :
    status === "absent" ? "badge-absent" : "badge-manual";
  return <span className={`badge ${cls}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceWithStudent[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const today = new Date().toISOString().slice(0, 10);
  const [dateFilter, setDateFilter] = useState(today);
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<AttendanceFilters["status"]>("");
  const [studentSearch, setStudentSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [atts, cls, studs] = await Promise.all([
        getAttendanceRecords({
          dateKey: dateFilter || undefined,
          classId: classFilter || undefined,
          status: statusFilter || undefined,
          studentSearch: studentSearch || undefined,
        }),
        getClasses(),
        getStudents(),
      ]);

      const studentMap = Object.fromEntries(
        studs.map((s) => [s.studentId, { name: s.fullName, roll: s.rollNumber }])
      );
      const classMap = Object.fromEntries(cls.map((c) => [c.classId, `${c.name} - ${c.section}`]));

      setRecords(
        atts.map((a) => ({
          ...a,
          studentName: studentMap[a.studentId]?.name ?? a.studentId,
          rollNumber: studentMap[a.studentId]?.roll,
          className: classMap[a.classId] ?? a.classId,
        }))
      );
      setClasses(cls);
    } catch {
      toast.error("Failed to load attendance records");
    } finally {
      setLoading(false);
    }
  }, [dateFilter, classFilter, statusFilter, studentSearch]);

  useEffect(() => {
    loadData();
    setPage(1);
  }, [loadData]);

  function handleExport() {
    const url = `/api/attendance/export?${new URLSearchParams({
      ...(dateFilter ? { dateKey: dateFilter } : {}),
      ...(classFilter ? { classId: classFilter } : {}),
    })}`;
    window.open(url, "_blank");
    toast.success("CSV export started");
  }

  const totalPages = Math.ceil(records.length / PAGE_SIZE);
  const paginated = records.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const summary = {
    present: records.filter((r) => r.status === "present").length,
    late: records.filter((r) => r.status === "late").length,
    absent: records.filter((r) => r.status === "absent").length,
  };

  return (
    <DashboardLayout
      pageTitle="Attendance"
      pageSubtitle={dateFilter ? `Records for ${format(new Date(dateFilter + "T00:00:00"), "MMMM d, yyyy")}` : "All records"}
      onRefresh={loadData}
    >
      {/* Summary pills */}
      {!loading && records.length > 0 && (
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#ccfbf1", color: "#0f766e", padding: "5px 12px", borderRadius: "100px", fontSize: "12.5px", fontWeight: 600 }}>
            ✓ {summary.present} Present
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#fef3c7", color: "#b45309", padding: "5px 12px", borderRadius: "100px", fontSize: "12.5px", fontWeight: 600 }}>
            ◔ {summary.late} Late
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#fee2e2", color: "#b91c1c", padding: "5px 12px", borderRadius: "100px", fontSize: "12.5px", fontWeight: 600 }}>
            ✗ {summary.absent} Absent
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input
          type="date"
          className="form-input"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          style={{ flex: "0 1 160px" }}
          id="attendance-date-filter"
        />

        <select
          className="form-input"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          style={{ flex: "0 1 180px" }}
          id="attendance-class-filter"
        >
          <option value="">All Classes</option>
          {classes.map((c) => (
            <option key={c.classId} value={c.classId}>
              {c.name} - {c.section}
            </option>
          ))}
        </select>

        <select
          className="form-input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AttendanceFilters["status"])}
          style={{ flex: "0 1 150px" }}
          id="attendance-status-filter"
        >
          <option value="">All Statuses</option>
          <option value="present">Present</option>
          <option value="late">Late</option>
          <option value="absent">Absent</option>
          <option value="manual">Manual</option>
        </select>

        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "hsl(var(--muted-foreground))" }} />
          <input
            type="search"
            className="form-input"
            placeholder="Search student…"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            style={{ paddingLeft: "30px" }}
            id="attendance-student-search"
          />
        </div>

        <button
          className="btn btn-secondary"
          onClick={handleExport}
          id="attendance-export-btn"
          style={{ gap: "6px" }}
        >
          <Download size={15} />
          Export CSV
        </button>

        {(dateFilter !== today || classFilter || statusFilter || studentSearch) && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setDateFilter(today); setClassFilter(""); setStatusFilter(""); setStudentSearch(""); }}
          >
            <X size={14} /> Reset
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "40px", display: "flex", justifyContent: "center" }}>
            <div className="spinner" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="empty-state">
            <Filter size={40} className="empty-state-icon" />
            <p style={{ fontWeight: 500 }}>No records found</p>
            <p style={{ fontSize: "12px" }}>Try adjusting your filters or select a different date</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Class</th>
                    <th>Date</th>
                    <th>Check-in Time</th>
                    <th>Status</th>
                    <th>Source</th>
                    <th>Device</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((record) => (
                    <tr key={record.attendanceId}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{record.studentName ?? record.studentId}</div>
                        {record.rollNumber && (
                          <div style={{ fontSize: "11.5px", color: "hsl(var(--muted-foreground))" }}>
                            Roll #{record.rollNumber}
                          </div>
                        )}
                      </td>
                      <td style={{ color: "hsl(var(--muted-foreground))", fontSize: "13px" }}>
                        {record.className ?? record.classId}
                      </td>
                      <td style={{ fontSize: "12.5px", fontVariantNumeric: "tabular-nums" }}>
                        {record.dateKey}
                      </td>
                      <td style={{ fontVariantNumeric: "tabular-nums", fontSize: "13px" }}>
                        {new Date(record.checkInAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </td>
                      <td>
                        <StatusBadge status={record.status} />
                      </td>
                      <td>
                        <span
                          className={record.source === "demo" ? "badge badge-demo" : ""}
                          style={{
                            fontSize: "12px",
                            color: record.source === "demo" ? undefined : "hsl(var(--muted-foreground))",
                            padding: record.source === "demo" ? undefined : 0,
                            background: record.source === "demo" ? undefined : "transparent",
                          }}
                        >
                          {record.source === "rfid" ? "RFID" : record.source === "demo" ? "Demo" : record.source === "manual" ? "Manual" : record.source}
                        </span>
                      </td>
                      <td style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", fontFamily: "monospace" }}>
                        {record.deviceId}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid hsl(var(--border))" }}>
                <span style={{ fontSize: "12.5px", color: "hsl(var(--muted-foreground))" }}>
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, records.length)} of {records.length}
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button className="btn btn-ghost btn-icon" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ display: "flex", alignItems: "center", fontSize: "12.5px", padding: "0 8px" }}>
                    {page} / {totalPages}
                  </span>
                  <button className="btn btn-ghost btn-icon" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
