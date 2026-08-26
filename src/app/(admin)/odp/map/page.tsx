import { odpList } from "@/lib/mock-data";
import { PageHeader, Panel } from "@/components/ui";

export default function Page() {
  return (
    <div>
      <PageHeader title="Peta ODP | POP" description="Layout skematik, bukan peta satelit." />
      <Panel className="relative h-[420px] overflow-hidden bg-slate-50">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:28px_28px]" />
        {odpList.map((odp, index) => (
          <div
            key={odp.id}
            className="absolute rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200"
            style={{ left: `${16 + index * 26}%`, top: `${30 + (index % 2) * 18}%` }}
          >
            <p className="font-medium">{odp.name}</p>
            <p className="text-xs text-slate-500">
              {odp.used}/{odp.capacity} port
            </p>
          </div>
        ))}
      </Panel>
    </div>
  );
}
