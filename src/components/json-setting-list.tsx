"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Button, Field, PageHeader, Panel, inputClass } from "@/components/ui";

export function JsonSettingList<T extends { id: string }>({
  title,
  description,
  settingKey,
  columns,
  blank,
  toRow,
  fields,
}: {
  title: string;
  description?: string;
  settingKey: string;
  columns: string[];
  blank: () => Omit<T, "id">;
  toRow: (row: T) => (string | number)[];
  fields: { name: keyof Omit<T, "id">; label: string; type?: string }[];
}) {
  const [rows, setRows] = useState<T[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    const data = await fetch(`/api/v1/settings/${encodeURIComponent(settingKey)}`).then((r) => r.json());
    try {
      const parsed = JSON.parse(data.value || "[]") as T[];
      setRows(Array.isArray(parsed) ? parsed : []);
    } catch {
      setRows([]);
    }
  }

  useEffect(() => {
    void load();
    setForm(blank() as Record<string, string>);
    // blank() is an inline factory from each settings page; including it would retrigger load every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingKey]);

  async function persist(next: T[]) {
    await fetch(`/api/v1/settings/${encodeURIComponent(settingKey)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: JSON.stringify(next) }),
    });
    setRows(next);
  }

  return (
    <div>
      <PageHeader title={title} description={description} />
      {toast ? (
        <p className="mb-3 rounded-sm border border-[#d6e9c6] bg-[#dff0d8] px-3 py-2 text-[13px] text-[#3c763d]">
          {toast}
        </p>
      ) : null}
      <Panel title="Tambah">
        <div className="grid gap-3 md:grid-cols-4">
          {fields.map((field) => (
            <Field key={String(field.name)} label={field.label}>
              <input
                className={inputClass}
                value={form[String(field.name)] ?? ""}
                onChange={(e) => setForm({ ...form, [String(field.name)]: e.target.value })}
              />
            </Field>
          ))}
          <div className="flex items-end">
            <Button
              onClick={() => {
                const row = { id: crypto.randomUUID(), ...form } as T;
                void persist([...rows, row]).then(() => {
                  setForm(blank() as Record<string, string>);
                  setToast("Tersimpan.");
                });
              }}
            >
              Simpan
            </Button>
          </div>
        </div>
      </Panel>
      <Panel className="mt-4" title="Daftar">
        <DataTable
          headers={[...columns, ""]}
          rows={rows.map((row) => [
            ...toRow(row),
            <Button
              key={row.id}
              variant="ghost"
              onClick={() => void persist(rows.filter((item) => item.id !== row.id))}
            >
              Hapus
            </Button>,
          ])}
        />
      </Panel>
    </div>
  );
}
