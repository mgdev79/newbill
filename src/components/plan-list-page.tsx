"use client";

import { useCallback, useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Button, Field, PageHeader, Panel, inputClass } from "@/components/ui";
import { formatIdr } from "@/lib/utils";

type Option = { id: string; name: string; type?: string };
type Row = {
  id: string;
  name: string;
  type: string;
  priceBase: number;
  priceSell: number;
  vatPct: number;
  validity: string;
  sharedUsers: number;
  bandwidthId: string;
  groupId: string;
  bandwidth: string;
  group: string;
};

const empty = {
  name: "",
  priceBase: "",
  priceSell: "",
  vatPct: "0",
  validity: "30 hari",
  sharedUsers: "1",
  bandwidthId: "",
  groupId: "",
};

export function PlanListPage({
  type,
  title,
  description,
}: {
  type: "ppp" | "hotspot";
  title: string;
  description: string;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [bandwidths, setBandwidths] = useState<Option[]>([]);
  const [groups, setGroups] = useState<Option[]>([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [plans, bw, grp] = await Promise.all([
        fetch(`/api/v1/plans?type=${type}`).then((r) => r.json()),
        fetch("/api/v1/bandwidth").then((r) => r.json()),
        fetch(`/api/v1/profile-groups?type=${type}`).then((r) => r.json()),
      ]);
      setRows(plans.rows ?? []);
      setBandwidths(bw.rows ?? []);
      setGroups(grp.rows ?? []);
    } catch {
      setToast("Gagal memuat paket.");
    }
  }, [type]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setBusy(true);
    setToast(null);
    const payload = {
      type,
      name: form.name,
      priceBase: Number(form.priceBase) || 0,
      priceSell: Number(form.priceSell) || 0,
      vatPct: Number(form.vatPct) || 0,
      validity: form.validity,
      sharedUsers: Number(form.sharedUsers) || 1,
      bandwidthId: form.bandwidthId,
      groupId: form.groupId,
    };
    const response = await fetch(editId ? `/api/v1/plans/${editId}` : "/api/v1/plans", {
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
    if (!window.confirm("Hapus paket ini?")) return;
    const response = await fetch(`/api/v1/plans/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setToast(data.error ?? "Tidak bisa dihapus.");
      return;
    }
    await load();
  }

  return (
    <div>
      <PageHeader title={title} description={description} />
      {toast ? (
        <p className="mb-3 rounded-sm border border-[#ebccd1] bg-[#f2dede] px-3 py-2 text-[13px] text-[#a94442]">
          {toast}
        </p>
      ) : null}
      <Panel title={editId ? "Ubah paket" : "Tambah paket"}>
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Nama">
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Harga dasar">
            <input className={inputClass} value={form.priceBase} onChange={(e) => setForm({ ...form, priceBase: e.target.value })} />
          </Field>
          <Field label="Harga jual">
            <input className={inputClass} value={form.priceSell} onChange={(e) => setForm({ ...form, priceSell: e.target.value })} />
          </Field>
          <Field label="PPN %">
            <input className={inputClass} value={form.vatPct} onChange={(e) => setForm({ ...form, vatPct: e.target.value })} />
          </Field>
          <Field label="Masa aktif">
            <input className={inputClass} value={form.validity} onChange={(e) => setForm({ ...form, validity: e.target.value })} />
          </Field>
          <Field label="Shared users">
            <input className={inputClass} value={form.sharedUsers} onChange={(e) => setForm({ ...form, sharedUsers: e.target.value })} />
          </Field>
          <Field label="Bandwidth">
            <select
              className={inputClass}
              value={form.bandwidthId}
              onChange={(e) => setForm({ ...form, bandwidthId: e.target.value })}
            >
              <option value="">- pilih -</option>
              {bandwidths.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Grup">
            <select
              className={inputClass}
              value={form.groupId}
              onChange={(e) => setForm({ ...form, groupId: e.target.value })}
            >
              <option value="">- pilih -</option>
              {groups.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
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
          headers={
            type === "hotspot"
              ? ["Nama", "Harga", "Masa aktif", "Bandwidth", "Grup", "Shared", ""]
              : ["Nama", "Dasar", "Jual", "PPN", "Masa aktif", "Bandwidth", "Grup", "Shared", ""]
          }
          rows={rows.map((row) => {
            const actions = (
              <span key={row.id} className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditId(row.id);
                    setForm({
                      name: row.name,
                      priceBase: String(row.priceBase),
                      priceSell: String(row.priceSell),
                      vatPct: String(row.vatPct),
                      validity: row.validity,
                      sharedUsers: String(row.sharedUsers),
                      bandwidthId: row.bandwidthId,
                      groupId: row.groupId,
                    });
                  }}
                >
                  Ubah
                </Button>
                <Button variant="ghost" onClick={() => void remove(row.id)}>
                  Hapus
                </Button>
              </span>
            );
            return type === "hotspot"
              ? [
                  row.name,
                  formatIdr(row.priceSell),
                  row.validity,
                  row.bandwidth,
                  row.group,
                  String(row.sharedUsers),
                  actions,
                ]
              : [
                  row.name,
                  formatIdr(row.priceBase),
                  formatIdr(row.priceSell),
                  `${row.vatPct}%`,
                  row.validity,
                  row.bandwidth,
                  row.group,
                  String(row.sharedUsers),
                  actions,
                ];
          })}
        />
      </Panel>
    </div>
  );
}
