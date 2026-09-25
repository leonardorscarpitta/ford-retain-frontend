import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import styles from "./login.module.css";

export const metadata: Metadata = { title: "Sign in · Ford Retain" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, expired } = await searchParams;
  return (
    <div className={styles.wrap}>
      <h1>Sign in</h1>
      <p className="muted">Your vehicles, alerts and service bookings.</p>
      {expired && <p className={styles.notice}>Your session ended. Please sign in again.</p>}
      <LoginForm next={typeof next === "string" ? next : "/"} />
      {process.env.NODE_ENV !== "production" && (
        <p className={styles.demo}>
          Demo accounts: <code>ana@example.com</code> (two F-150s) or <code>bruno@example.com</code> (Ranger Raptor).
          Password <code>ford-retain-demo</code>.
        </p>
      )}
    </div>
  );
}
