import { DataTable } from "@/components/data-table";
import { PageHeader, Panel, StatCard, StatusPill } from "@/components/ui";
import {
  dashboardKpis,
  hostStats,
  invoices,
  nasList,
  serviceHealth,
  summaryCounts,
} from "@/lib/mock-data";
import { formatDate, formatIdr } from "@/lib/utils";

export default function DashboardPage() {
  const unpaid = invoices.filter((row) => row.status === "unpaid");

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Ringkasan operasional hari ini."
        breadcrumb={["Home", "Dashboard"]}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          tone="green"
          label="Income hari ini"
          value={formatIdr(dashboardKpis.incomeToday)}
        />
        <StatCard tone="yellow" label="Tagihan terbuka" value={dashboardKpis.unpaidCount} />
        <StatCard tone="aqua" label="PPP online" value={dashboardKpis.pppOnline} />
        <StatCard tone="red" label="Hotspot online" value={dashboardKpis.hotspotOnline} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <HostBox label="Uptime" value={hostStats.uptime} />
        <HostBox label="RAM total" value={`${hostStats.ramTotalMb} MB`} />
        <HostBox label="RAM bebas" value={`${hostStats.ramFreeMb} MB`} />
        <HostBox label="Disk bebas" value={`${hostStats.diskFreeGb} GB`} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Panel title="Ringkasan">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Mini label="Hotspot user" value={summaryCounts.hotspotUsers} />
            <Mini label="PPPoE user" value={summaryCounts.pppoeUsers} />
            <Mini label="VPN user" value={summaryCounts.vpnUsers} />
            <Mini label="Total voucher" value={summaryCounts.vouchers} />
            <Mini label="VC dibuat hari ini" value={summaryCounts.vcCreatedToday} />
            <Mini label="VC login hari ini" value={summaryCounts.vcLoginToday} />
            <Mini label="Voucher expired" value={summaryCounts.expVoucher} />
            <Mini label="Pelanggan expired" value={summaryCounts.expCustomer} />
          </div>
        </Panel>
        <Panel title="Informasi layanan">
          <ul className="space-y-2">
            {serviceHealth.map((item) => (
              <li
                key={item.name}
                className="flex items-center justify-between border-b border-[#f4f4f4] pb-2 text-[13px] last:border-0 last:pb-0"
              >
                <span>{item.name}</span>
                <StatusPill status={item.status} />
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel className="mt-4" title="Tagihan belum lunas">
        <DataTable
          headers={[
            "Invoice",
            "ID pelanggan",
            "Nama",
            "Paket",
            "Jumlah",
            "Jatuh tempo",
            "Owner",
            "Status",
          ]}
          rows={unpaid.map((row) => [
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
          rows={nasList.map((row) => [
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
