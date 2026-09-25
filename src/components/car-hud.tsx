import type { VehicleComponent, Zone } from "@/lib/api";
import { toneLabel, toneOfStatus, worstStatus, zoneLabel, zoneOrder } from "@/lib/format";

// Where each zone's hotspot sits on the truck drawing (viewBox 0 0 600 240).
const hotspot: Record<Zone, { x: number; y: number }> = {
  "engine-bay": { x: 110, y: 126 },
  "front-wheel": { x: 140, y: 188 },
  "rear-wheel": { x: 460, y: 188 },
  underbody: { x: 300, y: 172 },
  cabin: { x: 290, y: 88 },
};

/** Side view of a pickup with a glowing hotspot per zone, colored by its worst component. */
export function CarHud({ components }: { components: VehicleComponent[] }) {
  const zones = zoneOrder
    .map((zone) => {
      const items = components.filter((c) => c.zone === zone);
      return { zone, items, tone: toneOfStatus[worstStatus(items)] };
    })
    .filter((z) => z.items.length > 0);

  return (
    <figure className="car-hud">
      <svg viewBox="0 0 600 240" role="img" aria-label="Vehicle diagram with component health by zone">
        <defs>
          <linearGradient id="car-stroke" x1="0" x2="1">
            <stop offset="0" stopColor="var(--accent-2)" />
            <stop offset="0.5" stopColor="var(--accent)" />
            <stop offset="1" stopColor="var(--accent-3)" />
          </linearGradient>
          <linearGradient id="car-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.18" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="scan" x1="0" x2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0" />
            <stop offset="0.5" stopColor="var(--accent)" stopOpacity="0.5" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="car-clip">
            <path d="M40,170 L40,140 Q42,120 70,115 L190,106 L250,60 L360,58 L388,104 L560,104 L565,170 Z" />
          </clipPath>
        </defs>

        <ellipse cx="300" cy="226" rx="270" ry="10" className="car-shadow" />
        <line x1="10" x2="590" y1="226" y2="226" className="car-ground" />

        <g filter="url(#glow)">
          <path
            className="car-body"
            d="M40,170 L40,140 Q42,120 70,115 L190,106 L250,60 L360,58 L388,104 L560,104 L565,170 L505,170 A45,45 0 0 0 415,170 L185,170 A45,45 0 0 0 95,170 Z"
            pathLength={1}
          />
          <path className="car-line" d="M200,106 L253,68 L300,68 L300,106 Z" />
          <path className="car-line" d="M310,106 L310,68 L352,68 L375,104 Z" />
          <path className="car-line" d="M305,112 L305,168 M388,104 L388,168 M60,150 L180,146" />
          <rect className="car-light" x="42" y="124" width="16" height="8" rx="3" />
          <rect className="car-tail" x="556" y="114" width="7" height="18" rx="2" />
          {[140, 460].map((cx) => (
            <g key={cx} className="car-wheel">
              <circle cx={cx} cy="188" r="36" />
              <circle cx={cx} cy="188" r="20" />
              <circle cx={cx} cy="188" r="4" />
            </g>
          ))}
        </g>

        <g clipPath="url(#car-clip)">
          <rect className="car-scan" x="-80" y="40" width="80" height="140" fill="url(#scan)" />
        </g>

        {zones.map(({ zone, tone }) => {
          const { x, y } = hotspot[zone];
          return (
            <g key={zone} className="hotspot" data-tone={tone}>
              <circle cx={x} cy={y} r="18" className="hotspot-pulse" />
              <circle cx={x} cy={y} r="7" className="hotspot-core" />
              <title>{`${zoneLabel[zone]}: ${toneLabel[tone]}`}</title>
            </g>
          );
        })}
      </svg>

      <figcaption className="car-legend">
        {zones.map(({ zone, items, tone }) => {
          const flagged = items.filter((c) => c.status !== "good").length;
          return (
            <span key={zone} className="chip" data-tone={tone}>
              <i className="dot" />
              {zoneLabel[zone]}
              <b>{flagged ? `${flagged} flagged` : "OK"}</b>
            </span>
          );
        })}
      </figcaption>
    </figure>
  );
}
