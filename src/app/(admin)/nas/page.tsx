"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { ScriptGeneratorButton } from "@/components/script-generator-modal";
import { Button, PageHeader, Panel, StatusPill } from "@/components/ui";
import type { NasPublic } from "@/lib/nas-dto";

export default function NasPage() {
  const [rows, setRows] = useState<NasPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/v1/nas");
    const data = (await response.json()) as { rows: NasPublic[] };
    setRows(data.rows);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function testRow(id: string) {
    setBusyId(id);
    setToast(null);
    const response = await fetch(`/api/v1/nas/${id}/test`, { method: "POST" });
    const result = (await response.json()) as { ok?: boolean; message?: string; error?: string };
    setBusyId(null);
    setToast(result.message ?? result.error ?? (result.ok ? "OK" : "Gagal"));
    await load();
  }

  async function removeRow(id: string, name: string) {
    if (!window.confirm(`Hapus router ${name}?`)) return;
    setBusyId(id);
    const response = await fetch(`/api/v1/nas/${id}`, { method: "DELETE" });
    setBusyId(null);
    if (!response.ok) {
      const result = (await response.json()) as { error?: string };
      setToast(result.error ?? "Tidak bisa dihapus.");
      return;
    }
    setToast(`Router ${name} dihapus.`);
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Router NAS"
        description="Daftar MikroTik. Secret dan password API tidak ditampilkan."
        actions={
          <div className="flex flex-wrap gap-2">
            <ScriptGeneratorButton />
            <Link href="/nas/add">
              <Button variant="secondary">Tambah router</Button>
            </Link>
          </div>
        }
      />
      {toast ? (
        <p className="mb-3 rounded-sm border border-[#bce8f1] bg-[#d9edf7] px-3 py-2 text-[13px] text-[#31708f]">
          {toast}
        </p>
      ) : null}
      <Panel title="Daftar router">
        <DataTable
          headers={["Nama", "IP", "Port", "SSL", "Timezone", "Layanan", "Koneksi", ""]}
          rows={rows.map((row) => [
            row.name,
            row.ip,
            String(row.apiPort),
            row.useSsl ? "API-SSL" : "API",
            row.timezone,
            [row.enablePpp ? "PPP" : null, row.enableHotspot ? "HS" : null]
              .filter(Boolean)
              .join(", ") || "—",
            <StatusPill key={`${row.id}-h`} status={row.healthy ? "ok" : "warn"} />,
            <span key={`${row.id}-a`} className="flex gap-2">
              <Button
                variant="secondary"
                disabled={busyId === row.id}
                onClick={() => void testRow(row.id)}
              >
                {busyId === row.id ? "Tes…" : "Tes"}
              </Button>
              <Link
                href={`/nas/${row.id}/edit`}
                className="text-[13px] text-[var(--lte-blue)] hover:underline"
              >
                Ubah
              </Link>
              <Button
                variant="ghost"
                disabled={busyId === row.id}
                onClick={() => void removeRow(row.id, row.name)}
              >
                Hapus
              </Button>
            </span>,
          ])}
        />
        {loading ? (
          <p className="px-3 py-6 text-[13px] text-[var(--lte-muted)]">Memuat router…</p>
        ) : rows.length === 0 ? (
          <p className="px-3 py-6 text-[13px] text-[var(--lte-muted)]">
            Belum ada router. Tambah dari menu.
          </p>
        ) : null}
      </Panel>
    </div>
  );
}
