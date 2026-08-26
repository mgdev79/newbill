"use client";

import { useEffect, useState } from "react";
import { PageHeader, Panel } from "@/components/ui";
import { formatIdr } from "@/lib/utils";

type Month = { month: string; income: number; payout: number };

export default function Page() {
  const [months, setMonths] = useState<Month[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    void fetch(`/api/v1/finance/summary?year=${year}`)
      .then((r) => r.json())
      .then((data: { months?: Month[] }) => setMonths(data.months ?? []));
  }, [year]);

  const max = Math.max(1, ...months.map((row) => row.income));

  return (
    <div>
      <PageHeader
        title="Laba rugi"
        description={`Income (invoice lunas) vs pengeluaran per bulan ${year}.`}
      />
      <Panel>
        <div className="mb-4">
          <select
            className="rounded border border-slate-300 px-2 py-1 text-sm"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {[year - 1, year, year + 1].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-3">
          {months.map((row) => (
            <div key={row.month}>
              <div className="mb-1 flex justify-between text-xs text-slate-600">
                <span>{row.month}</span>
                <span>
                  {formatIdr(row.income)} / keluar {formatIdr(row.payout)}
                </span>
              </div>
              <div className="flex h-2 overflow-hidden rounded bg-slate-100">
                <div className="bg-teal-700" style={{ width: `${(row.income / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
