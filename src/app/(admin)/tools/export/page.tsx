import { Field, PageHeader, Panel, Button, inputClass } from "@/components/ui";

export default function Page() {
  return (
    <div>
      <PageHeader title="Ekspor user" />
      <Panel>
        <div className="grid max-w-lg gap-3">
          <Field label="Tipe">
            <select className={inputClass}>
              <option>Customer</option>
              <option>Voucher</option>
            </select>
          </Field>
          <Field label="Format">
            <select className={inputClass}>
              <option>CSV</option>
              <option>XLSX</option>
            </select>
          </Field>
          <Button>Unduh (mock)</Button>
        </div>
      </Panel>
    </div>
  );
}
