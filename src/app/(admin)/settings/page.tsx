import { Field, inputClass } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";
import { company } from "@/lib/mock-data";

export default function Page() {
  return (
    <SettingsForm title="Pengaturan umum" description="Identitas usaha dan jendela renew.">
      <Field label="Nama usaha">
        <input defaultValue={company.tenant} className={inputClass} />
      </Field>
      <Field label="Telepon">
        <input defaultValue="0812xxxx" className={inputClass} />
      </Field>
      <Field label="Alamat">
        <input defaultValue="Indonesia" className={inputClass} />
      </Field>
      <Field label="Lock renew (hari sebelum due)">
        <input type="number" defaultValue={10} className={inputClass} />
      </Field>
      <Field label="Rekening pembayaran">
        <textarea className="min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" defaultValue="BCA 123456 a.n Ariyana ID" />
      </Field>
    </SettingsForm>
  );
}
