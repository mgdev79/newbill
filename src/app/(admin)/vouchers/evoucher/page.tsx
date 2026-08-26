"use client";

import { useEffect, useState, type FormEvent } from "react";
import { DataTable } from "@/components/data-table";
import { Modal } from "@/components/modal";
import { Button, Field, PageHeader, Panel, inputClass } from "@/components/ui";
import { formatDate } from "@/lib/utils";

type Plan = { id: string; name: string; priceSell: number };
type Order = {
  id: string;
  source: string;
  customer: string;
  phone: string;
  email?: string;
  planName: string;
  qty: number;
  amount: number;
  paymentChannel?: string;
  status: string;
  createdAt: string;
};

export default function Page() {
  const [rows, setRows] = useState<Order[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [orders, meta] = await Promise.all([
      fetch("/api/v1/evouchers").then((r) => r.json()),
      fetch("/api/v1/vouchers/meta?kind=hotspot").then((r) => r.json()),
    ]);
    setRows(orders.rows ?? []);
    setPlans(meta.plans ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const fd = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/evouchers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: String(fd.get("source") ?? "portal"),
        customer: String(fd.get("customer") ?? ""),
        phone: String(fd.get("phone") ?? ""),
        planId: String(fd.get("planId") ?? ""),
        qty: Number(fd.get("qty") ?? 1) || 1,
        status: String(fd.get("status") ?? "pending"),
        note: String(fd.get("note") ?? ""),
      }),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Gagal simpan e-Voucher.");
      return;
    }
    setOpen(false);
    setToast(`Order e-Voucher disimpan · ${data.row.planName} × ${data.row.qty}`);
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Data e-Voucher"
        description="Pembelian voucher dari portal / chat. Catat order lalu fulfill ke Kartu Voucher."
        breadcrumb={["Home", "Kartu Voucher", "Data e-Voucher"]}
        actions={<Button onClick={() => setOpen(true)}>Tambah Order</Button>}
      />
      {toast ? (
        <p className="mb-3 rounded-sm border border-[#bce8f1] bg-[#d9edf7] px-3 py-2 text-[13px] text-[#31708f]">
          {toast}
        </p>
      ) : null}
      <Panel title="Order e-Voucher">
        <DataTable
          headers={["Waktu", "Sumber", "Pelanggan", "Paket", "Qty", "Bayar", "Nominal", "Status"]}
          rows={rows.map((row) => [
            formatDate(row.createdAt),
            row.source,
            <div key={row.id}>
              <p>{row.customer}</p>
              {row.phone ? (
                <p className="text-xs text-[var(--lte-muted)]">{row.phone}</p>
              ) : null}
            </div>,
            row.planName,
            String(row.qty),
            row.paymentChannel || "—",
            `Rp ${row.amount.toLocaleString("id-ID")}`,
            row.status,
          ])}
        />
      </Panel>

      <Modal
        title="Tambah Order e-Voucher"
        open={open}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" form="evoucher-form" disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan Order"}
            </Button>
          </>
        }
      >
        <form id="evoucher-form" onSubmit={(e) => void onSubmit(e)} className="grid gap-3">
          {error ? (
            <p className="rounded-sm border border-[#ebccd1] bg-[#f2dede] px-3 py-2 text-[13px] text-[#a94442]">
              {error}
            </p>
          ) : null}
          <Field label="Sumber">
            <select name="source" defaultValue="portal" className={inputClass}>
              <option value="portal">Portal web</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="manual">Manual</option>
            </select>
          </Field>
          <Field label="Nama / ID pelanggan">
            <input name="customer" required className={inputClass} />
          </Field>
          <Field label="Telepon">
            <input name="phone" className={inputClass} />
          </Field>
          <Field label="Paket">
            <select name="planId" required className={inputClass} defaultValue="">
              <option value="">- Pilih Paket -</option>
              {plans.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name} · Rp {row.priceSell.toLocaleString("id-ID")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Qty">
            <input name="qty" type="number" min={1} defaultValue={1} className={inputClass} />
          </Field>
          <Field label="Status bayar">
            <select name="status" defaultValue="pending" className={inputClass}>
              <option value="pending">pending</option>
              <option value="paid">paid</option>
            </select>
          </Field>
          <Field label="Catatan">
            <input name="note" className={inputClass} />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
