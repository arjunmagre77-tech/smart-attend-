"use client";

import { useState } from "react";
import { Menu, Bell, RefreshCw, ChevronDown, LogOut, Settings, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { isFirebaseConfigured } from "@/lib/firebase/client";

interface TopNavProps {
  onMenuToggle: () => void;
  pageTitle: string;
  pageSubtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function TopNav({
  onMenuToggle,
  pageTitle,
  pageSubtitle,
  onRefresh,
  isRefreshing = false,
}: TopNavProps) {
  const { appUser, signOut } = useAuth();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);

  async function handleSignOut() {
    try {
      await signOut();
      router.push("/login");
    } catch {
      toast.error("Failed to sign out");
    }
  }

  const initials = appUser?.displayName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "U";

  return (
    <header className="topnav">
      {/* Mobile menu button */}
      <button
        className="btn btn-ghost btn-icon md:hidden"
        onClick={onMenuToggle}
        aria-label="Toggle sidebar"
        id="sidebar-toggle"
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      <div style={{ flex: 1 }}>
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 700,
            color: "hsl(var(--foreground))",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          {pageTitle}
        </h2>
        {pageSubtitle && (
          <p style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", margin: 0 }}>
            {pageSubtitle}
          </p>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {/* Refresh button */}
        {onRefresh && (
          <button
            className="btn btn-ghost btn-icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh"
            id="refresh-button"
          >
            <RefreshCw
              size={16}
              className={cn(isRefreshing && "animate-spin")}
              style={{ animation: isRefreshing ? "spin 0.6s linear infinite" : undefined }}
            />
          </button>
        )}

        {/* Demo mode pill */}
        {!isFirebaseConfigured && (
          <span
            style={{
              background: "#f3e8ff",
              color: "#7c3aed",
              fontSize: "11px",
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: "100px",
              border: "1px solid #e9d5ff",
              display: "none",
            }}
            className="demo-pill"
          >
            DEMO
          </span>
        )}

        {/* Profile dropdown */}
        <div style={{ position: "relative" }}>
          <button
            className="btn btn-ghost"
            onClick={() => setProfileOpen((v) => !v)}
            aria-expanded={profileOpen}
            aria-haspopup="true"
            id="profile-menu-button"
            style={{ padding: "6px 10px", gap: "8px" }}
          >
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #1e3a5f, #2d5a9e)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "11px",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ textAlign: "left", display: "none" }} className="profile-text">
              <div style={{ fontSize: "13px", fontWeight: 600, lineHeight: 1.2 }}>
                {appUser?.displayName ?? "User"}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "hsl(var(--muted-foreground))",
                  textTransform: "capitalize",
                }}
              >
                {appUser?.role}
              </div>
            </div>
            <ChevronDown size={14} style={{ color: "hsl(var(--muted-foreground))" }} />
          </button>

          {profileOpen && (
            <>
              <div
                style={{ position: "fixed", inset: 0, zIndex: 40 }}
                onClick={() => setProfileOpen(false)}
              />
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 8px)",
                  background: "white",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                  minWidth: "200px",
                  zIndex: 50,
                  overflow: "hidden",
                }}
              >
                {/* Profile header */}
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid hsl(var(--border))",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "13.5px" }}>
                    {appUser?.displayName}
                  </div>
                  <div
                    style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))" }}
                  >
                    {appUser?.email}
                  </div>
                  <div
                    style={{
                      marginTop: "4px",
                      display: "inline-block",
                      background: "#e8edf5",
                      color: "#1e3a5f",
                      fontSize: "10px",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "100px",
                      textTransform: "capitalize",
                    }}
                  >
                    {appUser?.role}
                  </div>
                </div>

                {/* Menu items */}
                <div style={{ padding: "6px" }}>
                  {appUser?.role === "admin" && (
                    <button
                      className="btn btn-ghost"
                      style={{ width: "100%", justifyContent: "flex-start", padding: "8px 10px" }}
                      onClick={() => {
                        router.push("/settings");
                        setProfileOpen(false);
                      }}
                    >
                      <Settings size={14} />
                      Settings
                    </button>
                  )}
                  <button
                    className="btn btn-ghost"
                    style={{
                      width: "100%",
                      justifyContent: "flex-start",
                      padding: "8px 10px",
                      color: "var(--red)",
                    }}
                    onClick={handleSignOut}
                    id="sign-out-button"
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
