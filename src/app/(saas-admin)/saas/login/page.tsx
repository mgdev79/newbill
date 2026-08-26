"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, inputClass } from "@/components/ui";

export default function SaasLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("saas");
  const [password, setPassword] = useState("saas123");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/v1/saas/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "Login gagal");
      return;
    }
    router.push("/saas");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-indigo-950 px-4">
      <form
        onSubmit={(e) => void submit(e)}
        className="w-full max-w-sm rounded-xl border border-indigo-800 bg-white p-6"
      >
        <p className="text-xs tracking-[0.2em] text-indigo-600 uppercase">Platform</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">Newbill SaaS</h1>
        <p className="mt-1 text-sm text-slate-500">Login admin platform (bukan panel billing).</p>
        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
        <div className="mt-5 grid gap-3">
          <Field label="Username">
            <input
              className={inputClass}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Field>
          <Field label="Password">
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        </div>
        <Button type="submit" className="mt-5 w-full bg-indigo-600 hover:bg-indigo-700" disabled={busy}>
          {busy ? "Masuk…" : "Masuk Admin SaaS"}
        </Button>
        <p className="mt-3 text-center text-xs text-slate-400">Demo: saas / saas123</p>
        <div className="mt-4 flex justify-center gap-3 text-xs">
          <Link href="/client/login" className="text-indigo-700 hover:underline">
            Client tenant
          </Link>
          <Link href="/login" className="text-indigo-700 hover:underline">
            Billing operator
          </Link>
        </div>
      </form>
    </div>
  );
}
