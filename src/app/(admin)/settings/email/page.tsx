import { Field, inputClass } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";

export default function Page() {
  return (
    <SettingsForm
      namespace="email"
      title="Setting email"
      notice="SMTP tersimpan. Pengiriman email belum diaktifkan sampai endpoint/kredensial diverifikasi."
    >
      <Field label="SMTP host">
        <input name="host" className={inputClass} />
      </Field>
      <Field label="Port">
        <input name="port" defaultValue="587" className={inputClass} />
      </Field>
      <Field label="Email">
        <input name="user" type="email" className={inputClass} />
      </Field>
      <Field label="Password">
        <input name="password" type="password" className={inputClass} autoComplete="off" />
      </Field>
    </SettingsForm>
  );
}
