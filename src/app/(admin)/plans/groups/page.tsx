"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Button, Field, PageHeader, Panel, inputClass } from "@/components/ui";

type NasRow = { id: string; name: string };
type Row = {
  id: string;
  name: string;
  type: string;
  nas: string;
  nasId: string;
  pool: string;
  owner: string;
};

const empty = { name: "", type: "ppp", nasId: "", pool: "", owner: "admin" };

export default function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [nas, setNas] = useState<NasRow[]>([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [groups, routers] = await Promise.all([
      fetch("/api/v1/profile-groups").then((r) => r.json()),
      fetch("/api/v1/nas").then((r) => r.json()),
    ]);
    setRows(groups.rows ?? []);
    setNas((routers.rows ?? []).map((row: NasRow) => ({ id: row.id, name: row.name })));
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    setBusy(true);
    setToast(null);
    const response = await fetch(
      editId ? `/api/v1/profile-groups/${editId}` : "/api/v1/profile-groups",
      {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      },
    );
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
    if (!window.confirm("Hapus grup ini?")) return;
    const response = await fetch(`/api/v1/profile-groups/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setToast(data.error ?? "Tidak bisa dihapus.");
      return;
    }
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Grup profil"
        description="Inject ke MikroTik PPP/Hotspot profile + IP pool. Data dari database."
      />
      {toast ? (
        <p className="mb-3 rounded-sm border border-[#ebccd1] bg-[#f2dede] px-3 py-2 text-[13px] text-[#a94442]">
          {toast}
        </p>
      ) : null}
      <Panel title={editId ? "Ubah grup" : "Tambah grup"}>
        <div className="grid gap-3 md:grid-cols-5">
          <Field label="Nama">
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Tipe">
            <select className={inputClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="ppp">PPP</option>
              <option value="hotspot">Hotspot</option>
            </select>
          </Field>
          <Field label="NAS">
            <select className={inputClass} value={form.nasId} onChange={(e) => setForm({ ...form, nasId: e.target.value })}>
              <option value="">- pilih -</option>
              {nas.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Pool">
            <input className={inputClass} value={form.pool} onChange={(e) => setForm({ ...form, pool: e.target.value })} />
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
          headers={["Nama", "Tipe", "NAS", "Pool", "Owner", ""]}
          rows={rows.map((row) => [
            row.name,
            row.type,
            row.nas,
            row.pool,
            row.owner,
            <span key={row.id} className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setEditId(row.id);
                  setForm({
                    name: row.name,
                    type: row.type,
                    nasId: row.nasId,
                    pool: row.pool,
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
