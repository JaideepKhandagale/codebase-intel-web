import CILogo from "./CILogo";
import { theme } from "../lib/theme";

export function HealthGauge({ label, score }) {
  const color = score >= 80 ? theme.green : score >= 60 ? theme.yellow : theme.red;
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width="68" height="68" viewBox="0 0 68 68">
        <circle cx="34" cy="34" r={radius} fill="none" stroke={theme.border} strokeWidth="5" />
        <circle
          cx="34"
          cy="34"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={`${dash} ${circumference}`}
          strokeDashoffset={circumference / 4}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
        <text x="34" y="38" textAnchor="middle" fill={color} fontSize="14" fontWeight="700" fontFamily="monospace">
          {score}
        </text>
      </svg>
      <span style={{ fontSize: 10, color: theme.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", textAlign: "center" }}>{label}</span>
    </div>
  );
}

export function LogLine({ entry, idx }) {
  const config = {
    info: { icon: "o", color: theme.textMuted },
    search: { icon: "?", color: theme.blue },
    success: { icon: "+", color: theme.green },
    error: { icon: "x", color: theme.red },
    system: { icon: "*", color: theme.purple },
  };
  const { icon, color } = config[entry.type] || config.info;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "6px 0", borderBottom: `1px solid ${theme.border}18`, animation: "slideIn 0.25s ease both", animationDelay: `${idx * 0.04}s`, opacity: 0 }}>
      <span style={{ color, fontSize: 12, fontFamily: "'Geist Mono',monospace", flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <span style={{ fontSize: 12, color, fontFamily: "'Geist Mono',monospace", flex: 1, lineHeight: 1.5 }}>{entry.text}</span>
      <span style={{ fontSize: 10, color: theme.textDim, fontFamily: "'Geist Mono',monospace", flexShrink: 0 }}>{entry.time}</span>
    </div>
  );
}

export function ImpBadge({ level }) {
  const config = {
    critical: { bg: theme.redBg, color: theme.red, border: "#6e1313" },
    high: { bg: "#2d1b00", color: theme.orange, border: "#6e3a00" },
    medium: { bg: "#2d2000", color: theme.yellow, border: "#6e5200" },
    low: { bg: theme.surface, color: theme.textMuted, border: theme.border },
  };
  const styles = config[level] || config.low;
  return (
    <span style={{ background: styles.bg, color: styles.color, border: `1px solid ${styles.border}`, borderRadius: 20, padding: "2px 10px", fontSize: 10, fontFamily: "'Geist Mono',monospace", fontWeight: 700, flexShrink: 0 }}>
      {(level || "").toUpperCase()}
    </span>
  );
}

export function TypeBadge({ type }) {
  const config = {
    frontend: { bg: theme.blueBg, color: theme.blue, border: theme.blueBorder },
    backend: { bg: theme.greenBg, color: theme.green, border: theme.greenBorder },
    test: { bg: "#2d1b00", color: theme.orange, border: "#6e3a00" },
    config: { bg: theme.purpleBg, color: theme.purple, border: theme.purpleBorder },
    docs: { bg: "#2d2000", color: theme.yellow, border: "#6e5200" },
    other: { bg: theme.surface, color: theme.textMuted, border: theme.border },
  };
  const styles = config[type] || config.other;
  return (
    <span style={{ background: styles.bg, color: styles.color, border: `1px solid ${styles.border}`, borderRadius: 4, padding: "0 6px", fontSize: 10, fontWeight: 600, fontFamily: "'Geist Mono',monospace", flexShrink: 0 }}>
      {type || "other"}
    </span>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div style={{ minHeight: 300, display: "grid", placeItems: "center" }}>
      <div style={{ maxWidth: 440, textAlign: "center", padding: 24 }}>
        <div style={{ margin: "0 auto 16px", width: 52, height: 52, borderRadius: 16, display: "grid", placeItems: "center", background: `linear-gradient(135deg, ${theme.greenBg}, ${theme.blueBg})`, border: `1px solid ${theme.border}` }}>
          <CILogo size={24} />
        </div>
        <div style={{ color: theme.text, fontSize: 20, fontWeight: 700, marginBottom: 10 }}>{title}</div>
        <div style={{ color: theme.textMuted, fontSize: 14, lineHeight: 1.7, marginBottom: action ? 18 : 0 }}>{description}</div>
        {action}
      </div>
    </div>
  );
}

export function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {eyebrow ? <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: theme.textDim, marginBottom: 6 }}>{eyebrow}</div> : null}
      {title ? <div style={{ color: theme.text, fontSize: 20, fontWeight: 700, marginBottom: subtitle ? 6 : 0 }}>{title}</div> : null}
      {subtitle ? <div style={{ color: theme.textMuted, fontSize: 13, lineHeight: 1.6 }}>{subtitle}</div> : null}
    </div>
  );
}
