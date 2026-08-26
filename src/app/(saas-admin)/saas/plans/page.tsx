"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Modal } from "@/components/modal";
import { Button, Field, PageHeader, Panel, inputClass } from "@/components/ui";
import { formatIdr } from "@/lib/utils";

type Plan = {
  id: string;
  name: string;
  code: string;
  priceMonth: number;
  vpnQuota: number;
  routerLimit: number;
  customerLimit: number;
  voucherLimit: number;
  tenantCount: number;
};

export default function SaasPlansPage() {
  const [rows, setRows] = useState<Plan[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    priceMonth: "50000",
    vpnQuota: "1",
    routerLimit: "1",
    customerLimit: "250",
    voucherLimit: "15000",
  });

  async function load() {
    const data = await fetch("/api/v1/saas/plans").then((r) => r.json());
    setRows(data.rows);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    setError(null);
    const response = await fetch("/api/v1/saas/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        priceMonth: Number(form.priceMonth),
        vpnQuota: Number(form.vpnQuota),
        routerLimit: Number(form.routerLimit),
        customerLimit: Number(form.customerLimit),
        voucherLimit: Number(form.voucherLimit),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Gagal");
      return;
    }
    setOpen(false);
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Paket SaaS"
        description="Batas kuota VPN, router, pelanggan — dipakai saat provision tenant."
        actions={<Button onClick={() => setOpen(true)}>Tambah paket</Button>}
      />
      <Panel>
        <DataTable
          headers={["Kode", "Nama", "Harga/bln", "VPN", "Router", "Pelanggan", "Voucher", "Tenant"]}
          rows={rows.map((row) => [
            row.code,
            row.name,
            formatIdr(row.priceMonth),
            String(row.vpnQuota),
            String(row.routerLimit),
            String(row.customerLimit),
            String(row.voucherLimit),
            String(row.tenantCount),
          ])}
        />
      </Panel>

      <Modal
        title="Tambah paket"
        open={open}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => void create()}>Simpan</Button>
          </>
        }
      >
        {error ? <p className="mb-2 text-sm text-rose-700">{error}</p> : null}
        <div className="grid gap-3 md:grid-cols-2">
          {(
            [
              ["name", "Nama"],
              ["code", "Kode"],
              ["priceMonth", "Harga/bulan"],
              ["vpnQuota", "Kuota VPN"],
              ["routerLimit", "Batas router"],
              ["customerLimit", "Batas pelanggan"],
              ["voucherLimit", "Batas voucher"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                className={inputClass}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </Field>
          ))}
        </div>
      </Modal>
    </div>
  );
}
