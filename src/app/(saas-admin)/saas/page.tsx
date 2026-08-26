"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader, Panel, StatCard, StatusPill } from "@/components/ui";
import { formatIdr } from "@/lib/utils";

type Overview = {
  kpis: {
    tenants: number;
    active: number;
    suspended: number;
    vpnServers: number;
    vpnAccounts: number;
    plans: number;
  };
  recent: Array<{
    id: string;
    code: string;
    name: string;
    email: string;
    status: string;
    plan: { name: string; priceMonth: number };
  }>;
};

export default function SaasOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    void fetch("/api/v1/saas/overview")
      .then((r) => r.json())
      .then(setData);
  }, []);

  return (
    <div>
      <PageHeader
        title="Ringkasan platform"
        description="Admin SaaS terpisah dari panel billing. Kelola tenant, VPN Radius, dan paket."
        actions={
          <div className="flex gap-3 text-sm">
            <Link href="/client/login" className="text-indigo-700 hover:underline">
              Client area →
            </Link>
            <Link href="/login" className="text-slate-600 hover:underline">
              Billing →
            </Link>
          </div>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tenant" value={data?.kpis.tenants ?? "…"} tone="slate" />
        <StatCard label="Aktif" value={data?.kpis.active ?? "…"} tone="teal" />
        <StatCard label="VPN server" value={data?.kpis.vpnServers ?? "…"} tone="sky" />
        <StatCard label="Akun VPN" value={data?.kpis.vpnAccounts ?? "…"} tone="amber" />
      </div>
      <Panel>
        <p className="mb-3 text-sm font-medium text-slate-800">Tenant terbaru</p>
        <div className="space-y-2">
          {(data?.recent ?? []).map((row) => (
            <Link
              key={row.id}
              href={`/saas/tenants/${row.id}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 px-3 py-2 text-sm hover:bg-slate-50"
            >
              <span>
                <span className="font-medium text-slate-900">{row.name}</span>
                <span className="ml-2 text-slate-500">
                  {row.code} · {row.email}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  {row.plan.name} · {formatIdr(row.plan.priceMonth)}/bln
                </span>
                <StatusPill status={row.status === "active" ? "ok" : "warn"} />
              </span>
            </Link>
          ))}
          {!data?.recent?.length ? (
            <p className="text-sm text-slate-500">Belum ada tenant. Tambah dari menu Tenant.</p>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
