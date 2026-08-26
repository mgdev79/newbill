"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Button, Field, PageHeader, Panel, StatusPill, inputClass } from "@/components/ui";
import { formatIdr } from "@/lib/utils";

type Row = { id: string; username: string; role: string; topup: boolean; balance: number };
const empty = { username: "", password: "", role: "operator", topup: false, balance: "0" };

export default function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await fetch("/api/v1/staff").then((r) => r.json());
    setRows(data.rows ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    setBusy(true);
    setToast(null);
    const payload = {
      username: form.username,
      password: form.password || undefined,
      role: form.role,
      topup: form.topup,
      balance: Number(form.balance) || 0,
    };
    const response = await fetch(editId ? `/api/v1/staff/${editId}` : "/api/v1/staff", {
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
    if (!window.confirm("Hapus user ini?")) return;
    const response = await fetch(`/api/v1/staff/${id}`, { method: "DELETE" });
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
        title="Manajemen user"
        description="Staff panel (admin/manager/operator). Akun di sini dipakai untuk login operator. Password disimpan sebagai hash."
      />
      {toast ? (
        <p className="mb-3 rounded-sm border border-[#ebccd1] bg-[#f2dede] px-3 py-2 text-[13px] text-[#a94442]">
          {toast}
        </p>
      ) : null}
      <Panel title={editId ? "Ubah user" : "Tambah user"}>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Username">
            <input
              className={inputClass}
              value={form.username}
              disabled={Boolean(editId)}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </Field>
          <Field label={editId ? "Password baru (opsional)" : "Password"}>
            <input
              type="password"
              className={inputClass}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>
          <Field label="Role">
            <select className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="admin">admin</option>
              <option value="manager">manager</option>
              <option value="operator">operator</option>
            </select>
          </Field>
          <Field label="Saldo">
            <input className={inputClass} value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} />
          </Field>
          <Field label="Boleh topup">
            <label className="flex h-9 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.topup}
                onChange={(e) => setForm({ ...form, topup: e.target.checked })}
              />
              ya
            </label>
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
          headers={["Username", "Role", "Topup", "Saldo", ""]}
          rows={rows.map((row) => [
            row.username,
            <StatusPill key={row.id} status={row.role} />,
            row.topup ? "ya" : "tidak",
            formatIdr(row.balance),
            <span key={`${row.id}-a`} className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setEditId(row.id);
                  setForm({
                    username: row.username,
                    password: "",
                    role: row.role,
                    topup: row.topup,
                    balance: String(row.balance),
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
