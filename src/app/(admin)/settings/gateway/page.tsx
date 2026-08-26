import { Field, inputClass } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";

export default function Page() {
  return (
    <SettingsForm title="Payment gateway">
      <Field label="Provider">
        <select className={inputClass} defaultValue="duitku">
          <option value="duitku">Duitku</option>
          <option value="xendit">Xendit</option>
          <option value="midtrans">Midtrans</option>
        </select>
      </Field>
      <Field label="Merchant code">
        <input className={inputClass} />
      </Field>
      <Field label="API key">
        <input type="password" className={inputClass} />
      </Field>
    </SettingsForm>
  );
}
