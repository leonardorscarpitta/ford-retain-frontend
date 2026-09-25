"use client";

import type { CSSProperties } from "react";
import { useFormStatus } from "react-dom";
import { selectVehicle } from "@/app/actions";
import type { Vehicle } from "@/lib/api";

/** Picks which of the owner's vehicles every page shows. Submits on change. */
export function VehicleSwitcher({ vehicles, current }: { vehicles: Vehicle[]; current: Vehicle }) {
  if (vehicles.length < 2) return null;
  return (
    // Keyed by VIN: React resets a form after its action, which would otherwise
    // snap the select back to the value it was first rendered with.
    <form key={current.vin} action={selectVehicle} className="switcher">
      <span className="swatch" style={{ "--paint": current.paintHex } as CSSProperties} title={current.paintName} aria-hidden />
      <label htmlFor="vehicle" className="sr-only">
        Vehicle
      </label>
      <Picker vehicles={vehicles} current={current.vin} />
      <noscript>
        <button type="submit" className="btn btn-sm">
          Switch
        </button>
      </noscript>
    </form>
  );
}

function Picker({ vehicles, current }: { vehicles: Vehicle[]; current: string }) {
  const { pending } = useFormStatus();
  return (
    <select
      id="vehicle"
      name="vin"
      defaultValue={current}
      aria-busy={pending}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    >
      {vehicles.map((v) => (
        <option key={v.vin} value={v.vin}>
          {v.model.replace(/^(\d{4}) Ford /, "$1 ")}
        </option>
      ))}
    </select>
  );
}
