"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Lock, User } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/v1/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "Login gagal");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div
        className="absolute inset-0 bg-cover bg-center grayscale"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1477959858617-67f85b3b74c3?auto=format&fit=crop&w=1920&q=80')",
        }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-black/40" aria-hidden />

      <form
        className="relative z-10 w-full max-w-[380px] rounded-md bg-white px-8 py-8 shadow-xl"
        onSubmit={(e) => void submit(e)}
      >
        <div className="text-center">
          <p className="text-2xl font-bold tracking-tight text-[#222]">
            <span className="text-[var(--lte-blue)]">NEW</span>BILL
          </p>
          <p className="mt-1 text-[11px] font-semibold tracking-[0.12em] text-[#666] uppercase">
            Hotspot · PPP billing system
          </p>
          <p className="mt-4 text-sm text-[#666]">Login to Radius Manager</p>
        </div>

        {error ? (
          <p className="mt-4 rounded-sm border border-[#ebccd1] bg-[#f2dede] px-3 py-2 text-[13px] text-[#a94442]">
            {error}
          </p>
        ) : null}

        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="text-xs text-[#999]">Username</span>
            <div className="mt-1 flex items-center gap-2 border-b border-[#ddd] pb-1.5">
              <User className="size-4 text-[#aaa]" />
              <input
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Type your username"
                className="h-8 w-full border-0 bg-transparent text-sm outline-none"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-xs text-[#999]">Password</span>
            <div className="mt-1 flex items-center gap-2 border-b border-[#ddd] pb-1.5">
              <Lock className="size-4 text-[#aaa]" />
              <input
                name="password"
                autoComplete="current-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Type your password"
                className="h-8 w-full border-0 bg-transparent text-sm outline-none"
              />
              <button
                type="button"
                className="text-[#aaa] hover:text-[#666]"
                aria-label={showPassword ? "Sembunyikan" : "Tampilkan"}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </label>
          <label className="flex items-center gap-2 text-xs text-[#666]">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
            />
            Show Password
          </label>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-[#0e7490] to-[#3c8dbc] text-sm font-semibold tracking-wide text-white uppercase disabled:opacity-70"
        >
          {busy ? "Masuk…" : "Sign In"}
        </button>

        <p className="mt-4 text-center text-[11px] text-[#999]">
          Staff panel ·{" "}
          <Link href="/gate" className="text-[var(--lte-blue)] hover:underline">
            Semua portal
          </Link>
        </p>
      </form>

      <p className="relative z-10 mt-8 text-center text-[11px] text-white/80">
        Copyright {new Date().getFullYear()} © Newbill Manager
      </p>
    </div>
  );
}
