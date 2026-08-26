"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Calendar,
  CheckCircle2,
  Cog,
  CreditCard,
  Database,
  HardDrive,
  Mail,
  RefreshCw,
  Router,
  Users,
} from "lucide-react";
import { Button, PageHeader, Panel } from "@/components/ui";

type LicensePayload = {
  license: {
    email: string;
    activatedAt: string;
    requestId: string;
    hardwareId: string;
    softwareKey: string;
    expiresAt: string | null;
    tenantName: string;
    planName: string;
  };
  display: {
    requestId: string;
    hardwareId: string;
    softwareKey: string;
  };
  services: {
    coreRadius: { status: string; label: string };
    mikrotik: { used: number; quota: number; maxLabel: string };
    session: { used: number; quota: number; maxLabel: string };
    pelanggan: { used: number; quota: number; maxLabel: string };
    voucher: { used: number; quota: number; maxLabel: string };
  };
};

function formatActivation(iso: string) {
  const d = new Date(iso);
  const mon = d.toLocaleString("en-US", { month: "short" });
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  const time = d.toLocaleTimeString("en-GB", { hour12: false });
  return `${mon}/${day}/${year} ${time}`;
}

function formatDue(iso: string | null) {
  if (!iso) return "Tidak terbatas";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function pct(used: number, quota: number) {
  if (!quota) return 0;
  return Math.min(100, Math.round((used / quota) * 100));
}

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

  const { license, display, services } = data;

  return (
    <div>
      <PageHeader
        title="Informasi Lisensi"
        description={`Lisensi panel ${license.tenantName} · paket ${license.planName}`}
        breadcrumb={["Home", "Pengaturan", "Info Lisensi"]}
      />
      {toast ? (
        <p className="mb-3 rounded-sm border border-[#d6e9c6] bg-[#dff0d8] px-3 py-2 text-[13px] text-[#3c763d]">
          {toast}
        </p>
      ) : null}

      <Panel title="Informasi Lisensi">
        <LicenseRow
          icon={<Mail className="size-4" />}
          label="Email Terdaftar"
          value={license.email}
        />
        <LicenseRow
          icon={<Calendar className="size-4" />}
          label="Tanggal Aktivasi"
          value={formatActivation(license.activatedAt)}
          zebra
        />
        <LicenseRow
          icon={<Cog className="size-4" />}
          label="Request ID"
          value={display.requestId}
        />
        <LicenseRow
          icon={<HardDrive className="size-4" />}
          label="Hardware ID"
          value={display.hardwareId}
          zebra
        />
        <LicenseRow
          icon={<CreditCard className="size-4" />}
          label="Software Key"
          value={display.softwareKey}
        />
      </Panel>

      <Panel className="mt-4" title="Informasi Layanan">
        <ServiceRow
          icon={<Database className="size-4" />}
          label="CORE RADIUS"
          right={
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-sm bg-[#00a65a] px-2 py-0.5 text-[11px] font-semibold text-white">
                <CheckCircle2 className="size-3.5" />
                {services.coreRadius.label}
              </span>
              <Button
                variant="secondary"
                disabled={restarting}
                onClick={() => void restartRadius()}
              >
                <RefreshCw className={`mr-1 size-3.5 ${restarting ? "animate-spin" : ""}`} />
                {restarting ? "Restart…" : "RESTART"}
              </Button>
            </div>
          }
        />
        <QuotaRow
          icon={<Router className="size-4" />}
          label="MIKROTIK"
          used={services.mikrotik.used}
          quota={services.mikrotik.quota}
          detail={`${services.mikrotik.used} Router | ${services.mikrotik.quota} Quota`}
          maxLabel={services.mikrotik.maxLabel}
          tone="blue"
          zebra
        />
        <QuotaRow
          icon={<Database className="size-4" />}
          label="SESSION"
          used={services.session.used}
          quota={services.session.quota}
          detail={`${services.session.used} Online | ${services.session.quota} Quota`}
          maxLabel={services.session.maxLabel}
          tone="green"
        />
        <QuotaRow
          icon={<Users className="size-4" />}
          label="PELANGGAN"
          used={services.pelanggan.used}
          quota={services.pelanggan.quota}
          detail={`${services.pelanggan.used} / ${services.pelanggan.quota} Quota`}
          maxLabel={services.pelanggan.maxLabel}
          tone="green"
          zebra
        />
        <QuotaRow
          icon={<CreditCard className="size-4" />}
          label="VOUCHER"
          used={services.voucher.used}
          quota={services.voucher.quota}
          detail={`${services.voucher.used} Quota`}
          maxLabel={services.voucher.maxLabel}
          tone="green"
        />
        <ServiceRow
          icon={<Calendar className="size-4" />}
          label="JATUH TEMPO"
          zebra
          right={
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00a65a] px-3 py-1 text-[12px] font-semibold text-white">
              <Calendar className="size-3.5" />
              {formatDue(license.expiresAt)}
            </span>
          }
        />
      </Panel>
    </div>
  );
}

function LicenseRow({
  icon,
  label,
  value,
  zebra,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  zebra?: boolean;
}) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 border-b border-[#eee] px-1 py-2.5 text-[13px] last:border-0 ${
        zebra ? "bg-[#f9f9f9]" : "bg-white"
      }`}
    >
      <div className="flex items-center gap-2 text-[#555]">
        <span className="text-[var(--lte-muted)]">{icon}</span>
        <span className="font-medium uppercase tracking-wide text-[11px] text-[var(--lte-muted)]">
          {label}
        </span>
      </div>
      <p className="font-mono text-[12px] text-[#333]">{value}</p>
    </div>
  );
}

function ServiceRow({
  icon,
  label,
  right,
  zebra,
}: {
  icon: ReactNode;
  label: string;
  right: ReactNode;
  zebra?: boolean;
}) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 border-b border-[#eee] px-1 py-3 last:border-0 ${
        zebra ? "bg-[#f9f9f9]" : "bg-white"
      }`}
    >
      <div className="flex items-center gap-2 text-[#555]">
        <span className="text-[var(--lte-muted)]">{icon}</span>
        <span className="text-[12px] font-semibold tracking-wide uppercase">{label}</span>
      </div>
      {right}
    </div>
  );
}

function QuotaRow({
  icon,
  label,
  used,
  quota,
  detail,
  maxLabel,
  tone,
  zebra,
}: {
  icon: ReactNode;
  label: string;
  used: number;
  quota: number;
  detail: string;
  maxLabel: string;
  tone: "blue" | "green";
  zebra?: boolean;
}) {
  const bar = tone === "blue" ? "bg-[#3c8dbc]" : "bg-[#00a65a]";
  return (
    <div
      className={`border-b border-[#eee] px-1 py-3 last:border-0 ${
        zebra ? "bg-[#f9f9f9]" : "bg-white"
      }`}
    >
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[#555]">
          <span className="text-[var(--lte-muted)]">{icon}</span>
          <span className="text-[12px] font-semibold tracking-wide uppercase">{label}</span>
        </div>
        <div className="text-right">
          <p className="text-[12px] font-medium text-[#444]">{detail}</p>
          <p className="text-[11px] text-[var(--lte-muted)]">{maxLabel}</p>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-sm bg-[#e5e5e5]">
        <div className={`h-full ${bar}`} style={{ width: `${pct(used, quota)}%` }} />
      </div>
    </div>
  );
}
