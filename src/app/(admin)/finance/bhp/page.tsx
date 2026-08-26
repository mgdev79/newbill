"use client";

import { useEffect, useState } from "react";
import { PageHeader, Panel, StatCard } from "@/components/ui";
import { formatIdr } from "@/lib/utils";

export default function Page() {
  const year = new Date().getFullYear();
  const [omzet, setOmzet] = useState(0);
  const [bhp, setBhp] = useState(0);
  const [uso, setUso] = useState(0);
  const [disclaimer, setDisclaimer] = useState("");

  useEffect(() => {
    void fetch(`/api/v1/finance/summary?year=${year}`)
      .then((r) => r.json())
      .then((data: { omzet?: number; bhpEstimate?: number; usoEstimate?: number; disclaimer?: string }) => {
        setOmzet(data.omzet ?? 0);
        setBhp(data.bhpEstimate ?? 0);
        setUso(data.usoEstimate ?? 0);
        setDisclaimer(data.disclaimer ?? "");
      });
  }, [year]);

  return (
    <div>
      <PageHeader
        title="Hitung BHP | USO"
        description="Estimasi kewajiban berdasarkan omzet invoice lunas. Bukan kalkulator resmi Kominfo."
      />
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard tone="slate" label={`Omzet ${year}`} value={formatIdr(omzet)} />
        <StatCard tone="amber" label="BHP (estimasi 0.5%)" value={formatIdr(bhp)} />
        <StatCard tone="sky" label="USO (estimasi 1.25%)" value={formatIdr(uso)} />
      </div>
      <Panel className="mt-4">
        <p className="text-sm text-slate-600">
          {disclaimer ||
            "Angka di halaman ini hanya estimasi dari omzet invoice lunas. Rumus resmi harus dikonfirmasi ke aturan yang berlaku."}
        </p>
      </Panel>
    </div>
  );
}
