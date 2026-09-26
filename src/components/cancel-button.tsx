"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { cancelAppointment } from "@/app/actions";

/** Two-step cancel: the first click arms it, the second submits. */
export function CancelButton({ id }: { id: string }) {
  const [armed, setArmed] = useState(false);
  return (
    <form action={cancelAppointment} className="cancel-form" onMouseLeave={() => setArmed(false)}>
      <input type="hidden" name="id" value={id} />
      {armed ? (
        <Confirm onBack={() => setArmed(false)} />
      ) : (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setArmed(true)}>
          Cancel
        </button>
      )}
    </form>
  );
}

function Confirm({ onBack }: { onBack: () => void }) {
  const { pending } = useFormStatus();
  return (
    <>
      <button type="submit" className="btn btn-sm btn-danger" disabled={pending} autoFocus>
        {pending ? "Cancelling…" : "Confirm cancel"}
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onBack} disabled={pending}>
        Keep
      </button>
    </>
  );
}
