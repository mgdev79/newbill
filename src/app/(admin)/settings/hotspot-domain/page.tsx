import { JsonSettingList } from "@/components/json-setting-list";

type HotspotDomain = { id: string; domain: string };

export default function Page() {
  return (
    <JsonSettingList<HotspotDomain>
      title="Domain hotspot"
      description="Untuk QR login voucher. Tersimpan di AppSetting."
      settingKey="hotspot_domains"
      columns={["Domain"]}
      blank={() => ({ domain: "" })}
      toRow={(row) => [row.domain]}
      fields={[{ name: "domain", label: "Domain" }]}
    />
  );
}
