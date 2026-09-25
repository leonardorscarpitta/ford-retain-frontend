import type { CSSProperties, ReactNode } from "react";
import type { Tone } from "@/lib/format";

const R = 52;
const C = 2 * Math.PI * R;

/** A circular meter: track in a dim step, fill in the status tone, ticks for the HUD look. */
export function RingGauge({
  value,
  tone,
  size = 180,
  children,
  label,
}: {
  value: number; // 0-100
  tone: Tone;
  size?: number;
  children?: ReactNode;
  label: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className="ring"
      data-tone={tone}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      style={{ width: size, height: size, "--offset": C * (1 - clamped / 100), "--circ": C } as CSSProperties}
    >
      <svg viewBox="0 0 120 120" aria-hidden>
        <g className="ring-ticks">
          {Array.from({ length: 60 }, (_, i) => (
            <line
              key={i}
              x1="60"
              y1="2"
              x2="60"
              y2={i % 5 === 0 ? 7 : 5}
              transform={`rotate(${i * 6} 60 60)`}
              data-on={i / 60 < clamped / 100 || undefined}
            />
          ))}
        </g>
        <circle className="ring-track" cx="60" cy="60" r={R} />
        <circle className="ring-fill" cx="60" cy="60" r={R} strokeDasharray={C} />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}
