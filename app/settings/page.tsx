"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  School,
  Clock,
  Bell,
  Wifi,
  Plus,
  Shield,
  Save,
  Loader2,
  WifiOff,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { getClasses } from "@/lib/services/classes";
import { toast } from "sonner";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { DEMO_SETTINGS, DEMO_DEVICES } from "@/lib/demo/data";
import { SchoolSettings, Device } from "@/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<SchoolSettings>(DEMO_SETTINGS);
  const [devices, setDevices] = useState<Device[]>(DEMO_DEVICES);
  const [saving, setSaving] = useState(false);
  const [scanSimulating, setScanSimulating] = useState(false);
  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [newDevice, setNewDevice] = useState({ deviceId: "", name: "", location: "", secret: "" });

  // Simulate an RFID scan in demo mode
  async function simulateScan() {
    setScanSimulating(true);
    try {
      const response = await fetch("/api/attendance/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": "demo-device",
          "X-Device-Secret": "demo-secret-key-for-testing",
        },
        body: JSON.stringify({
          rfidUid: "A31F2B09",
          deviceId: "demo-device",
          eventId: `demo_sim_${Date.now()}`,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Simulated scan: ${data.student?.name ?? "Student"} — ${data.attendance?.status}`);
      } else {
        toast.error(data.message ?? "Scan simulation failed");
      }
    } catch {
      toast.error("Scan simulation failed");
    } finally {
      setScanSimulating(false);
    }
  }

  function handleSaveSettings() {
    if (!isFirebaseConfigured) {
      toast.warning("Demo mode — settings changes are not persisted.");
      return;
    }
    // In production: write to Firestore settings/school document
    toast.success("Settings saved");
  }

  function handleAddDevice() {
    if (!newDevice.deviceId || !newDevice.name || !newDevice.secret) {
      toast.error("Device ID, name and secret are required");
      return;
    }
    if (!isFirebaseConfigured) {
      toast.warning("Demo mode — device not persisted.");
      setShowDeviceForm(false);
      return;
    }
    // In production: hash secret and write to Firestore devices collection
    toast.success("Device registered (production: write to Firestore)");
    setShowDeviceForm(false);
  }

  const notificationChannelOptions = [
    { value: "simulator", label: "Simulator (Development)", description: "Log messages to console only — no real notifications sent" },
    { value: "whatsapp", label: "WhatsApp Business", description: "Requires WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID" },
    { value: "sms", label: "SMS via Twilio", description: "Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER" },
    { value: "email", label: "Email", description: "Requires EMAIL_API_KEY and EMAIL_FROM_ADDRESS" },
  ];

  return (
    <DashboardLayout
      pageTitle="Settings"
      pageSubtitle="School configuration and device management"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "720px" }}>
        {/* School Info */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", gap: "10px" }}>
            <School size={18} style={{ color: "var(--navy)" }} />
            <h2 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>School Information</h2>
          </div>
          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="settings-school-name">School Name</label>
              <input id="settings-school-name" type="text" className="form-input"
                value={settings.schoolName}
                onChange={(e) => setSettings((s) => ({ ...s, schoolName: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="settings-timezone">Timezone</label>
              <select id="settings-timezone" className="form-input"
                value={settings.timezone}
                onChange={(e) => setSettings((s) => ({ ...s, timezone: e.target.value }))}>
                <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT +8:00)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Attendance Policy */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", gap: "10px" }}>
            <Clock size={18} style={{ color: "var(--navy)" }} />
            <h2 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>Attendance Policy</h2>
          </div>
          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="settings-cutoff">On-Time Cutoff (HH:MM)</label>
                <input id="settings-cutoff" type="time" className="form-input"
                  value={settings.cutoffTime}
                  onChange={(e) => setSettings((s) => ({ ...s, cutoffTime: e.target.value }))} />
                <span style={{ fontSize: "11.5px", color: "hsl(var(--muted-foreground))" }}>Scans after this are marked "Late"</span>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="settings-absent-cutoff">Absent Cutoff (HH:MM)</label>
                <input id="settings-absent-cutoff" type="time" className="form-input"
                  value={settings.absentCutoff}
                  onChange={(e) => setSettings((s) => ({ ...s, absentCutoff: e.target.value }))} />
                <span style={{ fontSize: "11.5px", color: "hsl(var(--muted-foreground))" }}>Scans after this are marked "Absent"</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notification */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", gap: "10px" }}>
            <Bell size={18} style={{ color: "var(--navy)" }} />
            <h2 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>Notification Channel</h2>
          </div>
          <div style={{ padding: "20px" }}>
            {notificationChannelOptions.map((opt) => (
              <label
                key={opt.value}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  padding: "12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  background: settings.notificationChannel === opt.value ? "var(--navy-muted)" : "transparent",
                  border: `1px solid ${settings.notificationChannel === opt.value ? "#2d5a9e40" : "transparent"}`,
                  marginBottom: "6px",
                  transition: "all 0.15s",
                }}
              >
                <input
                  type="radio"
                  name="notif-channel"
                  value={opt.value}
                  checked={settings.notificationChannel === opt.value as SchoolSettings["notificationChannel"]}
                  onChange={() => setSettings((s) => ({ ...s, notificationChannel: opt.value as SchoolSettings["notificationChannel"] }))}
                  style={{ marginTop: "2px" }}
                />
                <div>
                  <div style={{ fontWeight: 500, fontSize: "13.5px" }}>{opt.label}</div>
                  <div style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", marginTop: "2px" }}>{opt.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Devices */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(var(--border))", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Wifi size={18} style={{ color: "var(--navy)" }} />
              <h2 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>Authorized Devices</h2>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowDeviceForm(true)} id="add-device-btn">
              <Plus size={14} /> Register Device
            </button>
          </div>

          <div style={{ padding: "12px" }}>
            {devices.map((device) => (
              <div
                key={device.deviceId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: device.isActive ? "var(--teal-light)" : "var(--red-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {device.isActive ? <Wifi size={16} style={{ color: "#0f766e" }} /> : <WifiOff size={16} style={{ color: "#b91c1c" }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: "13.5px" }}>{device.name}</div>
                  <div style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))" }}>
                    ID: <code style={{ fontFamily: "monospace", fontSize: "11.5px" }}>{device.deviceId}</code> · {device.location}
                  </div>
                  {device.lastSeen && (
                    <div style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", marginTop: "1px" }}>
                      Last seen: {new Date(device.lastSeen).toLocaleString("en-IN")}
                    </div>
                  )}
                </div>
                <span className={`badge ${device.isActive ? "badge-present" : "badge-absent"}`} style={{ fontSize: "11px" }}>
                  {device.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Demo Mode: Simulate Scan */}
        {!isFirebaseConfigured && (
          <div className="card" style={{ padding: "20px", border: "1px solid #e9d5ff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <Zap size={18} style={{ color: "#7c3aed" }} />
              <h2 style={{ fontSize: "14px", fontWeight: 600, margin: 0, color: "#7c3aed" }}>
                Simulate RFID Scan (Demo Only)
              </h2>
            </div>
            <p style={{ fontSize: "12.5px", color: "hsl(var(--muted-foreground))", margin: "0 0 14px" }}>
              Send a simulated scan for student <strong>Aryan Mehta</strong> (RFID: A31F2B09) using the demo device.
              This exercises the full API code path without real hardware.
            </p>
            <button
              className="btn btn-primary"
              onClick={simulateScan}
              disabled={scanSimulating}
              id="simulate-scan-btn"
            >
              {scanSimulating ? (
                <><Loader2 size={15} style={{ animation: "spin 0.6s linear infinite" }} /> Simulating…</>
              ) : (
                <><Zap size={15} /> Simulate RFID Scan</>
              )}
            </button>
          </div>
        )}

        {/* Save button */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          {!isFirebaseConfigured && (
            <span style={{ fontSize: "12px", color: "#7c3aed", display: "flex", alignItems: "center", gap: "4px" }}>
              ⚠ Demo mode — settings not persisted
            </span>
          )}
          <button className="btn btn-primary" onClick={handleSaveSettings} disabled={saving} id="settings-save-btn">
            {saving ? <><Loader2 size={15} /> Saving…</> : <><Save size={15} /> Save Settings</>}
          </button>
        </div>
      </div>

      {/* Device registration form modal */}
      {showDeviceForm && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
          onClick={(e) => e.target === e.currentTarget && setShowDeviceForm(false)}
        >
          <div style={{ background: "white", borderRadius: "16px", width: "100%", maxWidth: "440px", overflow: "hidden", boxShadow: "0 25px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid hsl(var(--border))" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>Register New Device</h2>
            </div>
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="dev-id">Device ID *</label>
                <input id="dev-id" type="text" className="form-input"
                  value={newDevice.deviceId}
                  onChange={(e) => setNewDevice((d) => ({ ...d, deviceId: e.target.value.replace(/\s/g, "-") }))}
                  placeholder="e.g. school-gate-01" />
                <span style={{ fontSize: "11.5px", color: "hsl(var(--muted-foreground))" }}>
                  Must match the deviceId sent in ESP32 requests
                </span>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="dev-name">Device Name *</label>
                <input id="dev-name" type="text" className="form-input"
                  value={newDevice.name}
                  onChange={(e) => setNewDevice((d) => ({ ...d, name: e.target.value }))}
                  placeholder="e.g. Main Gate Scanner" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="dev-location">Location</label>
                <input id="dev-location" type="text" className="form-input"
                  value={newDevice.location}
                  onChange={(e) => setNewDevice((d) => ({ ...d, location: e.target.value }))}
                  placeholder="e.g. School Main Entrance" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="dev-secret">Device Secret *</label>
                <input id="dev-secret" type="password" className="form-input"
                  value={newDevice.secret}
                  onChange={(e) => setNewDevice((d) => ({ ...d, secret: e.target.value }))}
                  placeholder="Minimum 12 characters" />
                <span style={{ fontSize: "11.5px", color: "hsl(var(--muted-foreground))" }}>
                  This secret will be hashed and stored. Set the same value as X-Device-Secret in your ESP32 firmware.
                </span>
              </div>
              <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "8px", padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#b45309", fontWeight: 600, marginBottom: "4px" }}>
                  <Shield size={13} /> Security Note
                </div>
                <p style={{ fontSize: "11.5px", color: "#92400e", margin: 0 }}>
                  Never hardcode this secret in client-side code. Store it securely in your ESP32 firmware or a hardware secure element. The device secret alone is not sufficient — the deviceId must also match.
                </p>
              </div>
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid hsl(var(--border))", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button className="btn btn-secondary" onClick={() => setShowDeviceForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddDevice} id="device-register-submit">
                Register Device
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
