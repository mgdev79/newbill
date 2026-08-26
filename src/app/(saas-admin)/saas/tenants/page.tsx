"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Modal } from "@/components/modal";
import { Button, Field, PageHeader, Panel, StatusPill, inputClass } from "@/components/ui";
import { formatIdr } from "@/lib/utils";

type Plan = { id: string; name: string; priceMonth: number; vpnQuota: number };
type TenantRow = {
  id: string;
  code: string;
  name: string;
  email: string;
  status: string;
  vpnUsed: number;
  plan: Plan;
  expiresAt: string | null;
};

export default function TenantsPage() {
  const [rows, setRows] = useState<TenantRow[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    email: "",
    password: "tenant123",
    phone: "",
    planId: "",
    billingUrl: "",
  });

  async function load() {
    const [t, p] = await Promise.all([
      fetch("/api/v1/saas/tenants").then((r) => r.json()),
      fetch("/api/v1/saas/plans").then((r) => r.json()),
    ]);
    setRows(t.rows);
    setPlans(p.rows);
    if (!form.planId && p.rows[0]) setForm((f) => ({ ...f, planId: p.rows[0].id }));
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    setError(null);
    const response = await fetch("/api/v1/saas/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
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
        title="Tenant SaaS"
        description="Akun client area (setara my.topsetting.com). Tenant login di /client/login."
        actions={<Button onClick={() => setOpen(true)}>Tambah tenant</Button>}
      />
      <Panel>
        <DataTable
          headers={["Kode", "Nama", "Email", "Paket", "VPN", "Status", ""]}
          rows={rows.map((row) => [
            row.code,
            row.name,
            row.email,
            `${row.plan.name} (${formatIdr(row.plan.priceMonth)})`,
            `${row.vpnUsed}/${row.plan.vpnQuota}`,
            <StatusPill key={row.id} status={row.status === "active" ? "ok" : "warn"} />,
            <Link key={`${row.id}-l`} href={`/saas/tenants/${row.id}`} className="text-teal-800 hover:underline">
              Kelola
            </Link>,
          ])}
        />
      </Panel>

      <Modal
        title="Tambah tenant"
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
        <div className="grid gap-3">
          <Field label="Kode tenant">
            <input
              className={inputClass}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="ariyana"
            />
          </Field>
          <Field label="Nama usaha">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Email login client area">
            <input
              className={inputClass}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Password">
            <input
              className={inputClass}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>
          <Field label="Paket SaaS">
            <select
              className={inputClass}
              value={form.planId}
              onChange={(e) => setForm({ ...form, planId: e.target.value })}
            >
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} — kuota VPN {plan.vpnQuota}
                </option>
              ))}
            </select>
          </Field>
          <Field label="URL billing instance (opsional)">
            <input
              className={inputClass}
              value={form.billingUrl}
              onChange={(e) => setForm({ ...form, billingUrl: e.target.value })}
              placeholder="https://tenant.newbill.local"
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
