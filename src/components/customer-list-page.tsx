"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Ban,
  Info,
  Pencil,
  Printer,
  RefreshCw,
  Trash2,
  TriangleAlert,
  Users,
  Zap,
} from "lucide-react";
import { DataTable } from "@/components/data-table";
import { Button, PageHeader, Panel, StatCard, StatusPill, inputClass } from "@/components/ui";
import { cn, formatDateTime } from "@/lib/utils";

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
  registeredAt?: string | null;
  latestInvoiceId?: string | null;
  owner?: string;
  note?: string;
  status: string;
  kind: string;
  payMode?: string;
};

const PAGE_SIZES = [10, 25, 50, 100];

type SortKey =
  | "customerCode"
  | "name"
  | "serviceType"
  | "plan"
  | "ip"
  | "odp"
  | "renewedAt"
  | "dueAt"
  | "status"
  | "owner"
  | "renew"
  | "aksi";

function sortValue(row: Row, key: SortKey): string | number {
  switch (key) {
    case "customerCode":
      return row.customerCode.toLowerCase();
    case "name":
      return row.name.toLowerCase();
    case "serviceType":
      return serviceBadge(row);
    case "plan":
      return row.plan.toLowerCase();
    case "ip":
      return (row.ip || "automatic").toLowerCase();
    case "odp":
      return (row.odp || "").toLowerCase();
    case "renewedAt":
    case "renew":
      return row.renewedAt ? new Date(row.renewedAt).getTime() : 0;
    case "dueAt":
      return new Date(row.dueAt).getTime();
    case "status":
      return row.status.toLowerCase();
    case "owner":
      return (row.owner || "").toLowerCase();
    case "aksi":
      return row.name.toLowerCase();
    default:
      return "";
  }
}

function SortHead({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  column: SortKey;
  sortKey: SortKey | null;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
}) {
  const active = sortKey === column;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className="inline-flex items-center gap-1.5 font-semibold text-[#333]"
    >
      {label}
      <span className="inline-flex flex-col -space-y-0.5 text-[8px] leading-none" aria-hidden>
        <span className={active && sortDir === "asc" ? "text-[#444]" : "text-[#c5c5c5]"}>▲</span>
        <span className={active && sortDir === "desc" ? "text-[#444]" : "text-[#c5c5c5]"}>▼</span>
      </span>
    </button>
  );
}

function inThisMonth(iso: string | null | undefined) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function serviceBadge(row: Row) {
  const pay = (row.payMode ?? "prepaid").toLowerCase() === "postpaid" ? "POST" : "PRE";
  const svc = row.serviceType?.toUpperCase() || (row.kind === "hotspot" ? "HOTSPOT" : "PPPOE");
  return `${pay} ${svc}`;
}

function IconBtn({
  title,
  className,
  disabled,
  onClick,
  href,
  children,
}: {
  title: string;
  className: string;
  disabled?: boolean;
  onClick?: () => void;
  href?: string;
  children: ReactNode;
}) {
  const styles = cn(
    "inline-flex size-7 items-center justify-center rounded-sm text-white disabled:cursor-not-allowed disabled:opacity-40",
    className,
  );
  if (href && !disabled) {
    return (
      <Link href={href} title={title} className={styles}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" title={title} className={styles} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
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
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [toast, setToast] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const menuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetch(`/api/v1/customers?kind=${kind}`).then((r) => r.json());
      setRows(data.rows ?? []);
    } catch {
      setToast("Gagal memuat pelanggan.");
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      `${row.name} ${row.customerCode} ${row.username} ${row.odp} ${row.owner ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [query, rows]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const list = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [query, pageSize, kind, sortKey, sortDir]);

  const selectedIds = useMemo(
    () => filtered.filter((row) => selected[row.id]).map((row) => row.id),
    [filtered, selected],
  );

  const allPageSelected =
    pageRows.length > 0 && pageRows.every((row) => selected[row.id]);

  const summary = useMemo(
    () => ({
      registeredThisMonth: rows.filter((r) => inThisMonth(r.registeredAt)).length,
      renewedThisMonth: rows.filter((r) => inThisMonth(r.renewedAt)).length,
      isolated: rows.filter((r) => r.status === "isolated").length,
      disabled: rows.filter((r) => r.status === "disabled").length,
    }),
    [rows],
  );

  function needSelection(action: string) {
    if (!selectedIds.length) {
      setToast(`Aksi "${action}": centang pelanggan di tabel dulu.`);
      setMenuOpen(false);
      return false;
    }
    return true;
  }

  function runMassStub(action: string) {
    if (!needSelection(action)) return;
    setToast(`${action}: ${selectedIds.length} pelanggan (siap dihubungkan API massal).`);
    setMenuOpen(false);
  }

  async function patchStatus(ids: string[], status: string, label: string) {
    setMenuOpen(false);
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/v1/customers/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }),
      ),
    );
    setToast(`${label}: ${ids.length} pelanggan.`);
    await load();
  }

  async function renewOne(id: string) {
    setBusyId(id);
    setToast(null);
    const response = await fetch(`/api/v1/customers/${id}/renew`, { method: "POST" });
    const data = (await response.json()) as { error?: string };
    setBusyId(null);
    if (!response.ok) {
      setToast(data.error ?? "Gagal perpanjang.");
      return false;
    }
    return true;
  }

  async function renewSelected() {
    if (!needSelection("Perpanjang Langganan")) return;
    setMenuOpen(false);
    let ok = 0;
    for (const id of selectedIds) {
      if (await renewOne(id)) ok += 1;
    }
    setToast(`Perpanjang langganan: ${ok} pelanggan.`);
    await load();
  }

  async function deleteOne(id: string, name: string) {
    if (!window.confirm(`Hapus pelanggan ${name}?`)) return;
    setBusyId(id);
    await fetch(`/api/v1/customers/${id}`, { method: "DELETE" });
    setBusyId(null);
    setSelected((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    await load();
  }

  async function deleteSelected() {
    if (!needSelection("Hapus Pelanggan")) return;
    setMenuOpen(false);
    if (!window.confirm(`Hapus ${selectedIds.length} pelanggan tercentang?`)) return;
    await Promise.all(selectedIds.map((id) => fetch(`/api/v1/customers/${id}`, { method: "DELETE" })));
    setSelected({});
    setToast(`${selectedIds.length} pelanggan dihapus.`);
    await load();
  }

  function scrollSearch() {
    setMenuOpen(false);
    document.getElementById("customer-search")?.focus();
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  const from = filtered.length ? (safePage - 1) * pageSize + 1 : 0;
  const to = Math.min(safePage * pageSize, filtered.length);

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

      <div className="relative mb-3" ref={menuRef}>
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
              onClick={() => runMassStub("Kirim Notifikasi WA")}
            >
              Kirim Notifikasi WA{" "}
              <span className="ml-1 rounded-sm bg-[#00a65a] px-1.5 py-0.5 text-[10px] font-bold text-white">
                NEW
              </span>
            </button>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-[13px] text-[#444] hover:bg-[#f4f4f4]"
              onClick={() => {
                if (!needSelection("Proses Registrasi")) return;
                void patchStatus(selectedIds, "active", "Proses registrasi");
              }}
            >
              Proses Registrasi
            </button>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-[13px] text-[#444] hover:bg-[#f4f4f4]"
              onClick={() => void renewSelected()}
            >
              Perpanjang Langganan
            </button>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-[13px] text-[#444] hover:bg-[#f4f4f4]"
              onClick={() => runMassStub("Ubah Owner Data")}
            >
              Ubah Owner Data
            </button>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-[13px] text-[#444] hover:bg-[#f4f4f4]"
              onClick={() => runMassStub("Ubah Tipe Pelanggan")}
            >
              Ubah Tipe Pelanggan
            </button>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-[13px] text-[#444] hover:bg-[#f4f4f4]"
              onClick={() => runMassStub("Set Bind Onlogin")}
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
              onClick={() => {
                if (!needSelection("Aktifkan Pelanggan")) return;
                void patchStatus(selectedIds, "active", "Aktifkan");
              }}
            >
              Aktifkan Pelanggan
            </button>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-[13px] text-[#444] hover:bg-[#f4f4f4]"
              onClick={() => {
                if (!needSelection("Nonaktifkan Pelanggan")) return;
                void patchStatus(selectedIds, "disabled", "Nonaktifkan");
              }}
            >
              Nonaktifkan Pelanggan
            </button>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-[13px] text-[#dd4b39] hover:bg-[#f4f4f4]"
              onClick={() => void deleteSelected()}
            >
              Hapus Pelanggan
            </button>
          </div>
        ) : null}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          tone="aqua"
          label="Registrasi bulan ini"
          value={summary.registeredThisMonth}
          icon={<Users className="size-8 opacity-90" />}
        />
        <StatCard
          tone="green"
          label="Renewal bulan ini"
          value={summary.renewedThisMonth}
          icon={<RefreshCw className="size-8 opacity-90" />}
        />
        <StatCard
          tone="yellow"
          label="Pelanggan isolir"
          value={summary.isolated}
          icon={<TriangleAlert className="size-8 opacity-90" />}
        />
        <StatCard
          tone="red"
          label="Akun disable"
          value={summary.disabled}
          icon={<Ban className="size-8 opacity-90" />}
        />
      </div>

      {toast ? (
        <p className="mb-3 rounded-sm border border-[#bce8f1] bg-[#d9edf7] px-3 py-2 text-[13px] text-[#31708f]">
          {toast}
        </p>
      ) : null}

      <Panel>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-[13px] text-[#444]">
            Show
            <select
              className={cn(inputClass, "w-[70px]")}
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            entries
          </label>
          <label className="flex items-center gap-2 text-[13px] text-[#444]">
            Search:
            <input
              id="customer-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={cn(inputClass, "w-[220px]")}
            />
          </label>
        </div>
        {loading ? (
          <p className="py-6 text-center text-[13px] text-[var(--lte-muted)]">Memuat…</p>
        ) : (
          <>
            <DataTable
              headers={[
                <input
                  key="all"
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={(e) => {
                    const next = { ...selected };
                    for (const row of pageRows) next[row.id] = e.target.checked;
                    setSelected(next);
                  }}
                  aria-label="Pilih semua di halaman ini"
                />,
                <SortHead key="h-id" label="ID Pelanggan" column="customerCode" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />,
                <SortHead key="h-name" label="Nama" column="name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />,
                <SortHead key="h-svc" label="Tipe Service" column="serviceType" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />,
                <SortHead key="h-plan" label="Paket Langganan" column="plan" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />,
                <SortHead key="h-ip" label="IP Address" column="ip" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />,
                <SortHead key="h-odp" label="ODP" column="odp" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />,
                <SortHead key="h-ren" label="Diperpanjang" column="renewedAt" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />,
                <SortHead key="h-due" label="Jatuh Tempo" column="dueAt" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />,
                <SortHead key="h-st" label="Status" column="status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />,
                <SortHead key="h-own" label="Owner Data" column="owner" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />,
                <SortHead key="h-rp" label="Renew | Print" column="renew" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />,
                <SortHead key="h-aksi" label="Aksi" column="aksi" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />,
              ]}
              rows={pageRows.map((row) => [
                <input
                  key={`${row.id}-c`}
                  type="checkbox"
                  checked={Boolean(selected[row.id])}
                  onChange={(e) =>
                    setSelected((prev) => ({ ...prev, [row.id]: e.target.checked }))
                  }
                  aria-label={`Pilih ${row.customerCode}`}
                />,
                <Link
                  key={`${row.id}-id`}
                  href={`/customers/${kind}/${row.id}`}
                  className="font-medium text-[var(--lte-blue)] hover:underline"
                >
                  {row.customerCode}
                </Link>,
                <div key={`${row.id}-n`} className="flex items-start gap-1.5">
                  <span title={row.note || row.odp || row.username} className="mt-0.5 text-[#888]">
                    <Info className="size-3.5" />
                  </span>
                  <div>
                    <p>{row.name}</p>
                    <p className="text-[11px] text-[var(--lte-muted)]">{row.username}</p>
                  </div>
                </div>,
                <span
                  key={`${row.id}-svc`}
                  className="inline-block rounded-sm bg-[#00a65a] px-1.5 py-0.5 text-[11px] font-semibold text-white"
                >
                  {serviceBadge(row)}
                </span>,
                row.plan,
                row.ip || "Automatic",
                row.odp || "—",
                formatDateTime(row.renewedAt),
                <span key={`${row.id}-due`} className="text-[var(--lte-blue)]">
                  {formatDateTime(row.dueAt)}
                </span>,
                <StatusPill key={`${row.id}-s`} status={row.status} />,
                row.owner || "admin",
                <div key={`${row.id}-rp`} className="flex items-center gap-1">
                  <IconBtn
                    title="Renew"
                    className="bg-[#3c8dbc] hover:bg-[#367fa9]"
                    disabled={busyId === row.id}
                    onClick={() => {
                      void renewOne(row.id).then((ok) => {
                        if (ok) void load();
                      });
                    }}
                  >
                    <Zap className="size-3.5 fill-current" />
                  </IconBtn>
                  <IconBtn
                    title="Print"
                    className="bg-[#00a65a] hover:bg-[#008d4c]"
                    disabled={!row.latestInvoiceId}
                    href={`/customers/${kind}/added/${row.id}`}
                  >
                    <Printer className="size-3.5" />
                  </IconBtn>
                </div>,
                <div key={`${row.id}-a`} className="flex items-center gap-1">
                  <IconBtn
                    title="Edit"
                    className="bg-[#00c0ef] hover:bg-[#00a7d0]"
                    href={`/customers/${kind}/${row.id}`}
                  >
                    <Pencil className="size-3.5" />
                  </IconBtn>
                  <IconBtn
                    title="Hapus"
                    className="bg-[#f39c12] hover:bg-[#e08e0b]"
                    disabled={busyId === row.id}
                    onClick={() => void deleteOne(row.id, row.name)}
                  >
                    <Trash2 className="size-3.5" />
                  </IconBtn>
                </div>,
              ])}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px] text-[#444]">
              <p>
                Showing {from} to {to} of {filtered.length} entries
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="secondary"
                  className="h-7 px-2"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                {Array.from({ length: pageCount }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === pageCount || Math.abs(n - safePage) <= 2)
                  .map((n, index, list) => (
                    <span key={n} className="contents">
                      {index > 0 && list[index - 1] !== n - 1 ? (
                        <span className="px-1 text-[var(--lte-muted)]">…</span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setPage(n)}
                        className={
                          n === safePage
                            ? "inline-flex h-7 min-w-7 items-center justify-center rounded-sm bg-[var(--lte-blue)] px-2 text-white"
                            : "inline-flex h-7 min-w-7 items-center justify-center rounded-sm border border-[var(--lte-line)] bg-white px-2 hover:bg-[#f4f4f4]"
                        }
                      >
                        {n}
                      </button>
                    </span>
                  ))}
                <Button
                  variant="secondary"
                  className="h-7 px-2"
                  disabled={safePage >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
