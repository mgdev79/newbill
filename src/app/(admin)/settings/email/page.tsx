import { Field, inputClass } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";

export default function Page() {
  return (
    <SettingsForm title="Setting email">
      <Field label="SMTP host">
        <input className={inputClass} />
      </Field>
      <Field label="Port">
        <input defaultValue="587" className={inputClass} />
      </Field>
      <Field label="Email">
        <input type="email" className={inputClass} />
      </Field>
      <Field label="Password">
        <input type="password" className={inputClass} />
      </Field>
    </SettingsForm>
  );
}
