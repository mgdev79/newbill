import { Field, inputClass } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";

export default function Page() {
  return (
    <SettingsForm
      namespace="invoice"
      title="Logo invoice"
      description="Simpan URL/path logo (unggah file biner belum diaktifkan)."
    >
      <Field label="Logo kiri (URL)">
        <input name="logo_left" className={inputClass} placeholder="https://…" />
      </Field>
      <Field label="Logo kanan (URL)">
        <input name="logo_right" className={inputClass} placeholder="https://…" />
      </Field>
    </SettingsForm>
  );
}
