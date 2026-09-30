import { useId } from "react";

export function MissionControlMark({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const gradientId = useId().replace(/:/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="11" y1="9" x2="54" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C5CFF" />
          <stop offset="0.52" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#22C55E" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="18" fill="url(#${gradientId})" />
      <path
        d="M18 40.5V23.5L27.1 34L32 27.7L36.9 34L46 23.5V40.5"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="16" r="3" fill="white" fillOpacity=".92" />
      <path d="M14 47.5C22.4 53.3 41.6 53.3 50 47.5" stroke="white" strokeOpacity=".42" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export default function MissionControlLogo({
  compact = false,
  size = 40,
}: {
  compact?: boolean;
  size?: number;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <MissionControlMark size={size} className="shrink-0 drop-shadow-[0_10px_22px_rgba(59,130,246,0.26)]" />
      {!compact && (
        <div className="min-w-0">
          <div className="truncate text-[14px] font-extrabold tracking-[-0.03em]">Mission Control</div>
          <div className="truncate text-[9.5px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/40">
            Focus · Grow · Ship
          </div>
        </div>
      )}
    </div>
  );
}
