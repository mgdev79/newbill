"use client";

import { useState } from "react";
import { Button, Field, PageHeader, Panel, inputClass } from "@/components/ui";
import { formatDate } from "@/lib/utils";

type CustomerHit = {
  name: string;
  plan: string;
  status: string;
  dueAt: string;
  mac: string;
  username: string;
  customerCode: string;
};

type VoucherHit = {
  code: string;
  plan: string;
  used: boolean;
  enabled: boolean;
  expiresAt: string;
};

export default function Page() {
  const [kind, setKind] = useState<"customer" | "voucher">("customer");
  const [q, setQ] = useState("");
  const [customer, setCustomer] = useState<CustomerHit | null>(null);
  const [voucher, setVoucher] = useState<VoucherHit | null>(null);
  const [empty, setEmpty] = useState(false);
  const [busy, setBusy] = useState(false);

  async function search() {
    const query = q.trim();
    if (!query) return;
    setBusy(true);
    setEmpty(false);
    setCustomer(null);
    setVoucher(null);
    if (kind === "customer") {
      const data = await fetch(`/api/v1/customers?q=${encodeURIComponent(query)}`).then((r) => r.json());
      const row = (data.rows as CustomerHit[] | undefined)?.[0] ?? null;
      setCustomer(row);
      setEmpty(!row);
    } else {
      const data = await fetch(`/api/v1/vouchers?q=${encodeURIComponent(query)}`).then((r) => r.json());
      const row = (data.rows as VoucherHit[] | undefined)?.[0] ?? null;
      setVoucher(row);
      setEmpty(!row);
    }
    setBusy(false);
  }

  return (
    <div>
      <PageHeader title="Cek pemakaian" description="Cari pelanggan atau voucher di database." />
      <Panel>
        <div className="grid max-w-xl gap-3">
          <Field label="Tipe">
            <select
              className={inputClass}
              value={kind}
              onChange={(e) => setKind(e.target.value as "customer" | "voucher")}
            >
              <option value="customer">Pelanggan</option>
              <option value="voucher">Voucher</option>
            </select>
          </Field>
          <Field label={kind === "customer" ? "ID / username / nama" : "Kode voucher"}>
            <input value={q} onChange={(e) => setQ(e.target.value)} className={inputClass} />
          </Field>
          <Button disabled={busy} onClick={() => void search()}>
            Cek
          </Button>
        </div>
        {empty ? <p className="mt-4 text-sm text-rose-700">Tidak ditemukan.</p> : null}
        {customer ? (
          <dl className="mt-4 grid max-w-xl grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-500">Nama</dt>
            <dd>{customer.name}</dd>
            <dt className="text-slate-500">Kode</dt>
            <dd>{customer.customerCode}</dd>
            <dt className="text-slate-500">Username</dt>
            <dd>{customer.username}</dd>
            <dt className="text-slate-500">Paket</dt>
            <dd>{customer.plan}</dd>
            <dt className="text-slate-500">Status</dt>
            <dd>{customer.status}</dd>
            <dt className="text-slate-500">Jatuh tempo</dt>
            <dd>{formatDate(customer.dueAt)}</dd>
            <dt className="text-slate-500">MAC</dt>
            <dd>{customer.mac || "—"}</dd>
          </dl>
        ) : null}
        {voucher ? (
          <dl className="mt-4 grid max-w-xl grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-500">Kode</dt>
            <dd>{voucher.code}</dd>
            <dt className="text-slate-500">Paket</dt>
            <dd>{voucher.plan}</dd>
            <dt className="text-slate-500">Pakai</dt>
            <dd>{voucher.used ? "ya" : "belum"}</dd>
            <dt className="text-slate-500">Aktif</dt>
            <dd>{voucher.enabled ? "ya" : "tidak"}</dd>
            <dt className="text-slate-500">Berlaku s/d</dt>
            <dd>{formatDate(voucher.expiresAt)}</dd>
          </dl>
        ) : null}
      </Panel>
    </div>
  );
}
