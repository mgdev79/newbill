"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Field, inputClass } from "@/components/ui";
import { formatIdr } from "@/lib/utils";
import { TENANT_ROOT_DOMAIN } from "@/lib/tenant-host";

type Plan = {
  id: string;
  name: string;
  code: string;
  priceMonth: number;
  vpnQuota: number;
  routerLimit: number;
  customerLimit: number;
  description: string;
};

export default function SignupPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [provider, setProvider] = useState("duitku");
  const [needChannel, setNeedChannel] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    subdomain: "",
    planId: "",
    paymentChannel: "SP",
  });

  useEffect(() => {
    void fetch("/api/v1/signup")
      .then((r) => r.json())
      .then((data: { plans?: Plan[]; provider?: string; needChannel?: boolean }) => {
        setPlans(data.plans ?? []);
        setProvider(data.provider ?? "duitku");
        setNeedChannel(Boolean(data.needChannel));
        setForm((current) =>
          current.planId || !data.plans?.[0] ? current : { ...current, planId: data.plans[0].id },
        );
      })
      .catch(() => setError("Gagal memuat paket."));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/v1/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = (await response.json()) as {
      error?: string;
      payment?: { paymentUrl?: string; error?: string; instruction?: string };
      tenantId?: string;
      row?: { subdomain?: string };
    };
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "Pendaftaran gagal.");
      return;
    }
    if (data.tenantId) {
      window.location.href = "/signup/thanks?free=1";
      return;
    }
    if (data.payment?.paymentUrl) {
      window.location.href = data.payment.paymentUrl;
      return;
    }
    setError(
      data.payment?.error ||
        data.payment?.instruction ||
        "Order tersimpan sebagai pending. Hubungi admin untuk bayar tunai jika gateway sedang down.",
    );
  }

  const selected = plans.find((row) => row.id === form.planId);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <form
        onSubmit={(e) => void submit(e)}
        className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <p className="text-xs tracking-[0.2em] text-teal-700 uppercase">Newbill SaaS</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">Daftar tenant</h1>
        <p className="mt-1 text-sm text-slate-500">
          Akun aktif setelah pembayaran {provider} berhasil (atau admin menandai bayar tunai).
        </p>
        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
        <div className="mt-5 grid gap-3">
          <Field label="Nama perusahaan">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Email login">
            <input
              className={inputClass}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </Field>
          <Field label="Password">
            <input
              className={inputClass}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </Field>
          <Field label="Telepon">
            <input
              className={inputClass}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label={`Subdomain (*.${TENANT_ROOT_DOMAIN})`}>
            <input
              className={inputClass}
              value={form.subdomain}
              onChange={(e) => setForm({ ...form, subdomain: e.target.value.toLowerCase() })}
              placeholder="ariyana"
              required
            />
          </Field>
          <Field label="Paket">
            <select
              className={inputClass}
              value={form.planId}
              onChange={(e) => setForm({ ...form, planId: e.target.value })}
            >
              {plans.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name} · {formatIdr(row.priceMonth)}/bln
                </option>
              ))}
            </select>
          </Field>
          {needChannel ? (
            <Field label="Metode bayar">
              <select
                className={inputClass}
                value={form.paymentChannel}
                onChange={(e) => setForm({ ...form, paymentChannel: e.target.value })}
              >
                <option value="SP">QRIS</option>
                <option value="BC">VA BCA</option>
                <option value="M2">VA Mandiri</option>
                <option value="I1">VA BNI</option>
                <option value="BR">VA BRI</option>
                <option value="FT">Alfamart</option>
              </select>
            </Field>
          ) : null}
        </div>
        {selected ? (
          <p className="mt-3 text-xs text-slate-500">
            {selected.description || `${selected.customerLimit} pelanggan · ${selected.routerLimit} router`}
          </p>
        ) : null}
        <Button type="submit" className="mt-5 w-full" disabled={busy}>
          {busy ? "Memproses…" : selected && selected.priceMonth > 0 ? "Lanjut ke pembayaran" : "Daftar"}
        </Button>
        <p className="mt-3 text-center text-xs text-slate-400">
          Sudah punya akun?{" "}
          <Link href="/client/login" className="text-teal-700 hover:underline">
            Client area
          </Link>
        </p>
      </form>
    </div>
  );
}
