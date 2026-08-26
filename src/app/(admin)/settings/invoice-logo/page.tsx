import { Field, inputClass } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";

export default function Page() {
  return (
    <SettingsForm title="Logo invoice" description="Unggah hanya tampilan; file belum tersimpan.">
      <Field label="Logo kiri">
        <input type="file" className={inputClass} />
      </Field>
      <Field label="Logo kanan">
        <input type="file" className={inputClass} />
      </Field>
    </SettingsForm>
  );
}
