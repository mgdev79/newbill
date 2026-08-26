"use client";

import { useState } from "react";
import { Button, Field, PageHeader, Panel, StatusPill, inputClass } from "@/components/ui";

type Result = {
  accept: boolean;
  reason?: string;
  kind?: string;
  reply?: Record<string, string>;
};

export default function Page() {
  const [username, setUsername] = useState("budi.s");
  const [password, setPassword] = useState("radius123");
  const [mac, setMac] = useState("4C:5E:0C:11:22:33");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  async function testAuth() {
    setBusy(true);
    const response = await fetch("/api/radius/authorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        nasIp: "10.10.10.1",
        callingStationId: mac,
      }),
    });
    setResult((await response.json()) as Result);
    setBusy(false);
  }

  return (
    <div>
      <PageHeader
        title="Tes RADIUS"
        description="Authorize ke engine AAA Newbill. Secret UDP: testing123, port 1812/1813."
      />
      <Panel>
        <div className="grid max-w-lg gap-3">
          <Field label="Username">
            <input value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Password">
            <input value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
          </Field>
          <Field label="MAC (Calling-Station-Id)">
            <input value={mac} onChange={(e) => setMac(e.target.value)} className={inputClass} />
          </Field>
          <Button disabled={busy} onClick={() => void testAuth()}>
            Access-Request
          </Button>
        </div>
        {result ? (
          <div className="mt-4 space-y-2 text-sm">
            <StatusPill status={result.accept ? "accept" : "reject"} />
            {result.reason ? <p>Alasan: {result.reason}</p> : null}
            {result.reply ? (
              <pre className="overflow-x-auto rounded-md bg-slate-50 p-3 text-xs">
                {JSON.stringify(result.reply, null, 2)}
              </pre>
            ) : null}
          </div>
        ) : null}
        <p className="mt-4 text-xs text-slate-500">
          Akun uji: budi.s / agus.w (accept), siti.a (isolir 64k), dewi.l (reject
          disabled), rudi.h (reject pending). Password semua: radius123. Voucher:
          ARIY-8K2P. MAC budi.s harus 4C:5E:0C:11:22:33 (sudah diisi default).
        </p>
      </Panel>
    </div>
  );
}
