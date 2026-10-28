"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Plus, Edit2, BookOpen, Users } from "lucide-react";
import { getClasses, createClass, updateClass } from "@/lib/services/classes";
import { getStudents } from "@/lib/services/students";
import { SchoolClass } from "@/types";
import { toast } from "sonner";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { DEMO_STUDENTS } from "@/lib/demo/data";

export default function ClassesPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [form, setForm] = useState({ name: "", section: "", teacherId: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cls, studs] = await Promise.all([getClasses(), getStudents()]);
      setClasses(cls);
      const counts: Record<string, number> = {};
      studs.forEach((s) => {
        counts[s.classId] = (counts[s.classId] ?? 0) + 1;
      });
      setStudentCounts(counts);
    } catch {
      toast.error("Failed to load classes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditingClass(null);
    setForm({ name: "", section: "", teacherId: "" });
    setShowForm(true);
  }

  function openEdit(cls: SchoolClass) {
    setEditingClass(cls);
    setForm({ name: cls.name, section: cls.section, teacherId: cls.teacherId });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name || !form.section) {
      toast.error("Class name and section are required");
      return;
    }
    if (!isFirebaseConfigured) {
      toast.warning("Demo mode — changes not persisted");
      setShowForm(false);
      return;
    }
    setSaving(true);
    try {
      if (editingClass) {
        await updateClass(editingClass.classId, form);
        toast.success("Class updated");
      } else {
        const classId = `CLS${Date.now().toString().slice(-6)}`;
        await createClass(classId, { ...form, isActive: true });
        toast.success("Class created");
      }
      setShowForm(false);
      load();
    } catch {
      toast.error("Failed to save class");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout
      pageTitle="Classes"
      pageSubtitle={`${classes.length} class${classes.length !== 1 ? "es" : ""}`}
      onRefresh={load}
    >
      <div className="page-header">
        <div />
        <button className="btn btn-primary" onClick={openAdd} id="add-class-btn">
          <Plus size={16} /> Add Class
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
          <div className="spinner" />
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "16px",
          }}
        >
          {classes.map((cls) => (
            <div key={cls.classId} className="card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    background: "var(--navy-muted)",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <BookOpen size={20} style={{ color: "var(--navy)" }} />
                </div>
                <button className="btn btn-ghost btn-icon" onClick={() => openEdit(cls)} aria-label={`Edit ${cls.name}`}>
                  <Edit2 size={15} />
                </button>
              </div>

              <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 2px" }}>
                {cls.name}
              </h3>
              <p style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))", margin: "0 0 12px" }}>
                Section {cls.section}
              </p>

              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12.5px", color: "hsl(var(--muted-foreground))" }}>
                  <Users size={13} />
                  {studentCounts[cls.classId] ?? 0} students
                </div>
                <span className={`badge ${cls.isActive ? "badge-present" : "badge-absent"}`} style={{ fontSize: "11px" }}>
                  {cls.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          ))}

          {classes.length === 0 && (
            <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
              <BookOpen size={40} className="empty-state-icon" />
              <p style={{ fontWeight: 500 }}>No classes yet</p>
              <button className="btn btn-primary btn-sm" onClick={openAdd} style={{ marginTop: "8px" }}>
                <Plus size={14} /> Add Class
              </button>
            </div>
          )}
        </div>
      )}

      {/* Class form modal */}
      {showForm && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
        >
          <div style={{ background: "white", borderRadius: "16px", width: "100%", maxWidth: "420px", overflow: "hidden", boxShadow: "0 25px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid hsl(var(--border))" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>
                {editingClass ? "Edit Class" : "Add New Class"}
              </h2>
            </div>
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="cf-name">Class Name *</label>
                <input id="cf-name" type="text" className="form-input"
                  value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Grade 10" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="cf-section">Section *</label>
                <input id="cf-section" type="text" className="form-input"
                  value={form.section} onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
                  placeholder="e.g. A" />
              </div>
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid hsl(var(--border))", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} id="class-form-submit">
                {saving ? "Saving…" : editingClass ? "Save Changes" : "Create Class"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
