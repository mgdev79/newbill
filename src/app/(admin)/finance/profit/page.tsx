import { PageHeader, Panel } from "@/components/ui";
import { monthlyProfit } from "@/lib/mock-data";
import { formatIdr } from "@/lib/utils";

export default function Page() {
  const max = Math.max(...monthlyProfit.map((row) => row.income));
  return (
    <div>
      <PageHeader title="Laba rugi" description="Income vs pengeluaran per bulan (mock 2026)." />
      <Panel>
        <div className="space-y-3">
          {monthlyProfit.map((row) => (
            <div key={row.month}>
              <div className="mb-1 flex justify-between text-xs text-slate-600">
                <span>{row.month}</span>
                <span>
                  {formatIdr(row.income)} / keluar {formatIdr(row.payout)}
                </span>
              </div>
              <div className="flex h-2 overflow-hidden rounded bg-slate-100">
                <div
                  className="bg-teal-700"
                  style={{ width: `${(row.income / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
