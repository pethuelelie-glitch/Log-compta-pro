import { cn } from "@/lib/utils";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

type LogoProps = {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
  variant?: "light" | "dark";
};

const sizes = {
  sm: { icon: 32, text: "text-sm", sub: "text-[10px]" },
  md: { icon: 40, text: "text-base", sub: "text-xs" },
  lg: { icon: 56, text: "text-xl", sub: "text-sm" },
};

export function Logo({ size = "md", showText = true, className, variant = "dark" }: LogoProps) {
  const s = sizes[size];
  const textClass = variant === "light" ? "text-white" : "text-sidebar-foreground";
  const subClass = variant === "light" ? "text-white/70" : "text-sidebar-foreground/60";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={APP_NAME}
        className="shrink-0 drop-shadow-md"
      >
        <defs>
          <linearGradient id="cvGrad1" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="60%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#5B21B6" />
          </linearGradient>
          <linearGradient id="cvGrad2" x1="0" y1="0" x2="48" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#FBBF24" />
          </linearGradient>
          <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#00000033" />
          </filter>
        </defs>

        {/* Background square with gradient */}
        <rect width="48" height="48" rx="13" fill="url(#cvGrad1)" filter="url(#softShadow)" />

        {/* Inner shine top-left */}
        <ellipse cx="14" cy="12" rx="10" ry="6" fill="white" fillOpacity="0.08" />

        {/* Bar chart — rising bars */}
        <rect x="9" y="28" width="5" height="11" rx="2" fill="white" fillOpacity="0.45" />
        <rect x="17" y="22" width="5" height="17" rx="2" fill="white" fillOpacity="0.65" />
        <rect x="25" y="16" width="5" height="23" rx="2" fill="white" fillOpacity="0.85" />

        {/* Gold trend line arrow */}
        <polyline
          points="11.5,30 19.5,22 27.5,16 36,10"
          stroke="url(#cvGrad2)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Arrow tip */}
        <polyline
          points="32,9 36,10 35,14"
          stroke="url(#cvGrad2)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Bottom badge: CV monogram */}
        <rect x="29" y="29" width="14" height="14" rx="4" fill="white" fillOpacity="0.18" />
        <text x="36" y="40" textAnchor="middle" fill="white" fontSize="8" fontWeight="700" fontFamily="system-ui">CV</text>
      </svg>

      {showText && (
        <div className="min-w-0">
          <div className={cn("font-bold leading-tight tracking-tight", s.text, textClass)}>
            {APP_NAME}
          </div>
          <div className={cn("leading-tight truncate", s.sub, subClass)}>
            {APP_TAGLINE.split(" ").slice(0, 4).join(" ")}
          </div>
        </div>
      )}
    </div>
  );
}
