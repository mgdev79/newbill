"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClientShell } from "@/components/client-shell";
import { Panel } from "@/components/ui";
import { formatIdr, formatDate } from "@/lib/utils";

type Me = {
  tenant: {
    name: string;
    status: string;
    expiresAt: string | null;
    plan: { name: string; priceMonth: number; code: string };
  };
};

export default function ClientBillingPage() {
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

  if (!me) return <p className="p-6 text-sm text-slate-500">Memuat…</p>;

  return (
    <ClientShell tenantName={me.tenant.name}>
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Billing</h1>
      <Panel>
        <p className="text-sm">
          Paket: <strong>{me.tenant.plan.name}</strong> ({me.tenant.plan.code})
        </p>
        <p className="mt-1 text-sm">Biaya: {formatIdr(me.tenant.plan.priceMonth)} / bulan</p>
        <p className="mt-1 text-sm">Status: {me.tenant.status}</p>
        <p className="mt-1 text-sm">
          Berlaku hingga:{" "}
          {me.tenant.expiresAt ? formatDate(me.tenant.expiresAt) : "Tidak terbatas (demo)"}
        </p>
        <p className="mt-3 text-xs text-slate-500">
          Pembayaran gateway SaaS belum dihubungkan — ini ringkasan langganan tenant.
        </p>
      </Panel>
    </ClientShell>
  );
}
