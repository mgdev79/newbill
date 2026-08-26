"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, inputClass } from "@/components/ui";

export default function ClientLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("tenant@ariyana.local");
  const [password, setPassword] = useState("tenant123");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/v1/client/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "Login gagal");
      return;
    }
    router.push("/client/dashboard");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, #0f766e55, transparent 50%), radial-gradient(ellipse at 80% 80%, #1e3a8a55, transparent 45%)",
        }}
      />
      <form
        onSubmit={(e) => void submit(e)}
        className="relative w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6"
      >
        <p className="text-xs tracking-[0.2em] text-teal-700 uppercase">Client Area</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">Newbill</h1>
        <p className="mt-1 text-sm text-slate-500">Login to Client Area</p>
        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
        <div className="mt-5 grid gap-3">
          <Field label="Email">
            <input
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="type your email"
            />
          </Field>
          <Field label="Password">
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="type your password"
            />
          </Field>
        </div>
        <Button type="submit" className="mt-5 w-full" disabled={busy}>
          {busy ? "Masuk…" : "Sign In"}
        </Button>
        <p className="mt-3 text-center text-xs text-slate-400">
          Demo: tenant@ariyana.local / tenant123
        </p>
      </form>
    </div>
  );
}
