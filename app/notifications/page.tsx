"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Search, AlertCircle, CheckCircle2, Clock, XCircle, FlaskConical } from "lucide-react";
import { getNotifications } from "@/lib/services/notifications";
import { NotificationRecord } from "@/types";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "delivered":
      return <span className="badge badge-delivered"><CheckCircle2 size={11} />Delivered</span>;
    case "sent":
      return <span className="badge badge-sent"><CheckCircle2 size={11} />Sent</span>;
    case "pending":
      return <span className="badge badge-pending"><Clock size={11} />Pending</span>;
    case "failed":
      return <span className="badge badge-failed"><XCircle size={11} />Failed</span>;
    default:
      return <span className="badge badge-pending">{status}</span>;
  }
}

function ChannelBadge({ channel, isDemo }: { channel: string; isDemo?: boolean }) {
  if (isDemo) return <span className="badge badge-demo"><FlaskConical size={11} />Demo</span>;
  const labels: Record<string, string> = {
    whatsapp: "WhatsApp",
    sms: "SMS",
    email: "Email",
    simulator: "Simulator",
  };
  return <span className="badge badge-manual">{labels[channel] ?? channel}</span>;
}

// Inner component — renders inside DashboardLayout which owns AuthProvider
function NotificationsContent() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { appUser } = useAuth();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = notifications.filter((n) =>
    !search ||
    n.studentName.toLowerCase().includes(search.toLowerCase()) ||
    n.parentName.toLowerCase().includes(search.toLowerCase())
  );

  const summary = {
    sent: notifications.filter((n) => n.status === "sent" || n.status === "delivered").length,
    failed: notifications.filter((n) => n.status === "failed").length,
    pending: notifications.filter((n) => n.status === "pending").length,
  };

  return (<>
      {/* Summary */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <div style={{ background: "#ccfbf1", color: "#0f766e", padding: "5px 12px", borderRadius: "100px", fontSize: "12.5px", fontWeight: 600 }}>
          ✓ {summary.sent} Sent/Delivered
        </div>
        <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "5px 12px", borderRadius: "100px", fontSize: "12.5px", fontWeight: 600 }}>
          ✗ {summary.failed} Failed
        </div>
        {summary.pending > 0 && (
          <div style={{ background: "#f1f5f9", color: "#475569", padding: "5px 12px", borderRadius: "100px", fontSize: "12.5px", fontWeight: 600 }}>
            ◔ {summary.pending} Pending
          </div>
        )}
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: "16px", maxWidth: "360px" }}>
        <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "hsl(var(--muted-foreground))" }} />
        <input
          type="search"
          className="form-input"
          placeholder="Search by student or parent name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: "30px" }}
          id="notification-search"
        />
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "40px", display: "flex", justifyContent: "center" }}>
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <AlertCircle size={40} className="empty-state-icon" />
            <p style={{ fontWeight: 500 }}>No notifications found</p>
            <p style={{ fontSize: "12px" }}>Notifications are sent when attendance is recorded via RFID</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Parent</th>
                  <th>Channel</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Sent At</th>
                  {appUser?.role === "admin" && <th>Details</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((n) => (
                  <tr key={n.notificationId}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{n.studentName}</div>
                      <div style={{ fontSize: "11.5px", color: "hsl(var(--muted-foreground))" }}>
                        {n.studentId}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: "13px" }}>{n.parentName}</div>
                      <div style={{ fontSize: "11.5px", color: "hsl(var(--muted-foreground))", fontFamily: "monospace" }}>
                        {n.parentPhoneMasked}
                      </div>
                    </td>
                    <td>
                      <ChannelBadge channel={n.channel} isDemo={n.isDemo} />
                    </td>
                    <td style={{ maxWidth: "280px" }}>
                      <div
                        style={{
                          fontSize: "12.5px",
                          color: "hsl(var(--foreground))",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={n.message}
                      >
                        {n.message}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={n.status} />
                    </td>
                    <td style={{ fontSize: "12.5px", color: "hsl(var(--muted-foreground))" }}>
                      {n.sentAt
                        ? new Date(n.sentAt).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })
                        : n.status === "failed"
                        ? <span style={{ color: "var(--red)", fontSize: "12px" }}>Not sent</span>
                        : "—"}
                    </td>
                    {appUser?.role === "admin" && (
                      <td>
                        {n.errorDetails ? (
                          <span style={{ fontSize: "11.5px", color: "var(--red)" }} title={n.errorDetails}>
                            ⚠ Error
                          </span>
                        ) : n.providerResponseId ? (
                          <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", fontFamily: "monospace" }}>
                            {n.providerResponseId.slice(0, 16)}…
                          </span>
                        ) : "—"}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export default function NotificationsPage() {
  return (
    <DashboardLayout
      pageTitle="Notifications"
      pageSubtitle="Parent notification history"
    >
      <NotificationsContent />
    </DashboardLayout>
  );
}
