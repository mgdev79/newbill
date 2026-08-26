import { Field, inputClass } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";

export default function Page() {
  return (
    <SettingsForm title="API client area" description="Key untuk portal pelanggan terpisah.">
      <Field label="API key">
        <input readOnly defaultValue="nb_live_••••••••" className={inputClass} />
      </Field>
      <Field label="API secret">
        <input readOnly type="password" defaultValue="secret" className={inputClass} />
      </Field>
    </SettingsForm>
  );
}
