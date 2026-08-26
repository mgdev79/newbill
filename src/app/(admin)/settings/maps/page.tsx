import { Field, inputClass } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";

export default function Page() {
  return (
    <SettingsForm title="Google Map API">
      <Field label="Maps API key">
        <input type="password" className={inputClass} />
      </Field>
    </SettingsForm>
  );
}
