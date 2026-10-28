"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  BarChart3,
  Bell,
  BookOpen,
  Settings,
  Wifi,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/hooks/useAuth";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  section?: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, section: "Main" },
  { label: "Students", href: "/students", icon: Users, section: "Main" },
  { label: "Attendance", href: "/attendance", icon: ClipboardCheck, section: "Main" },
  { label: "Classes", href: "/classes", icon: BookOpen, section: "Main" },
  { label: "Reports", href: "/reports", icon: BarChart3, section: "Analytics" },
  { label: "Notifications", href: "/notifications", icon: Bell, section: "Analytics" },
  { label: "Settings", href: "/settings", icon: Settings, section: "System", adminOnly: true },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { appUser } = useAuth();

  const sections = Array.from(new Set(NAV_ITEMS.map((i) => i.section)));

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={cn("sidebar", isOpen && "open")}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Wifi size={18} color="white" />
          </div>
          <div className="sidebar-logo-text">
            <h1>SmartAttend</h1>
            <p>Attendance System</p>
          </div>
          <button
            className="ml-auto md:hidden"
            onClick={onClose}
            aria-label="Close sidebar"
            style={{ color: "rgba(255,255,255,0.6)", background: "none", border: "none", cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav" aria-label="Main navigation">
          {sections.map((section) => {
            const items = NAV_ITEMS.filter(
              (i) =>
                i.section === section &&
                (!i.adminOnly || appUser?.role === "admin")
            );
            if (items.length === 0) return null;

            return (
              <div key={section}>
                <div className="nav-section-label">{section}</div>
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn("nav-item", isActive && "active")}
                      onClick={onClose}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon className="nav-icon" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div
            style={{
              fontSize: "11px",
              color: "rgba(255,255,255,0.35)",
              textAlign: "center",
            }}
          >
            SmartAttend v1.0 · ESP32 Ready
          </div>
        </div>
      </aside>
    </>
  );
}
