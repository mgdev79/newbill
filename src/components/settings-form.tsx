"use client";

import { useState, type ReactNode } from "react";
import { Button, PageHeader, Panel } from "@/components/ui";

export function SettingsForm({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const [saved, setSaved] = useState(false);
  return (
    <div>
      <PageHeader title={title} description={description} />
      {saved ? (
        <p className="mb-3 rounded-sm border border-[#d6e9c6] bg-[#dff0d8] px-3 py-2 text-[13px] text-[#3c763d]">
          Pengaturan disimpan di UI (belum ke server).
        </p>
      ) : null}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSaved(true);
        }}
      >
        <Panel>
          <div className="grid gap-3 md:grid-cols-2">{children}</div>
          <div className="mt-4">
            <Button type="submit">Simpan</Button>
          </div>
        </Panel>
      </form>
    </div>
  );
}
