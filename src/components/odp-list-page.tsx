"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Button, Field, PageHeader, Panel, inputClass } from "@/components/ui";

type Row = {
  id: string;
  name: string;
  area: string;
  lat: string;
  lng: string;
  capacity: number;
  used: number;
  note: string;
};

const empty = { name: "", area: "", lat: "", lng: "", capacity: "16", note: "" };

export function OdpListPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await fetch("/api/v1/odps").then((r) => r.json());
    setRows(data.rows ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    setBusy(true);
    setToast(null);
    const payload = {
      name: form.name,
      area: form.area,
      lat: form.lat,
      lng: form.lng,
      capacity: Number(form.capacity) || 0,
      note: form.note,
    };
    const response = await fetch(editId ? `/api/v1/odps/${editId}` : "/api/v1/odps", {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
    if (!window.confirm("Hapus ODP ini?")) return;
    await fetch(`/api/v1/odps/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Kelola ODP | POP"
        description="Titik distribusi fisik. Terpakai dihitung dari field ODP di pelanggan."
      />
      {toast ? (
        <p className="mb-3 rounded-sm border border-[#ebccd1] bg-[#f2dede] px-3 py-2 text-[13px] text-[#a94442]">
          {toast}
        </p>
      ) : null}
      <Panel title={editId ? "Ubah ODP" : "Tambah ODP"}>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Nama">
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Area">
            <input className={inputClass} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
          </Field>
          <Field label="Kapasitas">
            <input className={inputClass} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          </Field>
          <Field label="Lat">
            <input className={inputClass} value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
          </Field>
          <Field label="Lng">
            <input className={inputClass} value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} />
          </Field>
          <Field label="Catatan">
            <input className={inputClass} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </Field>
        </div>
        <div className="mt-3 flex gap-2">
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
      </Panel>
      <Panel className="mt-4" title="Daftar">
        <DataTable
          headers={["Nama", "Area", "Kapasitas", "Terpakai", "Sisa", ""]}
          rows={rows.map((row) => [
            row.name,
            row.area,
            String(row.capacity),
            String(row.used),
            String(row.capacity - row.used),
            <span key={row.id} className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setEditId(row.id);
                  setForm({
                    name: row.name,
                    area: row.area,
                    lat: row.lat,
                    lng: row.lng,
                    capacity: String(row.capacity),
                    note: row.note,
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
