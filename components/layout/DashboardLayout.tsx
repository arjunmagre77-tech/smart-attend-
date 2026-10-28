"use client";

import { useState, ReactNode } from "react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { FlaskConical } from "lucide-react";

function DashboardContent({
  children,
  pageTitle,
  pageSubtitle,
  onRefresh,
  isRefreshing,
}: {
  children: ReactNode;
  pageTitle: string;
  pageSubtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { appUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !appUser && isFirebaseConfigured) {
      router.replace("/login");
    }
  }, [loading, appUser, router]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: "12px",
          color: "hsl(var(--muted-foreground))",
        }}
      >
        <div className="spinner" />
        <span style={{ fontSize: "14px" }}>Loading SmartAttend…</span>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="main-content">
        {/* Demo mode banner */}
        {!isFirebaseConfigured && (
          <div className="demo-banner">
            <FlaskConical size={14} />
            <strong>Demo Mode</strong> — Firebase is not configured. Data is simulated and not
            persisted. See{" "}
            <code
              style={{
                background: "rgba(255,255,255,0.2)",
                padding: "1px 6px",
                borderRadius: "4px",
                fontSize: "11px",
              }}
            >
              .env.example
            </code>{" "}
            to set up Firebase.
          </div>
        )}

        <TopNav
          onMenuToggle={() => setSidebarOpen((v) => !v)}
          pageTitle={pageTitle}
          pageSubtitle={pageSubtitle}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />

        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
  pageTitle,
  pageSubtitle,
  onRefresh,
  isRefreshing,
}: {
  children: ReactNode;
  pageTitle: string;
  pageSubtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  return (
    <AuthProvider>
      <DashboardContent
        pageTitle={pageTitle}
        pageSubtitle={pageSubtitle}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
      >
        {children}
      </DashboardContent>
    </AuthProvider>
  );
}
