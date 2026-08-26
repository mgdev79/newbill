"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { Button, Field, PageHeader, Panel, inputClass } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";
import { cn } from "@/lib/utils";

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

const TEMPLATE_VARS: { key: string; desc: string }[] = [
  { key: "$_USERNAME", desc: "username (hotspot | ppp)" },
  { key: "$_PASSWORD", desc: "password (hotspot | ppp)" },
  { key: "$_FULLNAME", desc: "nama pelanggan" },
  { key: "$_CUSTOMERID", desc: "id pelanggan" },
  { key: "$_EMAIL", desc: "email pelanggan" },
  { key: "$_INVOICE", desc: "no. invoice" },
  { key: "$_PLAN", desc: "paket langganan pelanggan" },
  { key: "$_PAYTYPE", desc: "prepaid atau postpaid" },
  { key: "$_ACTIVEON", desc: "tanggal terakhir kali pelanggan diaktifkan" },
  { key: "$_DUEDATE", desc: "tanggal jatuh tempo pelanggan" },
  { key: "$_BASEBILL", desc: "tagihan pokok" },
  { key: "$_SETUPFEE", desc: "biaya instalasi" },
  { key: "$_DEVICEFEE", desc: "sewa perangkat" },
  { key: "$_TAX", desc: "ppn" },
  { key: "$_TOTALBILL", desc: "total tagihan pelanggan" },
  { key: "$_CLIENTAREA", desc: "portal pelanggan (optional)" },
  { key: "$_PORTALPASSWD", desc: "password portal pelanggan" },
  { key: "$_CSNUMBER", desc: "nomor whatsapp layanan pelanggan" },
  { key: "$_COMPANY", desc: "nama perusahaan anda" },
  { key: "$_ADDRESS", desc: "alamat perusahaan anda" },
  { key: "$_PHONE", desc: "nomor telepon anda" },
  { key: "$_BANKACCOUNT", desc: "rekening pembayaran" },
  { key: "$_PAYMENTLINK", desc: "link pembayaran (tanpa login portal | optional)" },
];

type Category = "pendaftaran" | "jatuh_tempo" | "perpanjangan";

function webhookUrlFromBase(base: string) {
  const host = base.replace(/\/$/, "");
  return `${host}/billing/webhook.php`;
}

function defaultTemplates(company: string): Record<Category, string> {
  return {
    pendaftaran: `*$_COMPANY*
Supported by
${company}

*KONFIRMASI REGISTRASI*

Kepada Yth Bapak/Ibu :
*$_FULLNAME,*

Terima kasih telah menjadi pelanggan $_COMPANY.`,
    jatuh_tempo: `*$_COMPANY*
Supported by
${company}

*PENGINGAT TAGIHAN*

Kepada Yth Bapak/Ibu :
*$_FULLNAME,*

Berikut ini merupakan tagihan Anda yang akan jatuh tempo pada $_DUEDATE sebesar $_TOTALBILL.`,
    perpanjangan: `*BUKTI PEMBAYARAN*

Terima kasih telah melunasi pembayaran
Berikut informasi perpanjangan paket anda :

Pelanggan : *$_FULLNAME*
Masa Aktif : *$_ACTIVEON - $_DUEDATE*
Status : *SUDAH DIBAYAR $_TOTALBILL*

Cek Status Pembayaran & Cetak Invoice:`,
  };
}

function sampleVars(company: string, address: string, phone: string, bank: string): Record<string, string> {
  return {
    $_USERNAME: "budi.s",
    $_PASSWORD: "********",
    $_FULLNAME: "Budi Santoso",
    $_CUSTOMERID: "8829103341",
    $_EMAIL: "budi@example.com",
    $_INVOICE: "INV-2026-0812",
    $_PLAN: "Rumah 20Mbps",
    $_PAYTYPE: "prepaid",
    $_ACTIVEON: "05 Agu 2026",
    $_DUEDATE: "05 Sep 2026",
    $_BASEBILL: "Rp 200.000",
    $_SETUPFEE: "Rp 0",
    $_DEVICEFEE: "Rp 0",
    $_TAX: "Rp 0",
    $_TOTALBILL: "Rp 200.000",
    $_CLIENTAREA: "/client",
    $_PORTALPASSWD: "********",
    $_CSNUMBER: "6281234567890",
    $_COMPANY: company,
    $_ADDRESS: address || "Alamat belum diatur",
    $_PHONE: phone || "-",
    $_BANKACCOUNT: bank || "Rekening belum diatur",
    $_PAYMENTLINK: "/invoices",
  };
}

function renderTemplate(text: string, vars: Record<string, string>) {
  let out = text;
  for (const key of Object.keys(vars).sort((a, b) => b.length - a.length)) {
    out = out.split(key).join(vars[key]);
  }
  return out;
}

function navTabClass(active: boolean) {
  return cn(
    "relative -mb-px border px-4 py-2 text-[13px]",
    active
      ? "border-[var(--lte-line)] border-b-white border-t-[3px] border-t-[var(--lte-blue)] bg-white font-semibold text-[var(--lte-blue)]"
      : "border-transparent bg-[#ecf0f5] text-[#444]",
  );
}

const WARNINGS = [
  "NOMOR CS adalah nomor yang akan digunakan untuk dukungan layanan pelanggan",
  "NOMOR PENGIRIM adalah nomor yang akan digunakan untuk mengirimkan pesan whatsapp kepada pelanggan",
  "NOMOR PENGIRIM yang akan diintegrasikan ke Newbill harus sudah dipakai kirim/balas chat beberapa kali",
  "NOMOR PENGIRIM harus selalu online",
  "Gunakan nomor khusus sebagai NOMOR PENGIRIM dan daftarkan untuk whatsapp tipe bisnis",
];
  "NOMOR CS adalah nomor yang akan digunakan untuk dukungan layanan pelanggan",
  "NOMOR PENGIRIM adalah nomor yang akan digunakan untuk mengirimkan pesan whatsapp kepada pelanggan",
  "NOMOR PENGIRIM yang akan diintegrasikan ke Newbill harus sudah dipakai kirim/balas chat beberapa kali",
  "NOMOR PENGIRIM harus selalu online",
  "Gunakan nomor khusus sebagai NOMOR PENGIRIM dan daftarkan untuk whatsapp tipe bisnis",
];

export function WhatsappSettingsForm({
  appBaseUrl,
  companyName,
  companyAddress,
  companyPhone,
  companyBank,
}: {
  appBaseUrl: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyBank: string;
}) {
  const [tab, setTab] = useState<"config" | "templates">("config");

  return (
    <div>
      <PageHeader title="WhatsApp API" description="Konfigurasi provider dan template pesan." />
      <p className="mb-3 rounded-sm border border-[#bce8f1] bg-[#d9edf7] px-3 py-2 text-[13px] text-[#31708f]">
        Provider tersimpan, panggilan API belum diaktifkan — perlu verifikasi endpoint resmi provider sebelum go-live.
      </p>
      <ul className="mb-4 list-disc space-y-1 pl-5 text-[13px] text-[#a94442]">
        {WARNINGS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="mb-0 flex border-b border-[var(--lte-line)] bg-[#ecf0f5] px-2 pt-2">
        <button type="button" onClick={() => setTab("config")} className={navTabClass(tab === "config")}>
          Konfigurasi
        </button>
        <button type="button" onClick={() => setTab("templates")} className={navTabClass(tab === "templates")}>
          Template Pesan
        </button>
      </div>
      <div className="mb-3 border border-t-0 border-[var(--lte-line)] bg-white p-3">
      {tab === "config" ? (
        <WhatsappConfigForm appBaseUrl={appBaseUrl} />
      ) : (
        <WhatsappTemplateForm
          companyName={companyName}
          companyAddress={companyAddress}
          companyPhone={companyPhone}
          companyBank={companyBank}
        />
      )}
      </div>
    </div>
  );
}

function WhatsappConfigForm({ appBaseUrl }: { appBaseUrl: string }) {
  const [provider, setProvider] = useState("wablas");
  const [showWebhook, setShowWebhook] = useState(false);
  const [origin, setOrigin] = useState(appBaseUrl);

  useEffect(() => {
    if (!appBaseUrl) setOrigin(window.location.origin);
  }, [appBaseUrl]);

  const selected = PROVIDERS.find((row) => row.value === provider) ?? PROVIDERS[0];
  const webhookUrl = webhookUrlFromBase(origin || (typeof window !== "undefined" ? window.location.origin : ""));

  return (
    <SettingsForm namespace="whatsapp" title="WhatsApp API" hideHeader>
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

function WhatsappTemplateForm({
  companyName,
  companyAddress,
  companyPhone,
  companyBank,
}: {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyBank: string;
}) {
  const defaults = useMemo(() => defaultTemplates(companyName), [companyName]);
  const [category, setCategory] = useState<Category>("pendaftaran");
  const [copied, setCopied] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<Category, string>>(defaults);

  useEffect(() => {
    void fetch("/api/v1/settings?prefix=whatsapp.template.")
      .then((r) => r.json())
      .then((data: { rows?: { key: string; value: string }[] }) => {
        setDrafts((prev) => {
          const next = { ...prev };
          for (const row of data.rows ?? []) {
            const name = row.key.replace(/^whatsapp\.template\./, "") as Category;
            if (name in next && row.value) next[name] = row.value;
          }
          return next;
        });
      });
  }, []);

  async function copyVar(key: string) {
    await navigator.clipboard.writeText(key);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1200);
  }

  function tesTemplate() {
    const vars = sampleVars(companyName, companyAddress, companyPhone, companyBank);
    setPreview(renderTemplate(drafts[category], vars));
  }

  return (
    <>
      <Panel title="Common Variables">
        <ul className="text-[13px] leading-7 text-[#444]">
          {TEMPLATE_VARS.map((row) => (
            <li key={row.key} className="flex items-start gap-2">
              <button
                type="button"
                className="mt-0.5 inline-flex h-[22px] shrink-0 items-center rounded-sm border border-[var(--lte-line)] bg-[#f4f4f4] px-1.5 text-[11px] font-medium text-[#333] hover:bg-white"
                onClick={() => void copyVar(row.key)}
              >
                {copied === row.key ? "Copied" : "Copy"}
              </button>
              <span>
                <span className="font-semibold">{row.key}</span>
                {" = "}
                {row.desc}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[12px] text-[#555]">
          Anda bisa menggunakan format text yang biasa digunakan di whatsapp, contoh : bold = *bold*, italic :
          _italic_, bold and italic : _*bold and italic*_
        </p>
      </Panel>

      <div className="mt-3">
    <SettingsForm namespace="whatsapp.template" title="Template Pesan" hideHeader skipLoad>

      <div className="md:col-span-2 flex flex-wrap gap-1">
        {(
          [
            ["pendaftaran", "Pendaftaran"],
            ["jatuh_tempo", "Jatuh Tempo"],
            ["perpanjangan", "Perpanjangan"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setCategory(id);
              setPreview(null);
            }}
            className={cn(
              "rounded-full px-3 py-1 text-[12px] font-medium",
              category === id
                ? "bg-[var(--lte-blue)] text-white"
                : "border border-[var(--lte-line)] bg-white text-[#555]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Field className="md:col-span-2" label="Template Notifikasi">
        <textarea
          name={category}
          className="min-h-[220px] w-full rounded-sm border border-[var(--lte-line)] bg-white px-2.5 py-2 font-mono text-[13px] text-[#444] outline-none focus:border-[var(--lte-blue)]"
          value={drafts[category]}
          onChange={(e) => setDrafts({ ...drafts, [category]: e.target.value })}
        />
      </Field>

      {/* Keep other categories in the form so Simpan persists all three. */}
      {(Object.keys(drafts) as Category[])
        .filter((id) => id !== category)
        .map((id) => (
          <textarea key={id} name={id} value={drafts[id]} readOnly hidden />
        ))}

      <div className="md:col-span-2">
        <Button variant="danger" onClick={tesTemplate}>
          Tes Template
        </Button>
        {preview !== null ? (
          <Panel className="mt-3" title="Preview (belum terkirim, integrasi WhatsApp belum aktif)">
            <pre className="whitespace-pre-wrap font-sans text-[13px] text-[#444]">{preview}</pre>
          </Panel>
        ) : null}
      </div>
    </SettingsForm>
      </div>
    </>
  );
}
