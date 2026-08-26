import { Field, inputClass } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";

export default function Page() {
  return (
    <SettingsForm
      namespace="client_api"
      title="API client area"
      description="Key tersimpan di AppSetting. Belum dipakai memanggil layanan eksternal."
    >
      <Field label="API key">
        <input name="key" className={inputClass} />
      </Field>
      <Field label="API secret">
        <input name="secret" type="password" className={inputClass} autoComplete="off" />
      </Field>
    </SettingsForm>
  );
}
