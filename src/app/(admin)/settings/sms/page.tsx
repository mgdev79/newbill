import { Field, inputClass } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";

export default function Page() {
  return (
    <SettingsForm title="Setting SMS">
      <Field label="Provider">
        <select className={inputClass}>
          <option>MedanSMS</option>
          <option>Nexmo</option>
          <option>iSMS</option>
        </select>
      </Field>
      <Field label="API key">
        <input type="password" className={inputClass} />
      </Field>
    </SettingsForm>
  );
}
