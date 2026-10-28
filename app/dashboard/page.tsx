"use client";

import { useEffect, useState, useCallback, useRef, startTransition } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Activity,
  ChevronRight,
  Wifi,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  getDashboardStats,
  getWeeklyTrend,
  getClassAttendanceStats,
  subscribeRecentActivity,
} from "@/lib/services/attendance";
import {
  DashboardStats,
  WeeklyTrendPoint,
  ClassAttendanceStat,
  AttendanceWithStudent,
} from "@/types";
import { format, parseISO } from "date-fns";
import Link from "next/link";

const STATUS_COLORS = {
  present: "#0d9488",
  late: "#d97706",
  absent: "#dc2626",
  manual: "#3b82f6",
};

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  sub?: string;
}) {
  return (
    <div className="stat-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", fontWeight: 500, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {label}
          </p>
          <p style={{ fontSize: "28px", fontWeight: 700, margin: 0, color: "hsl(var(--foreground))", letterSpacing: "-0.04em" }}>
            {value}
          </p>
          {sub && (
            <p style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", margin: "4px 0 0" }}>
              {sub}
            </p>
          )}
        </div>
        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "10px",
            background: `${color}18`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={20} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

function AttendanceBadge({ status }: { status: string }) {
  const cls =
    status === "present"
      ? "badge-present"
      : status === "late"
      ? "badge-late"
      : status === "absent"
      ? "badge-absent"
      : "badge-manual";

  return <span className={`badge ${cls}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrendPoint[]>([]);
  const [classStats, setClassStats] = useState<ClassAttendanceStat[]>([]);
  const [recentActivity, setRecentActivity] = useState<AttendanceWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const today = new Date();
  // Keep a stable reference to the unsubscribe fn across renders
  const unsubRef = useRef<(() => void) | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [s, w, c] = await Promise.all([
        getDashboardStats(),
        getWeeklyTrend(),
        getClassAttendanceStats(new Date().toISOString().slice(0, 10)),
      ]);
      setStats(s);
      setWeeklyTrend(w);
      setClassStats(c);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load of aggregated stats
  useEffect(() => {
    startTransition(() => { loadData(); });
  }, [loadData]);

  // Real-time listener for recent activity — subscribes once, updates on every new scan
  useEffect(() => {
    const unsub = subscribeRecentActivity(
      8,
      (records) => {
        setRecentActivity(records);
        setLiveConnected(true);
      },
      (err) => {
        console.error("[dashboard] live feed error:", err);
        setLiveConnected(false);
      }
    );
    unsubRef.current = unsub;
    return () => {
      unsub();
      unsubRef.current = null;
    };
  }, []);

  const pieData = stats
    ? [
        { name: "Present", value: stats.presentToday, color: STATUS_COLORS.present },
        { name: "Late", value: stats.lateToday, color: STATUS_COLORS.late },
        { name: "Absent", value: stats.absentToday, color: STATUS_COLORS.absent },
      ]
    : [];

  const chartData = weeklyTrend.map((p) => ({
    ...p,
    date: (() => {
      try {
        return format(parseISO(p.date), "EEE");
      } catch {
        return p.date;
      }
    })(),
  }));

  return (
    <DashboardLayout
      pageTitle="Dashboard"
      pageSubtitle={today.toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}
      onRefresh={() => loadData(true)}
      isRefreshing={refreshing}
    >
      {loading ? (
        <div style={{ display: "grid", gap: "16px" }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="stat-card">
                <div className="skeleton" style={{ height: "14px", width: "80px", marginBottom: "12px" }} />
                <div className="skeleton" style={{ height: "32px", width: "60px" }} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <StatCard
              label="Total Students"
              value={stats?.totalStudents ?? 0}
              icon={Users}
              color="#2d5a9e"
            />
            <StatCard
              label="Present Today"
              value={stats?.presentToday ?? 0}
              icon={CheckCircle2}
              color={STATUS_COLORS.present}
            />
            <StatCard
              label="Absent Today"
              value={stats?.absentToday ?? 0}
              icon={XCircle}
              color={STATUS_COLORS.absent}
            />
            <StatCard
              label="Late Arrivals"
              value={stats?.lateToday ?? 0}
              icon={Clock}
              color={STATUS_COLORS.late}
            />
            <StatCard
              label="Attendance %"
              value={`${stats?.attendancePercentage ?? 0}%`}
              icon={TrendingUp}
              color="#2d5a9e"
              sub="Of total students"
            />
          </div>

          {/* Charts row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "24px",
            }}
            className="charts-grid"
          >
            {/* Weekly trend */}
            <div className="card" style={{ padding: "20px" }}>
              <div style={{ marginBottom: "16px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>
                  Weekly Attendance Trend
                </h3>
                <p style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", margin: "2px 0 0" }}>
                  Last 7 school days
                </p>
              </div>
              {chartData.length === 0 ? (
                <div className="empty-state" style={{ padding: "40px 0" }}>
                  <Activity size={32} className="empty-state-icon" />
                  <p>No attendance data yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                    <defs>
                      <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="absentGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#dc2626" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "white",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "10px",
                        fontSize: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Area type="monotone" dataKey="present" name="Present" stroke="#0d9488" fill="url(#presentGrad)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="late" name="Late" stroke="#d97706" fill="none" strokeWidth={2} strokeDasharray="4 2" dot={false} />
                    <Area type="monotone" dataKey="absent" name="Absent" stroke="#dc2626" fill="url(#absentGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Present vs Absent pie */}
            <div className="card" style={{ padding: "20px" }}>
              <div style={{ marginBottom: "16px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>
                  Today&apos;s Distribution
                </h3>
                <p style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", margin: "2px 0 0" }}>
                  Present vs. Absent vs. Late
                </p>
              </div>
              {pieData.every((d) => d.value === 0) ? (
                <div className="empty-state" style={{ padding: "40px 0" }}>
                  <Activity size={32} className="empty-state-icon" />
                  <p>No scans today yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "10px",
                        fontSize: "12px",
                        border: "1px solid hsl(var(--border))",
                      }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => (
                        <span style={{ fontSize: "12px", color: "hsl(var(--foreground))" }}>
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Class comparison */}
          {classStats.length > 0 && (
            <div className="card" style={{ padding: "20px", marginBottom: "24px" }}>
              <div style={{ marginBottom: "16px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>
                  Class-wise Attendance Today
                </h3>
                <p style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", margin: "2px 0 0" }}>
                  Present vs. Absent by class
                </p>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={classStats} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <XAxis dataKey="className" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "10px",
                      fontSize: "12px",
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Bar dataKey="present" name="Present" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="absent" name="Absent" fill="#fca5a5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Recent activity */}
          <div className="card">
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid hsl(var(--border))",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>
                    Recent Attendance Activity
                  </h3>
                  {/* Live indicator: green when Firestore listener is active */}
                  <span
                    title={liveConnected ? "Live updates active" : "Connecting to live feed…"}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "11px",
                      color: liveConnected ? "#0d9488" : "#94a3b8",
                      fontWeight: 500,
                    }}
                  >
                    <Wifi size={11} />
                    {liveConnected ? "Live" : "…"}
                  </span>
                </div>
                <p style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", margin: "2px 0 0" }}>
                  Latest RFID scans
                </p>
              </div>
              <Link href="/attendance" className="btn btn-secondary btn-sm" style={{ gap: "4px" }}>
                View all <ChevronRight size={13} />
              </Link>
            </div>

            {recentActivity.length === 0 ? (
              <div className="empty-state">
                <Activity size={40} className="empty-state-icon" />
                <p style={{ fontWeight: 500 }}>No attendance records yet</p>
                <p style={{ fontSize: "12px" }}>
                  Connect your ESP32 device to start scanning RFID cards
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Class</th>
                      <th>Check-in Time</th>
                      <th>Status</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.map((record) => (
                      <tr key={record.attendanceId}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{record.studentName ?? record.studentId}</div>
                          {record.rollNumber && (
                            <div style={{ fontSize: "11.5px", color: "hsl(var(--muted-foreground))" }}>
                              Roll #{record.rollNumber}
                            </div>
                          )}
                        </td>
                        <td style={{ color: "hsl(var(--muted-foreground))" }}>
                          {record.className ?? record.classId}
                        </td>
                        <td style={{ fontVariantNumeric: "tabular-nums", fontSize: "12.5px" }}>
                          {new Date(record.checkInAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </td>
                        <td>
                          <AttendanceBadge status={record.status} />
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: "11.5px",
                              color: record.source === "demo" ? "#7c3aed" : "hsl(var(--muted-foreground))",
                              fontWeight: record.source === "demo" ? 600 : 400,
                            }}
                          >
                            {record.source === "demo" ? "Demo" : record.source.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        @media (max-width: 768px) {
          .charts-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
