import { Field, inputClass } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";

export default function Page() {
  return (
    <SettingsForm namespace="maps" title="Google Map API">
      <Field label="Maps API key">
        <input name="api_key" type="password" className={inputClass} autoComplete="off" />
      </Field>
    </SettingsForm>
  );
}
