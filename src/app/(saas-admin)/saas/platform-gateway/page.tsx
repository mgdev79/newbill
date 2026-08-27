"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Field, PageHeader, Panel, inputClass } from "@/components/ui";

type Row = {
  provider: string;
  duitkuEnvironment: "sandbox" | "production";
  duitkuMerchantCode: string;
  hasDuitkuApiKey: boolean;
  hasXenditApiSecret: boolean;
  hasXenditWebhookToken: boolean;
  nicepayMerchantId: string;
  hasNicepayMerchantKey: boolean;
  midtransEnvironment: "sandbox" | "production";
  midtransClientKey: string;
  hasMidtransServerKey: boolean;
};

const empty: Row = {
  provider: "duitku",
  duitkuEnvironment: "sandbox",
  duitkuMerchantCode: "",
  hasDuitkuApiKey: false,
  hasXenditApiSecret: false,
  hasXenditWebhookToken: false,
  nicepayMerchantId: "",
  hasNicepayMerchantKey: false,
  midtransEnvironment: "sandbox",
  midtransClientKey: "",
  hasMidtransServerKey: false,
};

export default function PlatformGatewayPage() {
  const [row, setRow] = useState<Row>(empty);
  const [callbackUrl, setCallbackUrl] = useState("");
  const [secret, setSecret] = useState({
    duitkuApiKey: "",
    xenditApiSecret: "",
    xenditWebhookToken: "",
    nicepayMerchantKey: "",
    midtransServerKey: "",
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const data = await fetch("/api/v1/saas/platform-gateway").then((r) => r.json());
    setRow({ ...empty, ...(data.row ?? {}) });
    setCallbackUrl(data.callbackUrl ?? "");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setBusy(true);
    setSaved(false);
    setError(null);
    const response = await fetch("/api/v1/saas/platform-gateway", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: row.provider,
        duitkuEnvironment: row.duitkuEnvironment,
        duitkuMerchantCode: row.duitkuMerchantCode,
        duitkuApiKey: secret.duitkuApiKey,
        xenditApiSecret: secret.xenditApiSecret,
        xenditWebhookToken: secret.xenditWebhookToken,
        nicepayMerchantId: row.nicepayMerchantId,
        nicepayMerchantKey: secret.nicepayMerchantKey,
        midtransEnvironment: row.midtransEnvironment,
        midtransClientKey: row.midtransClientKey,
        midtransServerKey: secret.midtransServerKey,
      }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "Gagal menyimpan.");
      return;
    }
    setRow({ ...empty, ...(data.row ?? {}) });
    setCallbackUrl(data.callbackUrl ?? "");
    setSecret({
      duitkuApiKey: "",
      xenditApiSecret: "",
      xenditWebhookToken: "",
      nicepayMerchantKey: "",
      midtransServerKey: "",
    });
    setSaved(true);
  }

  return (
    <div>
      <PageHeader
        title="Gateway platform"
        description="Merchant Newbill untuk menagih signup tenant. Terpisah dari Payment Gateway ISP di panel operator."
      />
      {saved ? (
        <p className="mb-3 rounded-sm border border-[#d6e9c6] bg-[#dff0d8] px-3 py-2 text-[13px] text-[#3c763d]">
          Tersimpan.
        </p>
      ) : null}
      {error ? (
        <p className="mb-3 rounded-sm border border-[#ebccd1] bg-[#f2dede] px-3 py-2 text-[13px] text-[#a94442]">
          {error}
        </p>
      ) : null}
      <Panel>
        <div className="grid max-w-xl gap-3">
          <Field label="Provider">
            <select
              className={inputClass}
              value={row.provider}
              onChange={(e) => setRow({ ...row, provider: e.target.value })}
            >
              <option value="duitku">Duitku</option>
              <option value="xendit">Xendit</option>
              <option value="midtrans">Midtrans</option>
              <option value="nicepay">Nicepay</option>
            </select>
          </Field>
          {row.provider === "duitku" ? (
            <>
              <Field label="Environment">
                <select
                  className={inputClass}
                  value={row.duitkuEnvironment}
                  onChange={(e) =>
                    setRow({ ...row, duitkuEnvironment: e.target.value === "sandbox" ? "sandbox" : "production" })
                  }
                >
                  <option value="sandbox">sandbox</option>
                  <option value="production">production</option>
                </select>
              </Field>
              <Field label="Merchant code">
                <input
                  className={inputClass}
                  value={row.duitkuMerchantCode}
                  onChange={(e) => setRow({ ...row, duitkuMerchantCode: e.target.value })}
                />
              </Field>
              <Field label={row.hasDuitkuApiKey ? "API key (kosongkan jika tidak ganti)" : "API key"}>
                <input
                  className={inputClass}
                  type="password"
                  value={secret.duitkuApiKey}
                  onChange={(e) => setSecret({ ...secret, duitkuApiKey: e.target.value })}
                />
              </Field>
            </>
          ) : null}
          {row.provider === "xendit" ? (
            <>
              <Field label={row.hasXenditApiSecret ? "API secret (kosongkan jika tidak ganti)" : "API secret"}>
                <input
                  className={inputClass}
                  type="password"
                  value={secret.xenditApiSecret}
                  onChange={(e) => setSecret({ ...secret, xenditApiSecret: e.target.value })}
                />
              </Field>
              <Field label={row.hasXenditWebhookToken ? "Webhook token (kosongkan jika tidak ganti)" : "Webhook token"}>
                <input
                  className={inputClass}
                  type="password"
                  value={secret.xenditWebhookToken}
                  onChange={(e) => setSecret({ ...secret, xenditWebhookToken: e.target.value })}
                />
              </Field>
            </>
          ) : null}
          {row.provider === "nicepay" ? (
            <>
              <Field label="Merchant ID">
                <input
                  className={inputClass}
                  value={row.nicepayMerchantId}
                  onChange={(e) => setRow({ ...row, nicepayMerchantId: e.target.value })}
                />
              </Field>
              <Field label={row.hasNicepayMerchantKey ? "Merchant key (kosongkan jika tidak ganti)" : "Merchant key"}>
                <input
                  className={inputClass}
                  type="password"
                  value={secret.nicepayMerchantKey}
                  onChange={(e) => setSecret({ ...secret, nicepayMerchantKey: e.target.value })}
                />
              </Field>
            </>
          ) : null}
          {row.provider === "midtrans" ? (
            <>
              <Field label="Environment">
                <select
                  className={inputClass}
                  value={row.midtransEnvironment}
                  onChange={(e) =>
                    setRow({ ...row, midtransEnvironment: e.target.value === "sandbox" ? "sandbox" : "production" })
                  }
                >
                  <option value="sandbox">sandbox</option>
                  <option value="production">production</option>
                </select>
              </Field>
              <Field label="Client key">
                <input
                  className={inputClass}
                  value={row.midtransClientKey}
                  onChange={(e) => setRow({ ...row, midtransClientKey: e.target.value })}
                />
              </Field>
              <Field label={row.hasMidtransServerKey ? "Server key (kosongkan jika tidak ganti)" : "Server key"}>
                <input
                  className={inputClass}
                  type="password"
                  value={secret.midtransServerKey}
                  onChange={(e) => setSecret({ ...secret, midtransServerKey: e.target.value })}
                />
              </Field>
            </>
          ) : null}
          <Field label="URL callback (pasang di dashboard merchant platform)">
            <div className="flex gap-2">
              <input className={inputClass} readOnly value={callbackUrl} />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (!callbackUrl) return;
                  void navigator.clipboard.writeText(callbackUrl).then(() => {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1500);
                  });
                }}
              >
                {copied ? "Disalin" : "Salin"}
              </Button>
            </div>
          </Field>
        </div>
        <Button className="mt-4" disabled={busy} onClick={() => void save()}>
          {busy ? "Menyimpan…" : "Simpan"}
        </Button>
      </Panel>
    </div>
  );
}
