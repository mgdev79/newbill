import { PageHeader, Panel, Button } from "@/components/ui";

export default function Page() {
  return (
    <div>
      <PageHeader title="Backup / restore DB" description="Tidak mengeksekusi reset sungguhan." />
      <Panel className="flex flex-wrap gap-2">
        <Button>Unduh backup (mock)</Button>
        <Button variant="secondary">Restore .sql (mock)</Button>
        <Button variant="danger">Reset laporan (mock)</Button>
      </Panel>
    </div>
  );
}
