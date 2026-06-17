interface TennaHubLogoProps {
  width?: number | string;
  height?: number | string;
  className?: string;
  variant?: "full" | "icon" | "wordmark";
}

export function TennaHubLogo({ width = 220, height = 72, className, variant = "wordmark" }: TennaHubLogoProps) {
  if (variant === "icon") {
    return (
      <svg viewBox="0 0 40 40" width={width} height={height} className={className} fill="none">
        <rect width="40" height="40" rx="8" fill="#005bc4"/>
        <text x="20" y="28" textAnchor="middle" fontFamily="Montserrat,Inter,Arial,sans-serif" fontWeight="800" fontSize="20" fill="white">T</text>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 680 220"
      width={width}
      height={height}
      className={className}
      role="img"
      aria-label="TennaHub Technologies"
    >
      <g transform="translate(340,110)">
        <rect x="-178" y="-52" width="7" height="80" rx="3.5" fill="#005bc4" />
        <text
          x="-158" y="8"
          fontFamily="'Montserrat','Inter','Helvetica Neue',Arial,sans-serif"
          fontWeight="800" fontSize="58"
          fill="#1a2a3a"
          textAnchor="start"
          letterSpacing="-1"
        >TENNA</text>
        <text
          x="10" y="8"
          fontFamily="'Montserrat','Inter','Helvetica Neue',Arial,sans-serif"
          fontWeight="800" fontSize="58"
          fill="#005bc4"
          textAnchor="start"
          letterSpacing="-1"
        >HUB</text>
        {variant !== "wordmark" && (
          <>
            <rect x="-158" y="20" width="338" height="2" rx="1" fill="#c8d4e0" />
            <text
              x="-158" y="50"
              fontFamily="'Montserrat','Inter','Helvetica Neue',Arial,sans-serif"
              fontWeight="300" fontSize="13"
              fill="#6a80a0"
              textAnchor="start"
              letterSpacing="9"
            >TECHNOLOGIES</text>
          </>
        )}
      </g>
    </svg>
  );
}
