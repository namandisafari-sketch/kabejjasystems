import type { CSSProperties } from "react";

export const CARD_WIDTH = 340;
export const CARD_HEIGHT = 215;
export const CARD_RADIUS = 10;

interface CardFrameProps {
  children: React.ReactNode;
  gradient?: string;
  borderColor?: string;
  pattern?: 'guilloche' | 'hexagons' | 'waves';
  style?: CSSProperties;
}

export function GuillochePattern({ opacity = 0.04 }: { opacity?: number }) {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 340 215"
      preserveAspectRatio="none"
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', opacity }}
    >
      <defs>
        <pattern id="guilloche" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse">
          <path d="M0 20 Q15 0 30 20 Q45 40 60 20" fill="none" stroke="#1e3a5f" strokeWidth="0.3" />
          <path d="M0 10 Q15 -10 30 10 Q45 30 60 10" fill="none" stroke="#1e3a5f" strokeWidth="0.15" />
          <path d="M0 30 Q15 10 30 30 Q45 50 60 30" fill="none" stroke="#1e3a5f" strokeWidth="0.15" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#guilloche)" />
    </svg>
  );
}

export function HexagonPattern({ opacity = 0.03 }: { opacity?: number }) {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 340 215"
      preserveAspectRatio="none"
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', opacity }}
    >
      <defs>
        <pattern id="hexagons" width="28" height="48.5" patternUnits="userSpaceOnUse" patternTransform="scale(0.8)">
          <path d="M14 0 L28 8 L28 24 L14 32 L0 24 L0 8 Z" fill="none" stroke="#1e3a5f" strokeWidth="0.4" />
          <path d="M14 48.5 L28 40.5 L28 24.5 L14 16.5 L0 24.5 L0 40.5 Z" fill="none" stroke="#1e3a5f" strokeWidth="0.4" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hexagons)" />
    </svg>
  );
}

export function WavePattern({ opacity = 0.035 }: { opacity?: number }) {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 340 215"
      preserveAspectRatio="none"
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', opacity }}
    >
      <defs>
        <pattern id="waves" x="0" y="0" width="80" height="20" patternUnits="userSpaceOnUse">
          <path d="M0 10 C10 0 20 20 30 10 S50 0 60 10 S70 20 80 10" fill="none" stroke="#1e3a5f" strokeWidth="0.25" />
          <path d="M0 18 C10 8 20 28 30 18 S50 8 60 18 S70 28 80 18" fill="none" stroke="#1e3a5f" strokeWidth="0.15" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#waves)" />
    </svg>
  );
}

export function MicroTextLine({ text, color = '#1e3a5f' }: { text: string; color?: string }) {
  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '12px',
      background: `repeating-linear-gradient(90deg, ${color}22 0px, ${color}22 1px, transparent 1px, transparent 2px)`,
      borderTop: `1px solid ${color}33`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '5px',
      letterSpacing: '2px',
      color: `${color}55`,
      fontWeight: 500,
      textTransform: 'uppercase',
      fontFamily: 'monospace',
    }}>
      {text.repeat(10)}
    </div>
  );
}

export function HologramSeal({ size = 32 }: { size?: number }) {
  return (
    <div style={{
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      background: 'conic-gradient(from 0deg, #C5A55A, #e8d48b, #C5A55A, #f0e6b0, #C5A55A, #d4b86a, #C5A55A, #e8d48b, #C5A55A)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      flexShrink: 0,
      boxShadow: 'inset 0 0 6px rgba(0,0,0,0.15), 0 0 3px rgba(197,165,90,0.3)',
    }}>
      <div style={{
        width: '60%',
        height: '60%',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)',
      }} />
    </div>
  );
}

export function SecurityBorder({ color = '#1e3a5f' }: { color?: string }) {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 340 215"
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
    >
      <rect
        x="3" y="3" width="334" height="209"
        rx="8" ry="8"
        fill="none"
        stroke={color}
        strokeWidth="0.5"
        strokeDasharray="2 3"
        opacity={0.3}
      />
      <rect
        x="5" y="5" width="330" height="205"
        rx="6" ry="6"
        fill="none"
        stroke={color}
        strokeWidth="0.3"
        opacity={0.15}
      />
    </svg>
  );
}

export function GhostStamp({ text, color = '#1e3a5f' }: { text: string; color?: string }) {
  return (
    <div style={{
      position: 'absolute',
      bottom: '30px',
      right: '12px',
      fontSize: '7px',
      fontWeight: 800,
      color: `${color}15`,
      letterSpacing: '3px',
      textTransform: 'uppercase',
      transform: 'rotate(-15deg)',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      userSelect: 'none',
    }}>
      {text}
    </div>
  );
}

export function CardHeaderBand({ color = '#1e3a5f', height = 5 }: { color?: string; height?: number }) {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: `${height}px`,
      background: `linear-gradient(90deg, ${color}, ${color}dd 50%, ${color})`,
      borderRadius: `${CARD_RADIUS}px ${CARD_RADIUS}px 0 0`,
    }} />
  );
}

export function MagneticStripe() {
  return (
    <div style={{
      height: '28px',
      background: 'linear-gradient(180deg, #1a1a1a 0%, #2a2a2a 30%, #1a1a1a 60%, #222 100%)',
      borderRadius: '4px',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 10px',
    }}>
      <div style={{
        height: '2px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 20%, transparent 40%, rgba(255,255,255,0.05) 60%, transparent 80%)',
        width: '100%',
        backgroundSize: '40px 2px',
      }} />
    </div>
  );
}

export function SignaturePanel({ name, color = '#1e3a5f' }: { name: string; color?: string }) {
  return (
    <div style={{
      border: `1px solid ${color}33`,
      borderRadius: '4px',
      padding: '4px 8px',
      background: '#fafafa',
      minHeight: '24px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    }}>
      <div style={{
        fontFamily: 'cursive, serif',
        fontSize: '11px',
        color: '#1e3a5f',
        fontStyle: 'italic',
        opacity: 0.6,
        letterSpacing: '1px',
      }}>
        {name}
      </div>
      <div style={{
        fontSize: '5px',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginTop: '1px',
      }}>
        Authorized Signature
      </div>
    </div>
  );
}
