import type { CSSProperties } from "react";

/**
 * An integer that counts up from 0 on first paint, in pure CSS (a registered
 * custom property animated into a CSS counter). Screen readers get the value.
 */
export function CountUp({ value, className }: { value: number; className?: string }) {
  return (
    <span className={className}>
      <span className="sr-only">{value}</span>
      <span aria-hidden className="count-up" style={{ "--to": value } as CSSProperties} />
    </span>
  );
}
