import { Field, inputClass } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";

export default function Page() {
  return (
    <SettingsForm title="WhatsApp API">
      <Field label="Provider">
        <select className={inputClass}>
          <option>Wablas</option>
          <option>Starsender</option>
          <option>MessageBird</option>
        </select>
      </Field>
      <Field label="API token">
        <input type="password" className={inputClass} />
      </Field>
      <Field label="Notifikasi jatuh tempo">
        <select className={inputClass} defaultValue="H-3">
          <option>Off</option>
          <option>H-3</option>
          <option>H-1</option>
        </select>
      </Field>
    </SettingsForm>
  );
}
