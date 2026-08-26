import { Field, inputClass } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";

export default function Page() {
  return (
    <SettingsForm
      namespace="gateway"
      title="Payment gateway"
      notice="Provider tersimpan, panggilan API belum diaktifkan — perlu verifikasi endpoint resmi provider sebelum go-live."
    >
      <Field label="Provider">
        <select name="provider" className={inputClass} defaultValue="">
          <option value="">- pilih -</option>
          <option value="duitku">Duitku</option>
          <option value="xendit">Xendit</option>
          <option value="midtrans">Midtrans</option>
        </select>
      </Field>
      <Field label="Merchant code">
        <input name="merchant_code" className={inputClass} />
      </Field>
      <Field label="API key">
        <input name="api_key" type="password" className={inputClass} autoComplete="off" />
      </Field>
    </SettingsForm>
  );
}
