"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button, Field, PageHeader, Panel, inputClass, textareaClass } from "@/components/ui";
import {
  DEFAULT_VOUCHER_HTML,
  VOUCHER_TEMPLATE_VARS,
  renderVoucherTemplate,
} from "@/lib/voucher-template";

const SAMPLE_ITEMS = [
  {
    number: 1,
    code: "NBDEMO01",
    secret: "pass1234",
    total: "25.000",
    plan_name: "Hotspot 1 Hari",
    bandwidth: "10M/10M",
    validperiod: "1d",
    timelimit: "—",
    datalimit: "—",
    type: "HOTSPOT",
    company: "Newbill ISP",
    phone: "08123456789",
    hotspot_url: "http://hotspot.local",
    qrcode: "http://hotspot.local",
  },
  {
    number: 2,
    code: "NBDEMO02",
    secret: "pass5678",
    total: "25.000",
    plan_name: "Hotspot 1 Hari",
    bandwidth: "10M/10M",
    validperiod: "1d",
    timelimit: "—",
    datalimit: "—",
    type: "HOTSPOT",
    company: "Newbill ISP",
    phone: "08123456789",
    hotspot_url: "http://hotspot.local",
    qrcode: "http://hotspot.local",
  },
];

function openPreviewHtml(html: string, title: string) {
  const page = `<!doctype html><html><head><meta charset="utf-8"/><title>${title}</title></head><body>${html}</body></html>`;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(page);
  win.document.close();
}

export function VoucherTemplateEditor({
  templateId,
}: {
  templateId?: string;
}) {
  const router = useRouter();
  const editing = Boolean(templateId);
  const [loading, setLoading] = useState(Boolean(templateId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [accessBy, setAccessBy] = useState("all");
  const [enabled, setEnabled] = useState(true);
  const [htmlDraft, setHtmlDraft] = useState(DEFAULT_VOUCHER_HTML);
  const [showVars, setShowVars] = useState(false);

  useEffect(() => {
    if (!templateId) return;
    void (async () => {
      setLoading(true);
      const data = await fetch(`/api/v1/voucher-templates/${templateId}`).then((r) =>
        r.json(),
      );
      if (!data.row) {
        setError("Template tidak ditemukan.");
        setLoading(false);
        return;
      }
      setName(data.row.name);
      setAccessBy(data.row.accessBy ?? "all");
      setEnabled(data.row.enabled !== false);
      setHtmlDraft(data.row.html || DEFAULT_VOUCHER_HTML);
      setLoading(false);
    })();
  }, [templateId]);

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payload = { name, accessBy, html: htmlDraft, enabled };
    const response = await fetch(
      editing ? `/api/v1/voucher-templates/${templateId}` : "/api/v1/voucher-templates",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Gagal simpan template.");
      return;
    }
    router.push("/settings/voucher-template");
    router.refresh();
  }

  const lineCount = Math.max(htmlDraft.split("\n").length, 20);

  return (
    <div>
      <PageHeader
        title={editing ? "Edit Template Voucher" : "Buat Template Voucher"}
        description="HTML kustom untuk cetak kartu voucher."
        breadcrumb={[
          "Home",
          "Pengaturan",
          "Template voucher",
          editing ? "Edit" : "Buat",
        ]}
      />

      <Panel>
        {loading ? (
          <p className="text-[13px] text-[var(--lte-muted)]">Memuat…</p>
        ) : (
          <form onSubmit={onSave} className="space-y-4">
            <div className="rounded-sm border border-[#d6e9c6] bg-[#dff0d8] px-3 py-2 text-[13px] text-[#3c763d]">
              <p className="font-semibold">Catatan gambar template</p>
              <p className="mt-1">
                URL eksternal (direct link ke image) untuk logo/background: tidak support
                shortlink atau URL terenkripsi.
              </p>
              <p className="mt-1 text-[12px]">
                Contoh host: Linkpicture.com · Im.ge · PasteBoard.co · Imgur.com ·
                Postimages.org · Imgbb.com
              </p>
            </div>

            {error ? (
              <div className="rounded-sm border border-[#dd4b39]/40 bg-[#f2dede] px-3 py-2 text-[13px] text-[#a94442]">
                {error}
              </div>
            ) : null}

            <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
              <Field label="Nama Template">
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jangan Sertakan KARAKTER SIMBOL atau SPASI pada Nama Template"
                  className={inputClass}
                  pattern="[A-Za-z0-9_-]+"
                  title="Huruf/angka/dash/underscore, tanpa spasi"
                />
              </Field>
              <Field label="Bisa Diakses Oleh">
                <select
                  value={accessBy}
                  onChange={(e) => setAccessBy(e.target.value)}
                  className={inputClass}
                >
                  <option value="all">Semua User</option>
                  <option value="admin">Admin saja</option>
                </select>
              </Field>
              <Field label="Status">
                <select
                  value={enabled ? "yes" : "no"}
                  onChange={(e) => setEnabled(e.target.value === "yes")}
                  className={inputClass}
                >
                  <option value="yes">Enable</option>
                  <option value="no">Disable</option>
                </select>
              </Field>
            </div>

            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2 text-[12px] font-semibold text-[#555]">
                <span>HTML Kostum</span>
                <span className="text-[var(--lte-muted)]">—</span>
                <button
                  type="button"
                  className="font-semibold text-[var(--lte-blue)] hover:underline"
                  onClick={() => setShowVars((v) => !v)}
                >
                  Variable Yang Digunakan
                </button>
              </div>

              {showVars ? (
                <div className="mb-3 rounded-sm border border-[var(--lte-line)] bg-[#fafafa] p-3 text-[12px] text-[#555]">
                  <p className="mb-2 font-semibold text-[#333]">Variable Yang Bisa Digunakan</p>
                  <p className="mb-2">
                    Loop kartu: <code>{"{{#each}}"}</code> … <code>{"{{/each}}"}</code>
                  </p>
                  <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                    {VOUCHER_TEMPLATE_VARS.map((item) => (
                      <li key={item.key}>
                        <code>{item.key}</code> — {item.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="max-h-[min(70vh,640px)] overflow-auto rounded-sm border border-[var(--lte-line)] bg-[#1e282c]">
                <div className="flex min-h-[420px]">
                  <div
                    aria-hidden
                    className="sticky left-0 select-none border-r border-[#2c3b41] bg-[#1a2226] px-2 py-3 text-right font-mono text-[11px] leading-5 text-[#73879c]"
                  >
                    {Array.from({ length: lineCount }, (_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                  <textarea
                    value={htmlDraft}
                    onChange={(e) => setHtmlDraft(e.target.value)}
                    spellCheck={false}
                    className={`${textareaClass} min-h-[420px] flex-1 resize-none overflow-hidden border-0 bg-transparent leading-5 focus:border-transparent`}
                    style={{ height: Math.max(420, lineCount * 20 + 24) }}
                  />
                </div>
              </div>
              <p className="mt-2 text-[12px] font-semibold uppercase tracking-wide text-[#dd4b39]">
                Paste kode HTML antara &quot;START CUSTOM HTML&quot; dan &quot;END CUSTOM HTML&quot;
              </p>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-[var(--lte-line)] pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? "Menyimpan…" : editing ? "Simpan Template" : "Buat Template"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  openPreviewHtml(
                    renderVoucherTemplate(htmlDraft, SAMPLE_ITEMS),
                    "Preview template",
                  )
                }
              >
                Preview
              </Button>
              <Link
                href="/settings/voucher-template"
                className="inline-flex h-8 items-center justify-center rounded-sm border border-[var(--lte-line)] bg-white px-3 text-[13px] font-medium text-[#444] hover:bg-[#f4f4f4]"
              >
                Batal
              </Link>
            </div>
          </form>
        )}
      </Panel>
    </div>
  );
}
