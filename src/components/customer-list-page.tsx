"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Button, PageHeader, Panel, StatCard, StatusPill } from "@/components/ui";
import type { AccountStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type Row = {
  id: string;
  customerCode: string;
  name: string;
  username: string;
  serviceType: string;
  plan: string;
  ip: string;
  odp: string;
  dueAt: string;
  renewedAt?: string | null;
  status: string;
  kind: string;
  payMode?: string;
};

const FILTERS: { id: "all" | AccountStatus; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "active", label: "Aktif" },
  { id: "isolated", label: "Isolir" },
  { id: "disabled", label: "Disable" },
  { id: "pending", label: "Registrasi" },
];

function serviceBadge(row: Row) {
  const pay = (row.payMode ?? "prepaid").toLowerCase() === "postpaid" ? "POST" : "PRE";
  const svc = row.serviceType?.toUpperCase() || (row.kind === "hotspot" ? "HOTSPOT" : "PPPOE");
  return `${pay} ${svc}`;
}

export function CustomerListPage({
  title,
  kind,
}: {
  title: string;
  kind: "ppp" | "hotspot";
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [toast, setToast] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const menuRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    const data = await fetch(`/api/v1/customers?kind=${kind}`).then((r) => r.json());
    setRows(data.rows ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [kind]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const matchStatus = status === "all" || row.status === status;
      const haystack =
        `${row.name} ${row.customerCode} ${row.username} ${row.odp}`.toLowerCase();
      return matchStatus && haystack.includes(query.toLowerCase());
    });
  }, [query, rows, status]);

  const selectedIds = useMemo(
    () => filtered.filter((row) => selected[row.id]).map((row) => row.id),
    [filtered, selected],
  );

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((row) => selected[row.id]);

  const summary = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return {
      renewedThisMonth: rows.filter((r) => {
        const d = new Date(r.dueAt);
        return d.getMonth() === month && d.getFullYear() === year;
      }).length,
      isolated: rows.filter((r) => r.status === "isolated").length,
      disabled: rows.filter((r) => r.status === "disabled").length,
    };
  }, [rows]);

  function needSelection(action: string) {
    if (!selectedIds.length) {
      setToast(`Aksi "${action}": centang pelanggan di tabel dulu.`);
      setMenuOpen(false);
      return false;
    }
    return true;
  }

  function runMass(action: string) {
    if (!needSelection(action)) return;
    setToast(`${action}: ${selectedIds.length} pelanggan (siap dihubungkan API massal).`);
    setMenuOpen(false);
  }

  function scrollSearch() {
    setMenuOpen(false);
    document.getElementById("customer-search")?.focus();
  }

  return (
    <div>
      <PageHeader
        title={title}
        description={
          kind === "hotspot" ? "User Hotspot · database Customer" : "User PPP · database Customer"
        }
        breadcrumb={[
          "Home",
          "List Pelanggan",
          kind === "hotspot" ? "User Hotspot" : "User PPP",
        ]}
      />

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-9 items-center gap-2 rounded-sm bg-[#00a65a] px-3 text-[13px] font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-[#008d4c]"
          >
            <span aria-hidden>☰</span>
            Manajemen Pelanggan
            <span className="text-[10px] opacity-90">▾</span>
          </button>
          {menuOpen ? (
            <div className="absolute left-0 z-30 mt-1 min-w-[260px] overflow-hidden rounded-sm border border-[#d2d6de] bg-white shadow-lg">
              <Link
                href={`/customers/${kind}/new`}
                className="block px-3 py-2 text-[13px] text-[#444] hover:bg-[#f4f4f4]"
                onClick={() => setMenuOpen(false)}
              >
                Tambah Pelanggan
              </Link>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[13px] text-[#444] hover:bg-[#f4f4f4]"
                onClick={scrollSearch}
              >
                Cari Pelanggan
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[13px] text-[#444] hover:bg-[#f4f4f4]"
                onClick={() => {
                  setMenuOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                List Pelanggan
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[13px] text-[#444] hover:bg-[#f4f4f4]"
                onClick={() => {
                  setToast("Kirim Notifikasi WA (OLD): butuh WhatsApp API.");
                  setMenuOpen(false);
                }}
              >
                Kirim Notifikasi WA{" "}
                <span className="ml-1 rounded-sm bg-[#f39c12] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  OLD
                </span>
              </button>
              <div className="border-t border-[#eee] px-3 py-1.5 text-[12px] font-semibold text-[#dd4b39]">
                Aksi Checkbox ( Massal )
              </div>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[13px] text-[#444] hover:bg-[#f4f4f4]"
                onClick={() => runMass("Kirim Notifikasi WA")}
              >
                Kirim Notifikasi WA{" "}
                <span className="ml-1 rounded-sm bg-[#00a65a] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  NEW
                </span>
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[13px] text-[#444] hover:bg-[#f4f4f4]"
                onClick={() => runMass("Proses Registrasi")}
              >
                Proses Registrasi
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[13px] text-[#444] hover:bg-[#f4f4f4]"
                onClick={() => runMass("Perpanjang Langganan")}
              >
                Perpanjang Langganan
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[13px] text-[#444] hover:bg-[#f4f4f4]"
                onClick={() => runMass("Ubah Owner Data")}
              >
                Ubah Owner Data
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[13px] text-[#444] hover:bg-[#f4f4f4]"
                onClick={() => runMass("Ubah Tipe Pelanggan")}
              >
                Ubah Tipe Pelanggan
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[13px] text-[#444] hover:bg-[#f4f4f4]"
                onClick={() => runMass("Set Bind Onlogin")}
              >
                Set Bind Onlogin
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[13px] text-[#444] hover:bg-[#f4f4f4]"
                onClick={() => {
                  setToast("Ekspor CSV: segera dihubungkan.");
                  setMenuOpen(false);
                }}
              >
                Ekspor CSV
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[13px] text-[#444] hover:bg-[#f4f4f4]"
                onClick={() => runMass("Aktifkan Pelanggan")}
              >
                Aktifkan Pelanggan
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[13px] text-[#444] hover:bg-[#f4f4f4]"
                onClick={() => runMass("Nonaktifkan Pelanggan")}
              >
                Nonaktifkan Pelanggan
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[13px] text-[#dd4b39] hover:bg-[#f4f4f4]"
                onClick={() => runMass("Hapus Pelanggan")}
              >
                Hapus Pelanggan
              </button>
            </div>
          ) : null}
        </div>

        <div className="grid min-w-[200px] flex-1 gap-3 sm:grid-cols-2 xl:max-w-3xl xl:grid-cols-4">
          <StatCard tone="aqua" label="Total di DB" value={rows.length} />
          <StatCard tone="green" label="Renewal bulan ini" value={summary.renewedThisMonth} />
          <StatCard tone="yellow" label="Isolir" value={summary.isolated} />
          <StatCard tone="red" label="Akun disable" value={summary.disabled} />
        </div>
      </div>

      {toast ? (
        <p className="mb-3 rounded-sm border border-[#bce8f1] bg-[#d9edf7] px-3 py-2 text-[13px] text-[#31708f]">
          {toast}
        </p>
      ) : null}

      <Panel title="Daftar pelanggan">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            id="customer-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama, ID, username, ODP"
            className="h-8 min-w-56 flex-1 rounded-sm border border-[var(--lte-line)] px-2.5 text-[13px]"
          />
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStatus(item.id)}
              className={
                status === item.id
                  ? "rounded-sm bg-[var(--lte-blue)] px-2.5 py-1 text-[12px] text-white"
                  : "rounded-sm border border-[var(--lte-line)] bg-white px-2.5 py-1 text-[12px] text-[#444]"
              }
            >
              {item.label}
            </button>
          ))}
          <Button variant="secondary" onClick={() => void load()}>
            Refresh
          </Button>
        </div>
        {loading ? (
          <p className="py-6 text-center text-[13px] text-[var(--lte-muted)]">Memuat…</p>
        ) : (
          <DataTable
            headers={[
              <input
                key="all"
                type="checkbox"
                checked={allFilteredSelected}
                onChange={(e) => {
                  const next = { ...selected };
                  for (const row of filtered) next[row.id] = e.target.checked;
                  setSelected(next);
                }}
                aria-label="Pilih semua"
              />,
              "ID",
              "Nama",
              "Tipe Service",
              "Paket",
              "IP",
              "ODP",
              "Jatuh tempo",
              "Status",
              "Aksi",
            ]}
            rows={filtered.map((row) => [
              <input
                key={`${row.id}-c`}
                type="checkbox"
                checked={Boolean(selected[row.id])}
                onChange={(e) =>
                  setSelected((prev) => ({ ...prev, [row.id]: e.target.checked }))
                }
                aria-label={`Pilih ${row.customerCode}`}
              />,
              row.customerCode,
              <div key={`${row.id}-n`}>
                <p>{row.name}</p>
                <p className="text-xs text-[var(--lte-muted)]">{row.username}</p>
              </div>,
              <span
                key={`${row.id}-svc`}
                className="inline-block rounded-sm bg-[#00a65a] px-1.5 py-0.5 text-[11px] font-semibold text-white"
              >
                {serviceBadge(row)}
              </span>,
              row.plan,
              row.ip || (kind === "ppp" ? "Automatic" : "—"),
              row.odp || "—",
              formatDate(row.dueAt),
              <StatusPill key={`${row.id}-s`} status={row.status} />,
              <Link
                key={`${row.id}-a`}
                href={`/customers/${kind}/${row.id}`}
                className="text-[var(--lte-blue)] hover:underline"
              >
                Detail
              </Link>,
            ])}
          />
        )}
      </Panel>
    </div>
  );
}
