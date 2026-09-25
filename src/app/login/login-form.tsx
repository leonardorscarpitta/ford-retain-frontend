"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={formAction} className="schedule-form">
      <input type="hidden" name="next" value={next} />
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" className="input" autoComplete="username" required defaultValue={state.email} autoFocus />
      </label>
      <label className="field">
        <span>Password</span>
        <input name="password" type="password" className="input" autoComplete="current-password" required />
      </label>
      <button type="submit" className="btn" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p aria-live="polite" className="form-msg" data-tone="critical">
        {state.error}
      </p>
    </form>
  );
}
