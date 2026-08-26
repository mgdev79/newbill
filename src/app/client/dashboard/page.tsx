"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClientShell } from "@/components/client-shell";
import { Panel, StatCard, StatusPill } from "@/components/ui";
import { formatIdr } from "@/lib/utils";

type Me = {
  tenant: {
    name: string;
    code: string;
    status: string;
    billingUrl: string;
    plan: {
      name: string;
      priceMonth: number;
      vpnQuota: number;
      routerLimit: number;
      customerLimit: number;
    };
    expiresAt: string | null;
  };
  vpnAccounts: unknown[];
};

export default function ClientDashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

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

  if (!me) return <p className="p-6 text-sm text-slate-500">Memuat client area…</p>;

  return (
    <ClientShell tenantName={me.tenant.name}>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">Dashboard</h1>
      <p className="mb-4 text-sm text-slate-500">
        Tenant {me.tenant.code} · paket {me.tenant.plan.name}
      </p>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Status" value={me.tenant.status} tone="teal" />
        <StatCard label="Kuota VPN" value={`${me.vpnAccounts.length}/${me.tenant.plan.vpnQuota}`} />
        <StatCard label="Biaya/bln" value={formatIdr(me.tenant.plan.priceMonth)} tone="sky" />
      </div>
      <Panel>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <StatusPill status={me.tenant.status === "active" ? "ok" : "warn"} />
          <span>Batas router: {me.tenant.plan.routerLimit}</span>
          <span>·</span>
          <span>Batas pelanggan: {me.tenant.plan.customerLimit}</span>
        </div>
        {me.tenant.billingUrl ? (
          <p className="mt-3 text-sm">
            Instance billing:{" "}
            <a href={me.tenant.billingUrl} className="text-teal-800 hover:underline" target="_blank" rel="noreferrer">
              {me.tenant.billingUrl}
            </a>
          </p>
        ) : (
          <p className="mt-3 text-sm text-slate-500">URL billing belum diisi admin SaaS.</p>
        )}
        <p className="mt-2 text-xs text-slate-500">
          Tab VPN Account menampilkan kredensial tunnel ke server RADIUS Newbill (bukan VPN remote Winbox).
        </p>
      </Panel>
    </ClientShell>
  );
}
