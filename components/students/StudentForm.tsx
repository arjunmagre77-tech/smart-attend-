"use client";

import { useState, useEffect } from "react";
import { X, Wifi, Save, Loader2 } from "lucide-react";
import { StudentWithClass, SchoolClass } from "@/types";
import { studentSchema, StudentFormInput } from "@/lib/schemas";
import { createStudent, updateStudent, checkRfidUnique } from "@/lib/services/students";
import { toast } from "sonner";
import { isFirebaseConfigured } from "@/lib/firebase/client";

interface StudentFormProps {
  student: StudentWithClass | null;
  classes: SchoolClass[];
  onClose: () => void;
}

export default function StudentForm({ student, classes, onClose }: StudentFormProps) {
  const isEdit = Boolean(student);

  const [form, setForm] = useState<StudentFormInput>({
    fullName: student?.fullName ?? "",
    rollNumber: student?.rollNumber ?? "",
    classId: student?.classId ?? "",
    rfidUid: student?.rfidUid ?? "",
    parentName: student?.parentName ?? "",
    parentPhone: student?.parentPhone ?? "",
    parentEmail: student?.parentEmail ?? "",
    isActive: student?.isActive ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Auto-uppercase RFID UID
  function handleRfidChange(val: string) {
    setForm((f) => ({ ...f, rfidUid: val.toUpperCase().replace(/[^A-F0-9]/g, "") }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isFirebaseConfigured) {
      toast.warning("Demo mode: Changes are not persisted. Configure Firebase to save data.", {
        duration: 5000,
      });
      onClose();
      return;
    }

    // Validate
    const result = studentSchema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((i) => {
        errs[i.path[0] as string] = i.message;
      });
      setErrors(errs);
      return;
    }

    setErrors({});
    setSaving(true);

    try {
      // Check RFID uniqueness
      if (form.rfidUid) {
        const unique = await checkRfidUnique(form.rfidUid, student?.studentId);
        if (!unique) {
          setErrors({ rfidUid: "This RFID card is already assigned to another student" });
          setSaving(false);
          return;
        }
      }

      if (isEdit && student) {
        await updateStudent(student.studentId, {
          ...form,
          rfidUid: form.rfidUid || null,
        });
        toast.success("Student updated successfully");
      } else {
        // Generate a new student ID
        const studentId = `STU${Date.now().toString().slice(-6)}`;
        await createStudent(studentId, {
          ...form,
          rfidUid: form.rfidUid || null,
        });
        toast.success("Student added successfully");
      }

      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save student");
    } finally {
      setSaving(false);
    }
  }

  function setField(key: keyof StudentFormInput, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 100,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "32px 16px",
        overflowY: "auto",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "560px",
          boxShadow: "0 25px 60px rgba(0,0,0,0.2)",
          overflow: "hidden",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-form-title"
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid hsl(var(--border))",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2 id="student-form-title" style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>
              {isEdit ? "Edit Student" : "Add New Student"}
            </h2>
            {!isFirebaseConfigured && (
              <p style={{ fontSize: "11.5px", color: "#7c3aed", margin: "2px 0 0" }}>
                ⚠ Demo mode — changes will not be saved
              </p>
            )}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close form">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="sf-name">Full Name *</label>
              <input id="sf-name" type="text" className="form-input" value={form.fullName}
                onChange={(e) => setField("fullName", e.target.value)}
                placeholder="e.g. Aryan Mehta" />
              {errors.fullName && <span className="form-error">{errors.fullName}</span>}
            </div>

            {/* Roll + Class */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="sf-roll">Roll Number *</label>
                <input id="sf-roll" type="text" className="form-input" value={form.rollNumber}
                  onChange={(e) => setField("rollNumber", e.target.value)}
                  placeholder="e.g. 001" />
                {errors.rollNumber && <span className="form-error">{errors.rollNumber}</span>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="sf-class">Class *</label>
                <select id="sf-class" className="form-input" value={form.classId}
                  onChange={(e) => setField("classId", e.target.value)}>
                  <option value="">Select class…</option>
                  {classes.map((c) => (
                    <option key={c.classId} value={c.classId}>
                      {c.name} - {c.section}
                    </option>
                  ))}
                </select>
                {errors.classId && <span className="form-error">{errors.classId}</span>}
              </div>
            </div>

            {/* RFID UID */}
            <div className="form-group">
              <label className="form-label" htmlFor="sf-rfid">
                RFID Card UID
                <span style={{ fontWeight: 400, color: "hsl(var(--muted-foreground))", marginLeft: "6px" }}>
                  (optional — hexadecimal)
                </span>
              </label>
              <div style={{ position: "relative" }}>
                <Wifi size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "hsl(var(--muted-foreground))" }} />
                <input id="sf-rfid" type="text" className="form-input"
                  value={form.rfidUid ?? ""}
                  onChange={(e) => handleRfidChange(e.target.value)}
                  placeholder="e.g. A31F2B09"
                  maxLength={32}
                  style={{ paddingLeft: "32px", fontFamily: "monospace", letterSpacing: "0.08em" }}
                />
              </div>
              {errors.rfidUid && <span className="form-error">{errors.rfidUid}</span>}
              <span style={{ fontSize: "11.5px", color: "hsl(var(--muted-foreground))" }}>
                Only uppercase hex characters. Scan from MFRC522 to get the UID.
              </span>
            </div>

            {/* Section divider */}
            <div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>
                Parent / Guardian Contact
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="sf-pname">Parent Name *</label>
                  <input id="sf-pname" type="text" className="form-input" value={form.parentName}
                    onChange={(e) => setField("parentName", e.target.value)}
                    placeholder="e.g. Rajesh Mehta" />
                  {errors.parentName && <span className="form-error">{errors.parentName}</span>}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="sf-phone">Phone *</label>
                    <input id="sf-phone" type="tel" className="form-input" value={form.parentPhone}
                      onChange={(e) => setField("parentPhone", e.target.value)}
                      placeholder="+91 98765 43210" />
                    {errors.parentPhone && <span className="form-error">{errors.parentPhone}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="sf-email">Email *</label>
                    <input id="sf-email" type="email" className="form-input" value={form.parentEmail}
                      onChange={(e) => setField("parentEmail", e.target.value)}
                      placeholder="parent@email.com" />
                    {errors.parentEmail && <span className="form-error">{errors.parentEmail}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Active toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input type="checkbox" id="sf-active" checked={form.isActive}
                onChange={(e) => setField("isActive", e.target.checked)}
                style={{ width: "16px", height: "16px" }} />
              <label htmlFor="sf-active" className="form-label" style={{ margin: 0, cursor: "pointer" }}>
                Student is active
              </label>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid hsl(var(--border))",
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
            }}
          >
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving} id="student-form-submit">
              {saving ? (
                <><Loader2 size={15} style={{ animation: "spin 0.6s linear infinite" }} /> Saving…</>
              ) : (
                <><Save size={15} /> {isEdit ? "Save Changes" : "Add Student"}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
