"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { PageHeader, Panel, StatCard, StatusPill } from "@/components/ui";
import { formatDate, formatIdr } from "@/lib/utils";

type Dashboard = {
  kpis: { incomeToday: number; unpaidCount: number; pppOnline: number; hotspotOnline: number };
  host: { uptime: string; ramTotalMb: number; ramFreeMb: number; diskFreeGb: number | null };
  summary: {
    hotspotUsers: number;
    pppoeUsers: number;
    vpnUsers: number;
    vouchers: number;
    vcCreatedToday: number;
    vcLoginToday: number;
    expVoucher: number;
    expCustomer: number;
  };
  serviceHealth: { name: string; status: string; detail?: string }[];
  unpaid: {
    id: string;
    number: string;
    customerCode: string;
    name: string;
    plan: string;
    amount: number;
    dueAt: string;
    owner: string;
    status: string;
  }[];
  nas: {
    id: string;
    name: string;
    ip: string;
    apiPort: number;
    timezone: string;
    healthy: boolean;
  }[];
};

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);

  useEffect(() => {
    void fetch("/api/v1/dashboard")
      .then((r) => r.json())
      .then((json: Dashboard) => setData(json));
  }, []);

  if (!data) {
    return <p className="text-[13px] text-[var(--lte-muted)]">Memuat dashboard…</p>;
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Ringkasan operasional dari database."
        breadcrumb={["Home", "Dashboard"]}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone="green" label="Income hari ini" value={formatIdr(data.kpis.incomeToday)} />
        <StatCard tone="yellow" label="Tagihan terbuka" value={data.kpis.unpaidCount} />
        <StatCard tone="aqua" label="PPP online" value={data.kpis.pppOnline} />
        <StatCard tone="red" label="Hotspot online" value={data.kpis.hotspotOnline} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <HostBox label="Uptime" value={data.host.uptime} />
        <HostBox label="RAM total" value={`${data.host.ramTotalMb} MB`} />
        <HostBox label="RAM bebas" value={`${data.host.ramFreeMb} MB`} />
        <HostBox
          label="Disk bebas"
          value={data.host.diskFreeGb != null ? `${data.host.diskFreeGb} GB` : "—"}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Panel title="Ringkasan">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Mini label="Hotspot user" value={data.summary.hotspotUsers} />
            <Mini label="PPPoE user" value={data.summary.pppoeUsers} />
            <Mini label="VPN user" value={data.summary.vpnUsers} />
            <Mini label="Total voucher" value={data.summary.vouchers} />
            <Mini label="VC dibuat hari ini" value={data.summary.vcCreatedToday} />
            <Mini label="VC login hari ini" value={data.summary.vcLoginToday} />
            <Mini label="Voucher expired" value={data.summary.expVoucher} />
            <Mini label="Pelanggan expired" value={data.summary.expCustomer} />
          </div>
        </Panel>
        <Panel title="Informasi layanan">
          <ul className="space-y-2">
            {data.serviceHealth.map((item) => (
              <li
                key={item.name}
                className="flex items-center justify-between border-b border-[#f4f4f4] pb-2 text-[13px] last:border-0 last:pb-0"
              >
                <span>
                  {item.name}
                  {item.detail ? (
                    <span className="ml-1 text-[11px] text-[var(--lte-muted)]">({item.detail})</span>
                  ) : null}
                </span>
                <StatusPill status={item.status} />
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel className="mt-4" title="Tagihan belum lunas">
        <DataTable
          headers={["Invoice", "ID pelanggan", "Nama", "Paket", "Jumlah", "Jatuh tempo", "Owner", "Status"]}
          rows={data.unpaid.map((row) => [
            row.number,
            row.customerCode,
            row.name,
            row.plan,
            formatIdr(row.amount),
            formatDate(row.dueAt),
            row.owner,
            <StatusPill key={row.id} status={row.status} />,
          ])}
        />
      </Panel>

      <Panel className="mt-4" title="Router NAS">
        <DataTable
          headers={["Nama", "IP", "Port API", "Timezone", "Status"]}
          rows={data.nas.map((row) => [
            row.name,
            row.ip,
            String(row.apiPort),
            row.timezone,
            <StatusPill key={row.id} status={row.healthy ? "ok" : "warn"} />,
          ])}
        />
      </Panel>
    </div>
  );
}

function HostBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-[var(--lte-line)] bg-white px-3 py-2.5 shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
      <p className="text-[11px] text-[var(--lte-muted)] uppercase">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-[#444]">{value}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm border border-[#eee] bg-[#fafafa] px-3 py-2">
      <p className="text-[11px] text-[var(--lte-muted)]">{label}</p>
      <p className="text-lg font-bold text-[#444]">{value}</p>
    </div>
  );
}
