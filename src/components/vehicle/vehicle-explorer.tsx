"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import type { VehicleComponent, Zone } from "@/lib/api";
import { toneLabel, toneOfStatus, worstStatus, zoneLabel, zoneOrder, type Tone } from "@/lib/format";
import { ArrowIcon, ToneIcon, WrenchIcon } from "../icons";
import styles from "./vehicle-explorer.module.css";

// three.js needs the browser; load the scene on the client only.
const TruckScene = dynamic(() => import("./truck-scene"), {
  ssr: false,
  loading: () => <div className={`skeleton ${styles.loading}`} />,
});

const hint: Record<Zone, string> = {
  "engine-bay": "Hood open",
  "front-wheel": "Front wheels steered",
  "rear-wheel": "Rear wheels spinning",
  underbody: "Body lifted off the chassis",
  cabin: "Doors open",
};

/** Interactive 3D truck: click a part (or a zone chip) to open it and see its components. */
export function VehicleExplorer({ components }: { components: VehicleComponent[] }) {
  const [selected, setSelected] = useState<Zone | null>(null);
  const reducedMotion = useReducedMotion();

  const zones = zoneOrder
    .map((zone) => {
      const items = components.filter((c) => c.zone === zone);
      return { zone, items, tone: toneOfStatus[worstStatus(items)] as Tone };
    })
    .filter((z) => z.items.length > 0);
  const tones = Object.fromEntries(zones.map((z) => [z.zone, z.tone])) as Partial<Record<Zone, Tone>>;
  const active = zones.find((z) => z.zone === selected);

  return (
    <div className={styles.explorer}>
      <div className={styles.stage}>
        <TruckScene selected={selected} onSelect={setSelected} tones={tones} reducedMotion={reducedMotion} />
        <p className={styles.hint}>Drag to rotate · click a part to open it</p>

        {active && (
          <aside className={styles.detail} data-tone={active.tone} aria-live="polite">
            <header>
              <div>
                <p className="eyebrow">{hint[active.zone]}</p>
                <h3>{zoneLabel[active.zone]}</h3>
              </div>
              <button type="button" className={styles.close} onClick={() => setSelected(null)} aria-label="Close details">
                ×
              </button>
            </header>
            <ul>
              {active.items.map((c, i) => {
                const tone = toneOfStatus[c.status];
                return (
                  <li key={c.name} data-tone={tone}>
                    <ToneIcon tone={tone} size={15} className={styles.icon} />
                    <span className={styles.name}>
                      {c.name}
                      <small>{toneLabel[tone]}</small>
                    </span>
                    <span className="bar" style={{ "--v": c.health, "--i": i } as CSSProperties}>
                      <i />
                    </span>
                    <span className={styles.value}>{c.health}%</span>
                  </li>
                );
              })}
            </ul>
            {active.items.some((c) => c.status !== "good") && (
              <Link href={`/schedule?service=${encodeURIComponent(`${zoneLabel[active.zone]} service`)}`} className="btn btn-sm">
                <WrenchIcon size={14} /> Book a fix <ArrowIcon size={14} />
              </Link>
            )}
          </aside>
        )}
      </div>

      <div className={styles.chips} role="group" aria-label="Vehicle zones">
        {zones.map(({ zone, items, tone }) => {
          const flagged = items.filter((c) => c.status !== "good").length;
          return (
            <button
              key={zone}
              type="button"
              className="chip chip-button"
              data-tone={tone}
              aria-pressed={selected === zone}
              onClick={() => setSelected(selected === zone ? null : zone)}
            >
              <i className="dot" />
              {zoneLabel[zone]}
              <b>{flagged ? `${flagged} flagged` : "OK"}</b>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}
