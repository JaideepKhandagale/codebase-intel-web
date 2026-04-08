"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import CILogo from "@/components/CILogo"
import styles from "./auth.module.css"

export default function AuthPage() {
  const router = useRouter()
  const [tab, setTab] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleCredentials() {
    setLoading(true)
    setError("")

    if (tab === "signup") {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Something went wrong")
        setLoading(false)
        return
      }
    }

    const result = await signIn("credentials", { email, password, redirect: false })

    if (result?.error) {
      setError("Invalid email or password")
      setLoading(false)
      return
    }

    router.push("/")
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#000000",
        display: "flex",
        fontFamily: "'Inter', 'SF Pro Display', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          width: "800px",
          height: "800px",
          borderRadius: "50%",
          top: "-300px",
          left: "-200px",
          background: "radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 65%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          bottom: "-200px",
          right: "200px",
          background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 65%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        className={styles.leftPanel}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div className={styles.circuitBackdrop} />
        <div className={styles.traceLayer} />
        <div className={styles.meshLayer} />

        <div className={styles.content}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "70px" }}>
            <CILogo size={32} />
            <span style={{ fontSize: "17px", fontWeight: 600, color: "#fff" }}>Codebase.intel</span>
            <span
              style={{
                fontSize: "10px",
                padding: "2px 7px",
                borderRadius: "99px",
                background: "rgba(6,182,212,0.15)",
                color: "#06b6d4",
                border: "1px solid rgba(6,182,212,0.25)",
                fontWeight: 500,
              }}
            >
              v10
            </span>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              borderRadius: "99px",
              marginBottom: "28px",
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.25)",
              width: "fit-content",
            }}
          >
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e" }} />
            <span style={{ fontSize: "11px", color: "#22c55e", fontWeight: 600, letterSpacing: "0.08em" }}>
              AI-POWERED CODEBASE INTELLIGENCE
            </span>
          </div>

          <h1
            style={{
              fontSize: "46px",
              fontWeight: 800,
              lineHeight: 1.02,
              color: "#fff",
              marginBottom: "20px",
              maxWidth: "560px",
              letterSpacing: "-0.04em",
            }}
          >
            Understand any{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #ec4899 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              codebase
            </span>{" "}
            instantly
          </h1>

          <p
            style={{
              fontSize: "16px",
              color: "#6b7280",
              lineHeight: 1.7,
              maxWidth: "400px",
              marginBottom: "48px",
            }}
          >
            Analyze public GitHub repos, cache reports, ask cited questions, trace flows, explain files, and
            share with one link.
          </p>

          {[
            "Analyze any public GitHub repo",
            "Ask questions about the codebase",
            "Share analysis with a single link",
          ].map((feature) => (
            <div
              key={feature}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: "rgba(6,182,212,0.15)",
                  border: "1px solid rgba(6,182,212,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  color: "#06b6d4",
                }}
              >
                ✓
              </div>
              <span style={{ fontSize: "14px", color: "#9ca3af" }}>{feature}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        className={styles.rightPanel}
        style={{
          width: "460px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div className={styles.sideGlow} />
        <div
          className={styles.authCard}
          style={{
            width: "100%",
            borderRadius: "16px",
            background: "linear-gradient(180deg, rgba(14,18,30,0.86), rgba(8,11,20,0.88))",
            border: "1px solid rgba(148,163,184,0.12)",
            padding: "32px",
          }}
        >
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#fff", marginBottom: "4px" }}>
            {tab === "login" ? "Welcome back" : "Create account"}
          </h2>
          <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "24px" }}>
            {tab === "login" ? "Sign in to your account to continue" : "Start analyzing repos for free"}
          </p>

          <div
            style={{
              display: "flex",
              gap: "4px",
              marginBottom: "24px",
              background: "rgba(255,255,255,0.04)",
              borderRadius: "8px",
              padding: "3px",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {["login", "signup"].map((currentTab) => (
              <button
                key={currentTab}
                onClick={() => {
                  setTab(currentTab as "login" | "signup")
                  setError("")
                }}
                style={{
                  flex: 1,
                  padding: "7px",
                  borderRadius: "6px",
                  border: "none",
                  background: tab === currentTab ? "rgba(6,182,212,0.15)" : "transparent",
                  color: tab === currentTab ? "#06b6d4" : "#6b7280",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 500,
                  transition: "all 0.2s",
                }}
              >
                {currentTab === "login" ? "Log in" : "Sign up"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
            <button
              onClick={() => signIn("github", { callbackUrl: "/" })}
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                color: "#d1d5db",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
              onMouseOver={(event) => (event.currentTarget.style.background = "rgba(255,255,255,0.08)")}
              onMouseOut={(event) => (event.currentTarget.style.background = "rgba(255,255,255,0.04)")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
              Continue with GitHub
            </button>

            <button
              onClick={() => signIn("google", { callbackUrl: "/" })}
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                color: "#d1d5db",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
              onMouseOver={(event) => (event.currentTarget.style.background = "rgba(255,255,255,0.08)")}
              onMouseOut={(event) => (event.currentTarget.style.background = "rgba(255,255,255,0.04)")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
            <span style={{ color: "#4b5563", fontSize: "11px" }}>or continue with email</span>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {tab === "signup" && (
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#f9fafb",
                  fontSize: "13px",
                  outline: "none",
                }}
                onFocus={(event) => (event.target.style.borderColor = "rgba(6,182,212,0.4)")}
                onBlur={(event) => (event.target.style.borderColor = "rgba(255,255,255,0.08)")}
              />
            )}

            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                color: "#f9fafb",
                fontSize: "13px",
                outline: "none",
              }}
              onFocus={(event) => (event.target.style.borderColor = "rgba(6,182,212,0.4)")}
              onBlur={(event) => (event.target.style.borderColor = "rgba(255,255,255,0.08)")}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                color: "#f9fafb",
                fontSize: "13px",
                outline: "none",
              }}
              onFocus={(event) => (event.target.style.borderColor = "rgba(6,182,212,0.4)")}
              onBlur={(event) => (event.target.style.borderColor = "rgba(255,255,255,0.08)")}
            />

            {error && (
              <div
                style={{
                  padding: "9px 12px",
                  borderRadius: "7px",
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#fca5a5",
                  fontSize: "12px",
                }}
              >
                {error}
              </div>
            )}

            <button
              onClick={handleCredentials}
              disabled={loading}
              style={{
                padding: "11px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, #06b6d4, #8b5cf6)",
                color: "#fff",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "13px",
                fontWeight: 600,
                marginTop: "4px",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Please wait..." : tab === "login" ? "Sign in" : "Create account"}
            </button>
          </div>

          <p style={{ textAlign: "center", fontSize: "11px", color: "#4b5563", marginTop: "16px" }}>
            By continuing you agree to our <span style={{ color: "#06b6d4", cursor: "pointer" }}>Terms of Service</span>
          </p>
        </div>
      </div>
    </div>
  )
}
