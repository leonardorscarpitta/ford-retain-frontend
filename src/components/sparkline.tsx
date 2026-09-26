/** A small trend line. Each point has a hover target with its value. */
export function Sparkline({
  values,
  labels,
  width = 220,
  height = 56,
  unit = "",
}: {
  values: number[];
  labels: string[];
  width?: number;
  height?: number;
  unit?: string;
}) {
  if (values.length < 2) return null;
  const pad = 6;
  const min = Math.min(...values) - 2;
  const max = Math.max(...values) + 2;
  const x = (i: number) => pad + (i * (width - pad * 2)) / (values.length - 1);
  const y = (v: number) => pad + ((max - v) * (height - pad * 2)) / (max - min);
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(values.length - 1)},${height} L${x(0)},${height} Z`;
  const last = values.length - 1;

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} width="100%" role="img"
      aria-label={`Trend from ${values[0]}${unit} to ${values[last]}${unit}`}>
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.1" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-fill)" />
      <path d={line} className="sparkline-line" pathLength={1} />
      <circle cx={x(last)} cy={y(values[last])} r="4" className="sparkline-dot" />
      {values.map((v, i) => (
        <g key={i} className="sparkline-hit">
          <rect x={x(i) - (width / values.length) / 2} y="0" width={width / values.length} height={height} />
          <circle cx={x(i)} cy={y(v)} r="3" />
          <title>{`${labels[i]}: ${v}${unit}`}</title>
        </g>
      ))}
    </svg>
  );
}
