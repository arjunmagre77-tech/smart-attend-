"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { getStudents } from "@/lib/services/students";
import { getClasses } from "@/lib/services/classes";
import { StudentWithClass, SchoolClass } from "@/types";
import { toast } from "sonner";
import StudentForm from "@/components/students/StudentForm";

const PAGE_SIZE = 12;

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentWithClass[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive">("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentWithClass | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        getStudents({
          search,
          classId: classFilter || undefined,
          isActive: statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined,
        }),
        getClasses(),
      ]);
      const classMap = Object.fromEntries(c.map((cls) => [cls.classId, `${cls.name} - ${cls.section}`]));
      setStudents(s.map((st) => ({ ...st, className: classMap[st.classId] ?? st.classId })));
      setClasses(c);
    } catch {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  }, [search, classFilter, statusFilter]);

  useEffect(() => {
    loadData();
    setPage(1);
  }, [loadData]);

  const totalPages = Math.ceil(students.length / PAGE_SIZE);
  const paginated = students.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleAdd() {
    setEditingStudent(null);
    setShowForm(true);
  }

  function handleEdit(student: StudentWithClass) {
    setEditingStudent(student);
    setShowForm(true);
  }

  function handleFormClose() {
    setShowForm(false);
    setEditingStudent(null);
    loadData();
  }

  return (
    <DashboardLayout
      pageTitle="Students"
      pageSubtitle={`${students.length} student${students.length !== 1 ? "s" : ""} registered`}
      onRefresh={loadData}
    >
      {/* Header */}
      <div className="page-header">
        <div />
        <button className="btn btn-primary" onClick={handleAdd} id="add-student-btn">
          <Plus size={16} />
          Add Student
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search
            size={15}
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "hsl(var(--muted-foreground))",
            }}
          />
          <input
            type="search"
            className="form-input"
            placeholder="Search by name, roll number, or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: "32px" }}
            id="student-search"
          />
        </div>

        <select
          className="form-input"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          style={{ flex: "0 1 180px" }}
          id="student-class-filter"
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
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          style={{ flex: "0 1 150px" }}
          id="student-status-filter"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        {(search || classFilter || statusFilter) && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setSearch(""); setClassFilter(""); setStatusFilter(""); }}
          >
            <X size={14} />
            Clear
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
            <UserCheck size={48} className="empty-state-icon" />
            <p style={{ fontWeight: 500 }}>No students found</p>
            <p style={{ fontSize: "12px" }}>
              {search || classFilter || statusFilter
                ? "Try adjusting your filters"
                : "Add your first student to get started"}
            </p>
            {!search && !classFilter && !statusFilter && (
              <button className="btn btn-primary btn-sm" onClick={handleAdd} style={{ marginTop: "12px" }}>
                <Plus size={14} />
                Add Student
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Roll No.</th>
                    <th>Class</th>
                    <th>RFID Card</th>
                    <th>Parent</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((student) => (
                    <tr key={student.studentId}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{student.fullName}</div>
                        <div style={{ fontSize: "11.5px", color: "hsl(var(--muted-foreground))" }}>
                          {student.studentId}
                        </div>
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "13px" }}>
                        {student.rollNumber}
                      </td>
                      <td style={{ color: "hsl(var(--muted-foreground))" }}>
                        {student.className ?? student.classId}
                      </td>
                      <td>
                        {student.rfidUid ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              fontSize: "12px",
                              color: "#0f766e",
                              fontFamily: "monospace",
                            }}
                          >
                            <Wifi size={13} />
                            {student.rfidUid}
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              fontSize: "12px",
                              color: "hsl(var(--muted-foreground))",
                            }}
                          >
                            <WifiOff size={13} />
                            Not assigned
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: "13px" }}>{student.parentName}</div>
                        <div style={{ fontSize: "11.5px", color: "hsl(var(--muted-foreground))" }}>
                          {student.parentPhone}
                        </div>
                      </td>
                      <td>
                        {student.isActive ? (
                          <span className="badge badge-present">
                            <UserCheck size={11} />
                            Active
                          </span>
                        ) : (
                          <span className="badge badge-absent">
                            <UserX size={11} />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-icon"
                          onClick={() => handleEdit(student)}
                          aria-label={`Edit ${student.fullName}`}
                          title="Edit student"
                        >
                          <Edit2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderTop: "1px solid hsl(var(--border))",
                }}
              >
                <span style={{ fontSize: "12.5px", color: "hsl(var(--muted-foreground))" }}>
                  Showing {(page - 1) * PAGE_SIZE + 1}–
                  {Math.min(page * PAGE_SIZE, students.length)} of {students.length}
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    className="btn btn-ghost btn-icon"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      fontSize: "12.5px",
                      padding: "0 8px",
                    }}
                  >
                    {page} / {totalPages}
                  </span>
                  <button
                    className="btn btn-ghost btn-icon"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    aria-label="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Student form modal */}
      {showForm && (
        <StudentForm
          student={editingStudent}
          classes={classes}
          onClose={handleFormClose}
        />
      )}
    </DashboardLayout>
  );
}
