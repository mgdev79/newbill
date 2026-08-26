"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Button, Field, PageHeader, Panel, inputClass } from "@/components/ui";

type Row = {
  id: string;
  name: string;
  minUp: string;
  maxUp: string;
  minDown: string;
  maxDown: string;
  owner: string;
};

const empty = { name: "", minUp: "1M", maxUp: "", minDown: "1M", maxDown: "", owner: "admin" };

export default function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await fetch("/api/v1/bandwidth").then((r) => r.json());
    setRows(data.rows ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    setBusy(true);
    setToast(null);
    const response = await fetch(editId ? `/api/v1/bandwidth/${editId}` : "/api/v1/bandwidth", {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setToast(data.error ?? "Gagal menyimpan.");
      return;
    }
    setForm(empty);
    setEditId(null);
    await load();
  }

  async function remove(id: string) {
    if (!window.confirm("Hapus bandwidth ini?")) return;
    const response = await fetch(`/api/v1/bandwidth/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setToast(data.error ?? "Tidak bisa dihapus.");
      return;
    }
    await load();
  }

  return (
    <div>
      <PageHeader title="Profil bandwidth" description="Min/max rate untuk plan. Data dari database." />
      {toast ? (
        <p className="mb-3 rounded-sm border border-[#ebccd1] bg-[#f2dede] px-3 py-2 text-[13px] text-[#a94442]">
          {toast}
        </p>
      ) : null}
      <Panel title={editId ? "Ubah bandwidth" : "Tambah bandwidth"}>
        <div className="grid gap-3 md:grid-cols-6">
          <Field label="Nama">
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Min up">
            <input className={inputClass} value={form.minUp} onChange={(e) => setForm({ ...form, minUp: e.target.value })} />
          </Field>
          <Field label="Max up">
            <input className={inputClass} value={form.maxUp} onChange={(e) => setForm({ ...form, maxUp: e.target.value })} />
          </Field>
          <Field label="Min down">
            <input className={inputClass} value={form.minDown} onChange={(e) => setForm({ ...form, minDown: e.target.value })} />
          </Field>
          <Field label="Max down">
            <input className={inputClass} value={form.maxDown} onChange={(e) => setForm({ ...form, maxDown: e.target.value })} />
          </Field>
          <div className="flex items-end gap-2">
            <Button disabled={busy} onClick={() => void save()}>
              {editId ? "Update" : "Simpan"}
            </Button>
            {editId ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setEditId(null);
                  setForm(empty);
                }}
              >
                Batal
              </Button>
            ) : null}
          </div>
        </div>
      </Panel>
      <Panel className="mt-4" title="Daftar">
        <DataTable
          headers={["Nama", "Min up", "Max up", "Min down", "Max down", "Owner", ""]}
          rows={rows.map((row) => [
            row.name,
            row.minUp,
            row.maxUp,
            row.minDown,
            row.maxDown,
            row.owner,
            <span key={row.id} className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setEditId(row.id);
                  setForm({
                    name: row.name,
                    minUp: row.minUp,
                    maxUp: row.maxUp,
                    minDown: row.minDown,
                    maxDown: row.maxDown,
                    owner: row.owner,
                  });
                }}
              >
                Ubah
              </Button>
              <Button variant="ghost" onClick={() => void remove(row.id)}>
                Hapus
              </Button>
            </span>,
          ])}
        />
      </Panel>
    </div>
  );
}
