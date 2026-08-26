"use client";

import { useMemo, useState } from "react";
import { Button, Field, PageHeader, Panel, inputClass } from "@/components/ui";
import { customers, vouchers } from "@/lib/mock-data";

export default function Page() {
  const [kind, setKind] = useState<"customer" | "voucher">("customer");
  const [q, setQ] = useState("");
  const [hit, setHit] = useState<string | null>(null);

  const result = useMemo(() => {
    if (!hit) return null;
    if (kind === "customer") {
      return customers.find(
        (row) =>
          row.customerCode.includes(hit) ||
          row.username.toLowerCase() === hit.toLowerCase(),
      );
    }
    return vouchers.find((row) => row.code.toLowerCase() === hit.toLowerCase());
  }, [hit, kind]);

  return (
    <div>
      <PageHeader title="Cek pemakaian" description="Cari pelanggan atau voucher di data mock." />
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
          <Field label={kind === "customer" ? "ID / username" : "Kode voucher"}>
            <input value={q} onChange={(e) => setQ(e.target.value)} className={inputClass} />
          </Field>
          <Button onClick={() => setHit(q.trim())}>Cek</Button>
        </div>
        {hit && !result ? (
          <p className="mt-4 text-sm text-rose-700">Tidak ditemukan.</p>
        ) : null}
        {result && "name" in result ? (
          <dl className="mt-4 grid max-w-xl grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-500">Nama</dt>
            <dd>{result.name}</dd>
            <dt className="text-slate-500">Paket</dt>
            <dd>{result.plan}</dd>
            <dt className="text-slate-500">Status</dt>
            <dd>{result.status}</dd>
            <dt className="text-slate-500">Jatuh tempo</dt>
            <dd>{result.dueAt}</dd>
            <dt className="text-slate-500">MAC</dt>
            <dd>{result.mac}</dd>
          </dl>
        ) : null}
        {result && "code" in result ? (
          <dl className="mt-4 grid max-w-xl grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-500">Kode</dt>
            <dd>{result.code}</dd>
            <dt className="text-slate-500">Paket</dt>
            <dd>{result.plan}</dd>
            <dt className="text-slate-500">Pakai</dt>
            <dd>{result.used ? "ya" : "belum"}</dd>
          </dl>
        ) : null}
      </Panel>
    </div>
  );
}
