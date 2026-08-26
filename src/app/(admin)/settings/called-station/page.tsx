"use client";

import { JsonSettingList } from "@/components/json-setting-list";

type CalledStation = { id: string; type: string; nas: string; name: string };

export default function Page() {
  return (
    <JsonSettingList<CalledStation>
      title="Called station"
      description="Daftar server hotspot/PPPoE. Tersimpan di AppSetting, bukan mock."
      settingKey="called_stations"
      columns={["Tipe", "NAS", "Nama server"]}
      blank={() => ({ type: "ppp", nas: "", name: "" })}
      toRow={(row) => [row.type, row.nas, row.name]}
      fields={[
        { name: "type", label: "Tipe" },
        { name: "nas", label: "NAS" },
        { name: "name", label: "Nama server" },
      ]}
    />
  );
}
