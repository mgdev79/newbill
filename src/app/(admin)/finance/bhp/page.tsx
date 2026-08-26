import { PageHeader, Panel, StatCard } from "@/components/ui";
import { formatIdr } from "@/lib/utils";

export default function Page() {
  return (
    <div>
      <PageHeader
        title="Hitung BHP | USO"
        description="Estimasi kewajiban berdasarkan omzet. Bukan kalkulator resmi Kominfo."
      />
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard tone="slate" label="Omzet sample" value={formatIdr(52400000)} />
        <StatCard tone="amber" label="BHP (estimasi 0.5%)" value={formatIdr(262000)} />
        <StatCard tone="sky" label="USO (estimasi 1.25%)" value={formatIdr(655000)} />
      </div>
      <Panel className="mt-4">
        <p className="text-sm text-slate-600">
          Angka di halaman ini hanya placeholder UI. Rumus resmi harus
          dikonfirmasi ke aturan yang berlaku.
        </p>
      </Panel>
    </div>
  );
}
