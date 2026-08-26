import { PageHeader, Panel, Button } from "@/components/ui";

export default function Page() {
  return (
    <div>
      <PageHeader title="Impor user" description="CSV username,password. Proses file menunggu API." />
      <Panel>
        <input type="file" accept=".csv,.txt" className="text-sm" />
        <div className="mt-4">
          <Button>Unggah (mock)</Button>
        </div>
      </Panel>
    </div>
  );
}
