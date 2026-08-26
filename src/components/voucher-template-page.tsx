"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, PageHeader, Panel, StatusPill } from "@/components/ui";
import { renderVoucherTemplate } from "@/lib/voucher-template";

type Row = {
  id: string;
  name: string;
  accessBy: string;
  enabled: boolean;
  html: string;
};

const SAMPLE_ITEMS = [
  {
    number: 1,
    code: "NBDEMO01",
    secret: "pass1234",
    total: "25.000",
    plan_name: "Hotspot 1 Hari",
    bandwidth: "10M/10M",
    validperiod: "1d",
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

export function VoucherTemplatePage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const menuRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    const data = await fetch("/api/v1/voucher-templates").then((r) => r.json());
    setRows(data.rows ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selectedIds = useMemo(
    () => rows.filter((row) => selected[row.id]).map((row) => row.id),
    [rows, selected],
  );

  async function toggleEnabled(row: Row) {
    await fetch(`/api/v1/voucher-templates/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !row.enabled }),
    });
    await load();
  }

  async function deleteSelected() {
    if (!selectedIds.length) {
      setToast("Centang template yang mau dihapus.");
      setMenuOpen(false);
      return;
    }
    if (!window.confirm(`Hapus ${selectedIds.length} template?`)) return;
    for (const id of selectedIds) {
      await fetch(`/api/v1/voucher-templates/${id}`, { method: "DELETE" });
    }
    setSelected({});
    setToast(`${selectedIds.length} template dihapus.`);
    setMenuOpen(false);
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Template voucher"
        description="HTML kustom untuk cetak kartu voucher (Hotspot / PPP)."
        breadcrumb={["Home", "Pengaturan", "Template voucher"]}
      />

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-9 items-center gap-2 rounded-sm bg-[#00a65a] px-3 text-[13px] font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-[#008d4c]"
          >
            <span aria-hidden>☰</span>
            Template Voucher
            <span className="text-[10px] opacity-90">▾</span>
          </button>
          {menuOpen ? (
            <div className="absolute left-0 z-30 mt-1 min-w-[220px] overflow-hidden rounded-sm border border-[#d2d6de] bg-white shadow-lg">
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[13px] text-[#444] hover:bg-[#f4f4f4]"
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/settings/voucher-template/add");
                }}
              >
                Buat Template
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[13px] text-[#dd4b39] hover:bg-[#f4f4f4]"
                onClick={() => void deleteSelected()}
              >
                Hapus Yang Dipilih
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {toast ? (
        <div className="mb-3 rounded-sm border border-[#00a65a]/40 bg-[#dff0d8] px-3 py-2 text-[13px] text-[#3c763d]">
          {toast}
        </div>
      ) : null}

      <Panel>
        {loading ? (
          <p className="text-[13px] text-[var(--lte-muted)]">Memuat…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--lte-line)] bg-[#f9f9f9] text-[12px] uppercase tracking-wide text-[var(--lte-muted)]">
                  <th className="w-10 px-2 py-2">
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && rows.every((r) => selected[r.id])}
                      onChange={(e) => {
                        const next: Record<string, boolean> = {};
                        if (e.target.checked) {
                          for (const row of rows) next[row.id] = true;
                        }
                        setSelected(next);
                      }}
                    />
                  </th>
                  <th className="px-2 py-2">Nama</th>
                  <th className="px-2 py-2">Bisa Diakses Oleh</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--lte-line)] hover:bg-[#fafafa]">
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={!!selected[row.id]}
                        onChange={(e) =>
                          setSelected((prev) => ({ ...prev, [row.id]: e.target.checked }))
                        }
                      />
                    </td>
                    <td className="px-2 py-2 font-medium text-[#333]">{row.name}</td>
                    <td className="px-2 py-2 text-[var(--lte-muted)]">{row.accessBy}</td>
                    <td className="px-2 py-2">
                      <button type="button" onClick={() => void toggleEnabled(row)}>
                        <StatusPill status={row.enabled ? "active" : "disabled"} />
                      </button>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Button
                          type="button"
                          variant="secondary"
                          className="!h-7 !px-2 !text-[11px]"
                          onClick={() =>
                            openPreviewHtml(
                              renderVoucherTemplate(row.html, SAMPLE_ITEMS),
                              `Preview ${row.name}`,
                            )
                          }
                        >
                          Preview
                        </Button>
                        <Link
                          href={`/settings/voucher-template/${row.id}/edit`}
                          className="inline-flex h-7 items-center justify-center rounded-sm border border-[var(--lte-line)] bg-white px-2 text-[11px] font-medium text-[#444] hover:bg-[#f4f4f4]"
                        >
                          Edit
                        </Link>
                        <Button
                          type="button"
                          variant="danger"
                          className="!h-7 !px-2 !text-[11px]"
                          onClick={async () => {
                            if (!window.confirm(`Hapus template ${row.name}?`)) return;
                            await fetch(`/api/v1/voucher-templates/${row.id}`, {
                              method: "DELETE",
                            });
                            await load();
                          }}
                        >
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-6 text-center text-[var(--lte-muted)]">
                      Belum ada template. Klik Template Voucher → Buat Template.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
