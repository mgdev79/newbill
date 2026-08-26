"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Button, Field, PageHeader, Panel, inputClass } from "@/components/ui";

type Row = { id: string; identity: string; address: string; mac: string; board: string };
const empty = { identity: "", address: "", mac: "", board: "" };

export default function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await fetch("/api/v1/neighbors").then((r) => r.json());
    setRows(data.rows ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    setBusy(true);
    setToast(null);
    const response = await fetch(editId ? `/api/v1/neighbors/${editId}` : "/api/v1/neighbors", {
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
    if (!window.confirm("Hapus neighbor ini?")) return;
    const response = await fetch(`/api/v1/neighbors/${id}`, { method: "DELETE" });
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
        title="List neighbor"
        description="Inventaris neighbor/AP yang dicatat operator. Pull dari API MikroTik belum diaktifkan."
      />
      {toast ? (
        <p className="mb-3 rounded-sm border border-[#ebccd1] bg-[#f2dede] px-3 py-2 text-[13px] text-[#a94442]">
          {toast}
        </p>
      ) : null}
      <Panel title={editId ? "Ubah neighbor" : "Tambah neighbor"}>
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Identity">
            <input className={inputClass} value={form.identity} onChange={(e) => setForm({ ...form, identity: e.target.value })} />
          </Field>
          <Field label="Address">
            <input className={inputClass} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <Field label="MAC">
            <input className={inputClass} value={form.mac} onChange={(e) => setForm({ ...form, mac: e.target.value })} />
          </Field>
          <Field label="Board">
            <input className={inputClass} value={form.board} onChange={(e) => setForm({ ...form, board: e.target.value })} />
          </Field>
        </div>
        <div className="mt-3 flex gap-2">
          <Button disabled={busy} onClick={() => void save()}>
            {editId ? "Update" : "Simpan"}
          </Button>
          {editId ? (
            <Button variant="secondary" onClick={() => { setEditId(null); setForm(empty); }}>
              Batal
            </Button>
          ) : null}
        </div>
      </Panel>
      <Panel className="mt-4" title="Daftar">
        <DataTable
          headers={["Identity", "Address", "MAC", "Board", ""]}
          rows={rows.map((row) => [
            row.identity,
            row.address,
            row.mac,
            row.board,
            <span key={row.id} className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setEditId(row.id);
                  setForm({ identity: row.identity, address: row.address, mac: row.mac, board: row.board });
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
