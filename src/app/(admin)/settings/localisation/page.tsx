import { Field, inputClass } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";

export default function Page() {
  return (
    <SettingsForm title="Lokalisasi">
      <Field label="Timezone">
        <input defaultValue="Asia/Jakarta" className={inputClass} />
      </Field>
      <Field label="Mata uang">
        <input defaultValue="IDR" className={inputClass} />
      </Field>
      <Field label="Bahasa">
        <select className={inputClass} defaultValue="id">
          <option value="id">Indonesia</option>
          <option value="en">English</option>
        </select>
      </Field>
      <Field label="Pemisah ribuan">
        <input defaultValue="." className={inputClass} />
      </Field>
    </SettingsForm>
  );
}
