export default function CILogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id="ci-logo-gradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3fb950" />
          <stop offset="100%" stopColor="#58a6ff" />
        </linearGradient>
      </defs>
      <path d="M20 2 L35 11 L35 29 L20 38 L5 29 L5 11 Z" stroke="url(#ci-logo-gradient)" strokeWidth="1.5" fill="none" />
      <path d="M13 16 L17 16 L19 20 L21 20 L23 16 L27 16" stroke="#3fb950" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M13 24 L17 24 L19 20" stroke="#58a6ff" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M27 24 L23 24 L21 20" stroke="#58a6ff" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="13" cy="16" r="1.5" fill="#3fb950" />
      <circle cx="13" cy="24" r="1.5" fill="#58a6ff" />
      <circle cx="27" cy="16" r="1.5" fill="#3fb950" />
      <circle cx="27" cy="24" r="1.5" fill="#58a6ff" />
      <circle cx="20" cy="20" r="2" fill="url(#ci-logo-gradient)" />
    </svg>
  );
}
