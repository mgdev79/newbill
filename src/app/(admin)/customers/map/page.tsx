"use client";

import { useEffect, useState } from "react";
import { PageHeader, Panel, StatusPill } from "@/components/ui";

type Odp = { id: string; name: string };
type Customer = { id: string; name: string; status: string; kind: string; odp: string };

export default function Page() {
  const [odps, setOdps] = useState<Odp[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    void Promise.all([
      fetch("/api/v1/odps").then((r) => r.json()),
      fetch("/api/v1/customers?kind=ppp").then((r) => r.json()),
    ]).then(([odpData, custData]) => {
      setOdps(odpData.rows ?? []);
      setCustomers(custData.rows ?? []);
    });
  }, []);

  return (
    <div>
      <PageHeader
        title="Peta pelanggan"
        description="Posisi skematik dari pelanggan PPP + ODP di database. Google Maps menyusul jika API key diisi."
      />
      <Panel className="relative h-[480px] overflow-hidden bg-slate-50">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:32px_32px]" />
        {odps.map((odp, index) => (
          <div
            key={odp.id}
            className="absolute rounded-md bg-slate-900 px-2 py-1 text-[11px] text-white"
            style={{ left: `${18 + (index % 4) * 22}%`, top: `${28 + Math.floor(index / 4) * 14}%` }}
          >
            {odp.name}
          </div>
        ))}
        {customers.map((row, index) => (
          <div
            key={row.id}
            className="absolute flex flex-col items-start"
            style={{ left: `${12 + (index % 5) * 16}%`, top: `${18 + Math.floor(index / 5) * 20}%` }}
          >
            <span className="size-2.5 rounded-full bg-teal-600" />
            <span className="mt-1 rounded bg-white/90 px-1 text-[10px] text-slate-700">
              {row.name}
            </span>
          </div>
        ))}
      </Panel>
      <Panel className="mt-4">
        <p className="mb-2 text-sm font-medium">Status di peta</p>
        <div className="flex flex-wrap gap-2">
          {customers.map((row) => (
            <span key={row.id} className="flex items-center gap-2 text-xs">
              {row.name} <StatusPill status={row.status} />
            </span>
          ))}
        </div>
      </Panel>
    </div>
  );
}
