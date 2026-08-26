import { Field, inputClass } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";

export default function Page() {
  return (
    <SettingsForm namespace="localisation" title="Lokalisasi">
      <Field label="Timezone">
        <input name="timezone" defaultValue="Asia/Jakarta" className={inputClass} />
      </Field>
      <Field label="Mata uang">
        <input name="currency" defaultValue="IDR" className={inputClass} />
      </Field>
      <Field label="Bahasa">
        <select name="language" className={inputClass} defaultValue="id">
          <option value="id">Indonesia</option>
          <option value="en">English</option>
        </select>
      </Field>
      <Field label="Pemisah ribuan">
        <input name="thousand_sep" defaultValue="." className={inputClass} />
      </Field>
    </SettingsForm>
  );
}
