import { Field, inputClass } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";

export default function Page() {
  return (
    <SettingsForm
      namespace=""
      keys={[
        "company_name",
        "company_phone",
        "company_address",
        "company_renew_lock",
        "company_bank",
      ]}
      title="Pengaturan umum"
      description="Identitas usaha. Tersimpan di AppSetting."
    >
      <Field label="Nama usaha">
        <input name="company_name" className={inputClass} />
      </Field>
      <Field label="Telepon">
        <input name="company_phone" className={inputClass} />
      </Field>
      <Field label="Alamat">
        <input name="company_address" className={inputClass} />
      </Field>
      <Field label="Lock renew (hari sebelum due)">
        <input name="company_renew_lock" type="number" defaultValue={10} className={inputClass} />
      </Field>
      <Field label="Rekening pembayaran">
        <textarea
          name="company_bank"
          className="min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        />
      </Field>
    </SettingsForm>
  );
}
