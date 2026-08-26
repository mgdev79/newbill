import { Field, inputClass } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";

export default function Page() {
  return (
    <SettingsForm
      namespace="whatsapp"
      title="WhatsApp API"
      notice="Provider tersimpan, panggilan API belum diaktifkan — perlu verifikasi endpoint resmi provider sebelum go-live."
    >
      <Field label="Provider">
        <select name="provider" className={inputClass} defaultValue="">
          <option value="">- pilih -</option>
          <option value="wablas">Wablas</option>
          <option value="starsender">Starsender</option>
          <option value="messagebird">MessageBird</option>
        </select>
      </Field>
      <Field label="API token">
        <input name="token" type="password" className={inputClass} autoComplete="off" />
      </Field>
      <Field label="Notifikasi jatuh tempo">
        <select name="due_notice" className={inputClass} defaultValue="off">
          <option value="off">Off</option>
          <option value="H-3">H-3</option>
          <option value="H-1">H-1</option>
        </select>
      </Field>
    </SettingsForm>
  );
}
