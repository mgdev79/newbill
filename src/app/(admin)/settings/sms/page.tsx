import { Field, inputClass } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";

export default function Page() {
  return (
    <SettingsForm
      namespace="sms"
      title="Setting SMS"
      notice="Provider tersimpan, panggilan API belum diaktifkan — perlu verifikasi endpoint resmi provider sebelum go-live."
    >
      <Field label="Provider">
        <select name="provider" className={inputClass} defaultValue="">
          <option value="">- pilih -</option>
          <option value="medansms">MedanSMS</option>
          <option value="nexmo">Nexmo</option>
          <option value="isms">iSMS</option>
        </select>
      </Field>
      <Field label="API key">
        <input name="api_key" type="password" className={inputClass} autoComplete="off" />
      </Field>
    </SettingsForm>
  );
}
