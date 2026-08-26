"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClientShell } from "@/components/client-shell";
import { Button, Panel, StatusPill } from "@/components/ui";

type Vpn = {
  id: string;
  label: string;
  username: string;
  password: string;
  type: string;
  serverHost: string;
  serverName: string;
  region: string;
  online: boolean;
  innerRadiusIp: string;
  enabled: boolean;
};

type Me = {
  tenant: { name: string; plan: { vpnQuota: number } };
  vpnAccounts: Vpn[];
};

export default function ClientVpnPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/v1/client/me")
      .then(async (r) => {
        if (r.status === 401) {
          router.replace("/client/login");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) setMe(data);
      });
  }, [router]);

  async function copy(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    window.setTimeout(() => setCopied(null), 1200);
  }

  if (!me) return <p className="p-6 text-sm text-slate-500">Memuat…</p>;

  return (
    <ClientShell tenantName={me.tenant.name}>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">VPN Account</h1>
      <p className="mb-4 text-sm text-slate-500">
        Akun tunnel RADIUS ({me.vpnAccounts.length}/{me.tenant.plan.vpnQuota}). Dipakai di Script
        Generator → VPN Script pada panel operator.
      </p>
      <div className="space-y-3">
        {me.vpnAccounts.map((row) => (
          <Panel key={row.id}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-slate-900">{row.label}</p>
              <StatusPill status={row.enabled && row.online ? "ok" : "warn"} />
            </div>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-500">Username</dt>
                <dd className="font-mono">{row.username}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Password</dt>
                <dd className="font-mono">{row.password}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Server</dt>
                <dd>
                  {row.serverHost}{" "}
                  <span className="text-slate-500">
                    ({row.region}
                    {row.online ? " · online" : " · offline"})
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Type / Inner RADIUS</dt>
                <dd>
                  {row.type.toUpperCase()} · {row.innerRadiusIp || "—"}
                </dd>
              </div>
            </dl>
            <div className="mt-3 flex gap-2">
              <Button
                variant="secondary"
                onClick={() =>
                  void copy(
                    `${row.username}\n${row.password}\n${row.serverHost}\n${row.innerRadiusIp}`,
                    row.id,
                  )
                }
              >
                {copied === row.id ? "Tersalin" : "Copy kredensial"}
              </Button>
            </div>
          </Panel>
        ))}
        {!me.vpnAccounts.length ? (
          <Panel>
            <p className="text-sm text-slate-500">
              Belum ada akun VPN. Minta admin SaaS provision di menu Tenant.
            </p>
          </Panel>
        ) : null}
      </div>
    </ClientShell>
  );
}
