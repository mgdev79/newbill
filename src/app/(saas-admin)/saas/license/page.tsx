"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui";
import { LicenseInfoView, type LicensePayload } from "@/components/license-info-view";

type Billing = {
  code: string;
  tenant: { id: string; code: string; name: string; email: string } | null;
};

export default function SaasLicensePage() {
  const [data, setData] = useState<LicensePayload | null>(null);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [restarting, setRestarting] = useState(false);

  async function load() {
    const [licenseRes, billingRes] = await Promise.all([
      fetch("/api/v1/license"),
      fetch("/api/v1/saas/billing-tenant"),
    ]);
    const licenseJson = await licenseRes.json();
    const billingJson = await billingRes.json();
    if (!licenseRes.ok) {
      setError(licenseJson.error ?? "Gagal memuat lisensi.");
      return;
    }
    setData(licenseJson);
    setBilling(billingJson);
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

  return (
    <div>
      <PageHeader
        title="Informasi Lisensi"
        description="Pratinjau setara Mixradius /rad-licence/details untuk tenant yang terhubung ke panel billing."
        breadcrumb={["SaaS", "Info Lisensi"]}
      />
      {toast ? (
        <p className="mb-3 rounded-sm border border-[#d6e9c6] bg-[#dff0d8] px-3 py-2 text-[13px] text-[#3c763d]">
          {toast}
        </p>
      ) : null}
      {error ? (
        <p className="mb-3 rounded-sm border border-[#ebccd1] bg-[#f2dede] px-3 py-2 text-[13px] text-[#a94442]">
          {error}
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2 text-[13px]">
        {billing?.tenant ? (
          <>
            <span className="rounded-sm bg-[#00a65a] px-2 py-0.5 text-[11px] font-semibold text-white">
              Tenant billing: {billing.tenant.name} ({billing.tenant.code})
            </span>
            <Link
              href={`/saas/tenants/${billing.tenant.id}`}
              className="text-[var(--lte-blue)] hover:underline"
            >
              Ubah nilai lisensi →
            </Link>
          </>
        ) : (
          <Link href="/saas/tenants" className="text-[var(--lte-blue)] hover:underline">
            Pilih tenant billing di daftar tenant →
          </Link>
        )}
        <Link href="/settings/license" className="text-[var(--lte-muted)] hover:underline" target="_blank">
          Buka tampilan operator →
        </Link>
      </div>

      {!data ? (
        <p className="text-[13px] text-[var(--lte-muted)]">Memuat lisensi…</p>
      ) : (
        <LicenseInfoView
          data={data}
          revealSecrets
          restarting={restarting}
          onRestart={() => void restartRadius()}
        />
      )}
    </div>
  );
}
