"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Field, PageHeader, Panel, inputClass } from "@/components/ui";
import {
  TENANT_ROOT_DOMAIN,
  gatewayCallbackUrl,
  tenantPublicOrigin,
  tenantSubdomain,
} from "@/lib/tenant-host";

const PROVIDERS = [
  {
    value: "duitku",
    label: "[1] DUITKU -- https://www.duitku.com/",
    registerUrl: "https://www.duitku.com/",
    registerLabel: "AKUN DUITKU DIPERLUKAN, KLIK DISINI UNTUK REGISTRASI",
  },
  {
    value: "xendit",
    label: "[2] XENDIT -- https://www.xendit.co/id/",
    registerUrl: "https://www.xendit.co/id/",
    registerLabel: "AKUN XENDIT DIPERLUKAN, KLIK DISINI UNTUK REGISTRASI",
  },
  {
    value: "nicepay",
    label: "[3] NICEPAY -- https://nicepay.co.id/",
    registerUrl: "https://nicepay.co.id/",
    registerLabel: "AKUN NICEPAY DIPERLUKAN, KLIK DISINI UNTUK REGISTRASI",
  },
  {
    value: "midtrans",
    label: "[4] MIDTRANS -- https://midtrans.com",
    registerUrl: "https://midtrans.com",
    registerLabel: "AKUN MIDTRANS DIPERLUKAN, KLIK DISINI UNTUK REGISTRASI",
  },
] as const;

type Provider = (typeof PROVIDERS)[number]["value"];

type FormState = {
  provider: Provider | "";
  duitkuEnvironment: "production" | "sandbox";
  duitkuMerchantCode: string;
  duitkuApiKey: string;
  xenditApiSecret: string;
  xenditWebhookToken: string;
  nicepayMerchantId: string;
  nicepayMerchantKey: string;
  midtransEnvironment: "production" | "sandbox";
  midtransClientKey: string;
  midtransServerKey: string;
};

const empty: FormState = {
  provider: "",
  duitkuEnvironment: "production",
  duitkuMerchantCode: "",
  duitkuApiKey: "",
  xenditApiSecret: "",
  xenditWebhookToken: "",
  nicepayMerchantId: "",
  nicepayMerchantKey: "",
  midtransEnvironment: "production",
  midtransClientKey: "",
  midtransServerKey: "",
};

function bang(label: string) {
  return (
    <span>
      <span className="mr-1 font-bold text-[#00a65a]">!</span>
      {label}
    </span>
  );
}

function settingMap(rows: { key: string; value: string }[]) {
  const map = new Map(rows.map((row) => [row.key, row.value]));
  return (key: string) => map.get(key) ?? "";
}

function isProvider(value: string): value is Provider {
  return PROVIDERS.some((row) => row.value === value);
}

export function PaymentGatewayForm({ tenantCode }: { tenantCode: string }) {
  const [form, setForm] = useState<FormState>(empty);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const data = await fetch("/api/v1/settings?prefix=gateway.").then((r) => r.json());
    const get = settingMap((data.rows ?? []) as { key: string; value: string }[]);
    const providerRaw = get("gateway.provider");
    const provider = isProvider(providerRaw) ? providerRaw : "";
    setForm({
      provider,
      duitkuEnvironment: get("gateway.duitku.environment") === "sandbox" ? "sandbox" : "production",
      duitkuMerchantCode: get("gateway.duitku.merchant_code") || get("gateway.merchant_code"),
      duitkuApiKey: get("gateway.duitku.api_key") || get("gateway.api_key"),
      xenditApiSecret: get("gateway.xendit.api_secret"),
      xenditWebhookToken: get("gateway.xendit.webhook_token"),
      nicepayMerchantId: get("gateway.nicepay.merchant_id"),
      nicepayMerchantKey: get("gateway.nicepay.merchant_key"),
      midtransEnvironment: get("gateway.midtrans.environment") === "sandbox" ? "sandbox" : "production",
      midtransClientKey: get("gateway.midtrans.client_key"),
      midtransServerKey: get("gateway.midtrans.server_key"),
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = PROVIDERS.find((row) => row.value === form.provider);
  const sub = tenantSubdomain(tenantCode);
  const clientUrl = sub ? tenantPublicOrigin(tenantCode) : `https://{kode-tenant}.${TENANT_ROOT_DOMAIN}`;
  const callbackUrl =
    form.provider && sub ? gatewayCallbackUrl(tenantCode, form.provider) : "";

  async function save() {
    setBusy(true);
    setSaved(false);
    setError(null);
    const entries: Record<string, string> = { "gateway.provider": form.provider };
    if (form.provider === "duitku") {
      entries["gateway.duitku.environment"] = form.duitkuEnvironment;
      entries["gateway.duitku.merchant_code"] = form.duitkuMerchantCode;
      entries["gateway.duitku.api_key"] = form.duitkuApiKey;
    } else if (form.provider === "xendit") {
      entries["gateway.xendit.api_secret"] = form.xenditApiSecret;
      entries["gateway.xendit.webhook_token"] = form.xenditWebhookToken;
    } else if (form.provider === "nicepay") {
      entries["gateway.nicepay.merchant_id"] = form.nicepayMerchantId;
      entries["gateway.nicepay.merchant_key"] = form.nicepayMerchantKey;
    } else if (form.provider === "midtrans") {
      entries["gateway.midtrans.environment"] = form.midtransEnvironment;
      entries["gateway.midtrans.client_key"] = form.midtransClientKey;
      entries["gateway.midtrans.server_key"] = form.midtransServerKey;
    }
    const response = await fetch("/api/v1/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });
    setBusy(false);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Gagal menyimpan.");
      return;
    }
    setSaved(true);
  }

  async function copyCallback() {
    if (!callbackUrl) return;
    await navigator.clipboard.writeText(callbackUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <PageHeader title="Payment Gateway" breadcrumb={["Home", "Pengaturan", "Payment Gateway"]} />
      {saved ? (
        <p className="mb-3 rounded-sm border border-[#d6e9c6] bg-[#dff0d8] px-3 py-2 text-[13px] text-[#3c763d]">
          Pengaturan tersimpan ke database.
        </p>
      ) : null}
      {error ? (
        <p className="mb-3 rounded-sm border border-[#ebccd1] bg-[#f2dede] px-3 py-2 text-[13px] text-[#a94442]">
          {error}
        </p>
      ) : null}
      <Panel>
        <ul className="mb-4 list-disc space-y-1 pl-5 text-[13px] text-[#dd4b39]">
          <li>
            Wajib sediakan Portal Client / Client Area. Host publik tenant:{" "}
            <code className="rounded bg-[#f2dede] px-1 text-[#a94442]">
              {sub || "{kode-tenant}"}.{TENANT_ROOT_DOMAIN}
            </code>
            .
          </li>
          <li>
            Kredensial disimpan di database. Checkout HTTP ke Duitku/Xendit/Midtrans/Nicepay belum
            diaktifkan — callback URL di bawah sudah bisa dipasang di dashboard provider.
          </li>
        </ul>

        <div className="grid max-w-xl gap-3">
          <Field
            label="Server Payment Gateway"
            hint={
              selected ? (
                <a
                  href={selected.registerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[var(--lte-blue)] hover:underline"
                >
                  {selected.registerLabel}
                </a>
              ) : (
                "Pilih provider untuk menampilkan field kredensial."
              )
            }
          >
            <select
              className={inputClass}
              value={form.provider}
              onChange={(e) => {
                const value = e.target.value;
                setForm({ ...form, provider: isProvider(value) ? value : "" });
                setSaved(false);
              }}
            >
              <option value="">- pilih -</option>
              {PROVIDERS.map((row) => (
                <option key={row.value} value={row.value}>
                  {row.label}
                </option>
              ))}
            </select>
          </Field>

          {form.provider === "duitku" ? (
            <>
              <Field label={bang("Environment")}>
                <div className="flex flex-wrap gap-4 text-[13px] font-normal text-[#444]">
                  <label className="inline-flex items-center gap-1.5 font-normal">
                    <input
                      type="radio"
                      name="duitku_environment"
                      checked={form.duitkuEnvironment === "production"}
                      onChange={() => setForm({ ...form, duitkuEnvironment: "production" })}
                      className="accent-[var(--lte-blue)]"
                    />
                    PRODUCTION
                  </label>
                  <label className="inline-flex items-center gap-1.5 font-normal">
                    <input
                      type="radio"
                      name="duitku_environment"
                      checked={form.duitkuEnvironment === "sandbox"}
                      onChange={() => setForm({ ...form, duitkuEnvironment: "sandbox" })}
                      className="accent-[var(--lte-blue)]"
                    />
                    SANDBOX
                  </label>
                </div>
              </Field>
              <Field label={bang("DUITKU Merchant Code")}>
                <input
                  className={inputClass}
                  value={form.duitkuMerchantCode}
                  onChange={(e) => setForm({ ...form, duitkuMerchantCode: e.target.value })}
                  placeholder="DUITKU Merchant Code"
                  autoComplete="off"
                />
              </Field>
              <Field label={bang("DUITKU API Key")}>
                <input
                  className={inputClass}
                  type="password"
                  value={form.duitkuApiKey}
                  onChange={(e) => setForm({ ...form, duitkuApiKey: e.target.value })}
                  placeholder="DUITKU API Key"
                  autoComplete="off"
                />
              </Field>
            </>
          ) : null}

          {form.provider === "xendit" ? (
            <>
              <Field
                label={bang("XENDIT API Secret")}
                hint="PERMISSION : MONEY IN → WRITE | MONEY OUT → NONE"
              >
                <input
                  className={inputClass}
                  type="password"
                  value={form.xenditApiSecret}
                  onChange={(e) => setForm({ ...form, xenditApiSecret: e.target.value })}
                  placeholder="XENDIT API Secret"
                  autoComplete="off"
                />
              </Field>
              <Field label={bang("Webhook Verification Token")}>
                <input
                  className={inputClass}
                  type="password"
                  value={form.xenditWebhookToken}
                  onChange={(e) => setForm({ ...form, xenditWebhookToken: e.target.value })}
                  placeholder="XENDIT Callback Verification Token"
                  autoComplete="off"
                />
              </Field>
            </>
          ) : null}

          {form.provider === "nicepay" ? (
            <>
              <Field label={bang("Merchant ID")}>
                <input
                  className={inputClass}
                  value={form.nicepayMerchantId}
                  onChange={(e) => setForm({ ...form, nicepayMerchantId: e.target.value })}
                  placeholder="NICEPAY Merchant ID"
                  autoComplete="off"
                />
              </Field>
              <Field label={bang("Merchant Key")}>
                <input
                  className={inputClass}
                  type="password"
                  value={form.nicepayMerchantKey}
                  onChange={(e) => setForm({ ...form, nicepayMerchantKey: e.target.value })}
                  placeholder="NICEPAY Merchant Key"
                  autoComplete="off"
                />
              </Field>
            </>
          ) : null}

          {form.provider === "midtrans" ? (
            <>
              <Field label={bang("Environment")}>
                <div className="flex flex-wrap gap-4 text-[13px] font-normal text-[#444]">
                  <label className="inline-flex items-center gap-1.5 font-normal">
                    <input
                      type="radio"
                      name="midtrans_environment"
                      checked={form.midtransEnvironment === "production"}
                      onChange={() => setForm({ ...form, midtransEnvironment: "production" })}
                      className="accent-[var(--lte-blue)]"
                    />
                    PRODUCTION
                  </label>
                  <label className="inline-flex items-center gap-1.5 font-normal">
                    <input
                      type="radio"
                      name="midtrans_environment"
                      checked={form.midtransEnvironment === "sandbox"}
                      onChange={() => setForm({ ...form, midtransEnvironment: "sandbox" })}
                      className="accent-[var(--lte-blue)]"
                    />
                    SANDBOX
                  </label>
                </div>
              </Field>
              <Field label={bang("Midtrans Client Key")}>
                <input
                  className={inputClass}
                  value={form.midtransClientKey}
                  onChange={(e) => setForm({ ...form, midtransClientKey: e.target.value })}
                  placeholder="MidTrans Client Key"
                  autoComplete="off"
                />
              </Field>
              <Field label={bang("Midtrans Server Key")}>
                <input
                  className={inputClass}
                  type="password"
                  value={form.midtransServerKey}
                  onChange={(e) => setForm({ ...form, midtransServerKey: e.target.value })}
                  placeholder="MidTrans Server Key"
                  autoComplete="off"
                />
              </Field>
            </>
          ) : null}
        </div>

        {form.provider === "duitku" ? (
          <div className="mt-4 rounded-sm border border-[#faebcc] bg-[#fcf8e3] px-3 py-3 text-[13px] text-[#8a6d3b]">
            <p className="font-semibold text-[#8a6d3b]">Penting !</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>
                Website URL di proyek Duitku: URL Portal Client{" "}
                <code className="rounded bg-white/80 px-1">{clientUrl}</code>
                {" "}(subdomain = kode tenant, domain selalu {TENANT_ROOT_DOMAIN}).
              </li>
              <li>
                Callback URL Proyek DUITKU:{" "}
                <code className="rounded bg-white/80 px-1">
                  {callbackUrl || `https://{kode-tenant}.${TENANT_ROOT_DOMAIN}/billing/duitku-checkout.php`}
                </code>{" "}
                {callbackUrl ? (
                  <button type="button" className="text-[var(--lte-blue)] hover:underline" onClick={() => void copyCallback()}>
                    {copied ? "tersalin" : "salin"}
                  </button>
                ) : (
                  <span>— set tenant billing di SaaS supaya subdomain terisi.</span>
                )}
              </li>
              <li>
                Biaya transaksi default dibebankan ke MERCHANT; bisa diganti ke PELANGGAN di dashboard
                Duitku.
              </li>
              <li>Newbill tidak mencatat laporan fee provider — hanya nominal transaksi di ledger lokal.</li>
            </ul>
          </div>
        ) : null}

        {form.provider === "xendit" ? (
          <div className="mt-4 rounded-sm border border-[#faebcc] bg-[#fcf8e3] px-3 py-3 text-[13px] text-[#8a6d3b]">
            <p className="font-semibold text-[#8a6d3b]">Penting !</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>
                API Secret &amp; token:{" "}
                <a
                  href="https://dashboard.xendit.co/settings/developers#api-keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--lte-blue)] hover:underline"
                >
                  dashboard Xendit (Live Mode)
                </a>
              </li>
              <li>
                URL webhook/callback:{" "}
                <code className="rounded bg-white/80 px-1">{callbackUrl}</code>{" "}
                <button type="button" className="text-[var(--lte-blue)] hover:underline" onClick={() => void copyCallback()}>
                  {copied ? "tersalin" : "salin"}
                </button>
              </li>
              <li>
                Tempel URL yang sama ke: FVA Terbayarkan, Retail Outlet Terbayarkan, Invoices
                Terbayarkan, Status Pembayaran eWallet, Rekonsiliasi eWallet.
              </li>
              <li>
                Di Invoice: centang webhook jika invoice expired, dan jika pembayaran diterima setelah
                expiry. Lalu Tes dan Simpan.
              </li>
              <li>Aktifkan Fixed VA per bank dan checklist channel di Payment Settings Xendit.</li>
            </ul>
          </div>
        ) : null}

        {form.provider === "midtrans" || form.provider === "nicepay" ? (
          callbackUrl ? (
            <p className="mt-4 text-[13px] text-[#555]">
              Callback URL: <code className="rounded bg-[#f4f4f4] px-1">{callbackUrl}</code>{" "}
              <button type="button" className="text-[var(--lte-blue)] hover:underline" onClick={() => void copyCallback()}>
                {copied ? "tersalin" : "salin"}
              </button>
            </p>
          ) : null
        ) : null}

        <p className="mt-4 text-[13px] font-semibold text-[#444]">
          <span className="mr-1 text-[#00a65a]">!</span>
          Aktifkan atau non-aktifkan channel pembayaran sesuai dengan yang sudah ditentukan oleh Pihak
          Payment Gateway (jika tidak ada yang dipilih, pilihan default akan digunakan)
        </p>

        <div className="mt-4">
          <Button disabled={busy} onClick={() => void save()}>
            {busy ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
