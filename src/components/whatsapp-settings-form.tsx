"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { Field, inputClass } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";

const PROVIDERS = [
  {
    value: "wablas",
    label: "Wablas (https://wablas.com)",
    registerHost: "wablas.com",
    registerUrl: "https://wablas.com",
  },
] as const;

const DELAYED = [
  "Invoice Otomatis (08:00 dan 20:00)",
  "Fitur Kirim Invoice Manual",
  "Fitur Kirim Pemberitahuan Manual",
];

const NOT_DELAYED = ["Konfirmasi Pembayaran", "Pesan Webhook", "Pesan Autoreply"];

function webhookUrlFromBase(base: string) {
  const host = base.replace(/\/$/, "");
  return `${host}/billing/webhook.php`;
}

export function WhatsappSettingsForm({ appBaseUrl }: { appBaseUrl: string }) {
  const [provider, setProvider] = useState("wablas");
  const [showWebhook, setShowWebhook] = useState(false);
  const [origin, setOrigin] = useState(appBaseUrl);

  useEffect(() => {
    if (!appBaseUrl) setOrigin(window.location.origin);
  }, [appBaseUrl]);

  const selected = PROVIDERS.find((row) => row.value === provider) ?? PROVIDERS[0];
  const webhookUrl = webhookUrlFromBase(origin || (typeof window !== "undefined" ? window.location.origin : ""));

  return (
    <SettingsForm
      namespace="whatsapp"
      title="WhatsApp API"
      notice="Provider tersimpan, panggilan API belum diaktifkan — perlu verifikasi endpoint resmi provider sebelum go-live."
    >
      <Field
        className="md:col-span-2"
        label="Provider"
        hint={
          <>
            Akun di{" "}
            <a href={selected.registerUrl} target="_blank" rel="noreferrer" className="text-[var(--lte-blue)] hover:underline">
              {selected.registerHost}
            </a>{" "}
            diperlukan, klik untuk registrasi
          </>
        }
      >
        <select
          name="provider"
          className={inputClass}
          defaultValue="wablas"
          onChange={(e) => setProvider(e.target.value)}
        >
          {PROVIDERS.map((row) => (
            <option key={row.value} value={row.value}>
              {row.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        className="md:col-span-2"
        label="Version"
        hint="QR-Code Wablas harus di-scan dengan versi WhatsApp yang sesuai."
      >
        <div className="flex flex-wrap gap-4 text-[13px] font-normal text-[#444]">
          <label className="inline-flex items-center gap-1.5 font-normal">
            <input type="radio" name="version" value="v1" className="accent-[var(--lte-blue)]" />
            Standard [V1]
          </label>
          <label className="inline-flex items-center gap-1.5 font-normal">
            <input type="radio" name="version" value="v2" defaultChecked className="accent-[var(--lte-blue)]" />
            Multi Device [V2]
          </label>
        </div>
      </Field>

      <Field className="md:col-span-2" label="Periode Notifikasi Invoice">
        <select name="invoice_notice_period" className={inputClass} defaultValue="h5_h0">
          <option value="h5_h0">H-5 &amp; H-0 # Dari Tgl Jatuh Tempo</option>
          <option value="h3_h0">H-3 &amp; H-0 # Dari Tgl Jatuh Tempo</option>
          <option value="h1">H-1 # Dari Tgl Jatuh Tempo</option>
          <option value="off">Off</option>
        </select>
      </Field>

      <div className="md:col-span-2 grid gap-2 text-[13px] font-normal text-[#444]">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="notify_register" value="1" defaultChecked className="accent-[var(--lte-blue)]" />
          Notifikasi Pendaftaran
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="notify_payment" value="1" defaultChecked className="accent-[var(--lte-blue)]" />
          Notifikasi Pembayaran
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="notify_daily_suspend" value="1" className="accent-[var(--lte-blue)]" />
          Notifikasi Harian Pelanggan Suspend
        </label>
      </div>

      <Field label="Jumlah Pesan 1x Kirim">
        <select name="send_batch" className={inputClass} defaultValue="5">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={String(n)}>
              {n} Pesan
            </option>
          ))}
        </select>
      </Field>

      <Field label="Jeda Pengiriman (Random)">
        <select name="send_delay" className={inputClass} defaultValue="3-5">
          <option value="1-3">1 menit - 3 menit</option>
          <option value="3-5">3 menit - 5 menit</option>
          <option value="5-10">5 menit - 10 menit</option>
        </select>
      </Field>

      <div className="md:col-span-2 rounded-sm border border-[var(--lte-line)] bg-[#fafafa] px-3 py-3">
        <p className="mb-2 text-[12px] font-semibold text-[#555]">
          Penerapan Jeda Waktu Kirim Pesan Whatsapp
        </p>
        <div className="grid gap-3 text-[13px] text-[#444] sm:grid-cols-2">
          <ul className="space-y-1.5">
            {DELAYED.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-[#00a65a]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <ul className="space-y-1.5">
            {NOT_DELAYED.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <X className="mt-0.5 size-4 shrink-0 text-[#dd4b39]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="md:col-span-2">
        <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold text-[#555]">
          <span>Webhook</span>
          <button
            type="button"
            className="font-normal text-[var(--lte-blue)] hover:underline"
            onClick={() => setShowWebhook((open) => !open)}
          >
            {showWebhook ? "Hide Webhook Command" : "Show Webhook Command"}
          </button>
        </div>
        {showWebhook ? (
          <pre className="mt-2 overflow-x-auto rounded-sm border border-[var(--lte-line)] bg-[#f4f4f4] px-3 py-2 font-mono text-[12px] font-normal text-[#444]">
            {webhookUrl}
          </pre>
        ) : null}
        <input type="hidden" name="webhook_url" value={webhookUrl} />
      </div>

      <Field label="Domain API">
        <input name="api_domain" className={inputClass} placeholder="solo.wablas.com" />
      </Field>

      <Field label="Token API">
        <input name="token" type="password" className={inputClass} autoComplete="off" />
      </Field>

      <Field
        className="md:col-span-2"
        label={
          <>
            Nomor Pengirim{" "}
            <a href="#" className="font-normal text-[var(--lte-blue)] hover:underline">
              Daftar Kode Negara
            </a>
          </>
        }
      >
        <input name="sender_number" className={inputClass} placeholder="628xxxxxxxxxx" />
      </Field>
    </SettingsForm>
  );
}
