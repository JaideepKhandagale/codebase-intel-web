"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

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

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Invalid email or password")
      setLoading(false)
      return
    }

    router.push("/")
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#0a0a0a",
      fontFamily: "sans-serif",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "420px",
        padding: "2rem",
        backgroundColor: "#111",
        borderRadius: "12px",
        border: "1px solid #222",
      }}>
        {/* Logo */}
        <h1 style={{ color: "#fff", fontSize: "20px", fontWeight: 600, marginBottom: "8px" }}>
          Codebase.intel
        </h1>
        <p style={{ color: "#666", fontSize: "14px", marginBottom: "24px" }}>
          {tab === "login" ? "Welcome back" : "Create your account"}
        </p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
          {["login", "signup"].map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t as "login" | "signup"); setError("") }}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "8px",
                border: "1px solid",
                borderColor: tab === t ? "#4f46e5" : "#222",
                backgroundColor: tab === t ? "#4f46e518" : "transparent",
                color: tab === t ? "#818cf8" : "#666",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              {t === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>

        {/* OAuth buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          <button
            onClick={() => signIn("github", { callbackUrl: "/" })}
            style={{
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid #222",
              backgroundColor: "#161b22",
              color: "#fff",
              cursor: "pointer",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            Continue with GitHub
          </button>
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            style={{
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid #222",
              backgroundColor: "#1a1a1a",
              color: "#fff",
              cursor: "pointer",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            Continue with Google
          </button>
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#222" }} />
          <span style={{ color: "#444", fontSize: "12px" }}>or</span>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#222" }} />
        </div>

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {tab === "signup" && (
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #222",
                backgroundColor: "#1a1a1a",
                color: "#fff",
                fontSize: "14px",
                outline: "none",
              }}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #222",
              backgroundColor: "#1a1a1a",
              color: "#fff",
              fontSize: "14px",
              outline: "none",
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #222",
              backgroundColor: "#1a1a1a",
              color: "#fff",
              fontSize: "14px",
              outline: "none",
            }}
          />

          {error && (
            <p style={{ color: "#f87171", fontSize: "13px", margin: 0 }}>{error}</p>
          )}

          <button
            onClick={handleCredentials}
            disabled={loading}
            style={{
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#4f46e5",
              color: "#fff",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: 500,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Please wait..." : tab === "login" ? "Log in" : "Sign up"}
          </button>
        </div>
      </div>
    </div>
  )
}
