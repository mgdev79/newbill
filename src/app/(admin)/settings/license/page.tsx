"use client";

import { useEffect, useState } from "react";
import { Button, PageHeader } from "@/components/ui";
import { LicenseInfoView, type LicensePayload } from "@/components/license-info-view";

export default function LicensePage() {
  const [data, setData] = useState<LicensePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [restarting, setRestarting] = useState(false);

  async function load() {
    const response = await fetch("/api/v1/license");
    const json = await response.json();
    if (!response.ok) {
      setError(json.error ?? "Gagal memuat lisensi.");
      return;
    }
    setData(json);
    setError(null);
  }

  useEffect(() => {
    void load();
  }, []);

  async function restartRadius() {
    setRestarting(true);
    setToast(null);
    const response = await fetch("/api/v1/license/restart", { method: "POST" });
    const json = await response.json();
    setRestarting(false);
    setToast(json.message ?? (json.ok ? "Restart OK." : "Gagal restart."));
    await load();
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Informasi Lisensi" breadcrumb={["Home", "Pengaturan", "Info Lisensi"]} />
        <p className="rounded-sm border border-[#ebccd1] bg-[#f2dede] px-3 py-2 text-[13px] text-[#a94442]">
          {error}
        </p>
      </div>
    );
  }

  if (!data) {
    return <p className="text-[13px] text-[var(--lte-muted)]">Memuat lisensi…</p>;
  }

  return (
    <div>
      <PageHeader
        title="Informasi Lisensi"
        description={`Lisensi panel ${data.license.tenantName} · paket ${data.license.planName}`}
        breadcrumb={["Home", "Pengaturan", "Info Lisensi"]}
      />
      {toast ? (
        <p className="mb-3 rounded-sm border border-[#d6e9c6] bg-[#dff0d8] px-3 py-2 text-[13px] text-[#3c763d]">
          {toast}
        </p>
      ) : null}
      <LicenseInfoView
        data={data}
        restarting={restarting}
        onRestart={() => void restartRadius()}
      />
    </div>
  );
}
