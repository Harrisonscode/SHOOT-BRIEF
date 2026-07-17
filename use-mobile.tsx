export function ApertureIcon({ className = "h-5 w-5", color }: { className?: string; color?: string }) {
  const c = color ?? "currentColor";
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="28" stroke={c} strokeWidth="4" />
      <g stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M32 8 L40 28 L20 28 Z" />
        <path d="M56 32 L36 40 L36 20 Z" />
        <path d="M32 56 L24 36 L44 36 Z" />
        <path d="M8 32 L28 24 L28 44 Z" />
      </g>
      <circle cx="32" cy="32" r="6" fill={c} />
    </svg>
  );
}

export function Logo({ className = "", iconClassName = "h-6 w-6", textClassName = "" }: { className?: string; iconClassName?: string; textClassName?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-primary"><ApertureIcon className={iconClassName} /></span>
      <span className={`font-semibold tracking-tight ${textClassName}`}>Shoot Brief</span>
    </div>
  );
}
