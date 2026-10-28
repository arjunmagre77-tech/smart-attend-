"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Wifi, Eye, EyeOff, Lock, Mail, AlertCircle, FlaskConical } from "lucide-react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { isFirebaseConfigured } from "@/lib/firebase/client";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, appUser } = useAuth();
  const router = useRouter();
  const isDemo = !isFirebaseConfigured;

  useEffect(() => {
    if (appUser) router.replace("/dashboard");
  }, [appUser, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter your email and password");
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Invalid credentials. Please try again.";
      if (msg.includes("wrong-password") || msg.includes("user-not-found")) {
        toast.error("Invalid email or password");
      } else if (msg.includes("too-many-requests")) {
        toast.error("Too many failed attempts. Try again later.");
      } else {
        toast.error("Sign in failed. Check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  }

  function fillDemo() {
    setEmail("admin@demo.school");
    setPassword("demo-password");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f1f35 0%, #1e3a5f 50%, #1a3352 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background decoration */}
      <div
        style={{
          position: "absolute",
          top: "-30%",
          right: "-15%",
          width: "600px",
          height: "600px",
          background: "radial-gradient(circle, rgba(13, 148, 136, 0.12) 0%, transparent 70%)",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-20%",
          left: "-10%",
          width: "500px",
          height: "500px",
          background: "radial-gradient(circle, rgba(45, 90, 158, 0.15) 0%, transparent 70%)",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />

      <div style={{ width: "100%", maxWidth: "400px", position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              width: "60px",
              height: "60px",
              background: "linear-gradient(135deg, #0d9488, #06b6d4)",
              borderRadius: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 8px 32px rgba(13, 148, 136, 0.3)",
            }}
          >
            <Wifi size={28} color="white" />
          </div>
          <h1
            style={{
              color: "white",
              fontSize: "26px",
              fontWeight: 700,
              margin: "0 0 6px",
              letterSpacing: "-0.03em",
            }}
          >
            SmartAttend
          </h1>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "14px", margin: 0 }}>
            RFID Attendance Management System
          </p>
        </div>

        {/* Demo mode notice */}
        {isDemo && (
          <div
            style={{
              background: "rgba(124, 58, 237, 0.15)",
              border: "1px solid rgba(124, 58, 237, 0.3)",
              borderRadius: "10px",
              padding: "12px 16px",
              marginBottom: "20px",
              display: "flex",
              gap: "10px",
              alignItems: "flex-start",
            }}
          >
            <FlaskConical size={16} style={{ color: "#c4b5fd", flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ color: "#c4b5fd", fontSize: "12.5px", margin: "0 0 4px", fontWeight: 600 }}>
                Demo Mode Active
              </p>
              <p style={{ color: "rgba(196,181,253,0.8)", fontSize: "12px", margin: 0 }}>
                Firebase is not configured. Sign in with any credentials to explore.
              </p>
              <button
                type="button"
                onClick={fillDemo}
                style={{
                  marginTop: "8px",
                  background: "rgba(124, 58, 237, 0.3)",
                  border: "none",
                  borderRadius: "6px",
                  color: "#c4b5fd",
                  fontSize: "11.5px",
                  padding: "4px 10px",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Fill demo credentials
              </button>
            </div>
          </div>
        )}

        {/* Login card */}
        <div
          style={{
            background: "rgba(255,255,255,0.97)",
            borderRadius: "16px",
            padding: "32px",
            boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
          }}
        >
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 700,
              margin: "0 0 6px",
              color: "hsl(var(--foreground))",
            }}
          >
            Sign in to your account
          </h2>
          <p style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))", margin: "0 0 24px" }}>
            Enter your credentials to access the dashboard
          </p>

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label htmlFor="login-email" className="form-label">
                Email address
              </label>
              <div style={{ position: "relative" }}>
                <Mail
                  size={15}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "hsl(var(--muted-foreground))",
                  }}
                />
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@school.edu"
                  autoComplete="email"
                  required
                  style={{ paddingLeft: "36px" }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group" style={{ marginBottom: "24px" }}>
              <label htmlFor="login-password" className="form-label">
                Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock
                  size={15}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "hsl(var(--muted-foreground))",
                  }}
                />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  style={{ paddingLeft: "36px", paddingRight: "40px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "hsl(var(--muted-foreground))",
                    display: "flex",
                    alignItems: "center",
                    padding: "4px",
                  }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: "100%", padding: "11px" }}
              id="login-submit"
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }} />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>

        <p
          style={{
            textAlign: "center",
            color: "rgba(255,255,255,0.35)",
            fontSize: "11.5px",
            marginTop: "20px",
          }}
        >
          SmartAttend © {new Date().getFullYear()} · Secure school attendance management
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  );
}
