"use client";

import Link from "next/link";
import { Check, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { DataTable } from "@/components/data-table";
import { Modal } from "@/components/modal";
import { IconBtn, SortHead, TablePager, TableToolbar } from "@/components/table-kit";
import { Button, Field, PageHeader, Panel, inputClass } from "@/components/ui";
import { formatRp } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";

type Plan = { id: string; name: string; priceSell: number };
type Order = {
  id: string;
  source: string;
  customer: string;
  phone: string;
  email?: string;
  planName: string;
  planId: string;
  qty: number;
  amount: number;
  hotspotDomain: string;
  paymentChannel?: string;
  status: string;
  createdAt: string;
  note?: string;
};

type SortKey =
  | "id"
  | "customer"
  | "phone"
  | "planName"
  | "qty"
  | "amount"
  | "hotspotDomain"
  | "createdAt"
  | "status"
  | "paymentChannel"
  | "aksi";

function orderCode(id: string) {
  return `EVC-${id.replace(/[^a-z0-9]/gi, "").slice(-18).toUpperCase()}`;
}

function isPaid(status: string) {
  return status === "paid";
}

function sortValue(row: Order, key: SortKey): string | number {
  switch (key) {
    case "id":
      return orderCode(row.id);
    case "customer":
    case "phone":
    case "planName":
    case "hotspotDomain":
    case "status":
    case "paymentChannel":
      return (row[key] ?? "").toLowerCase();
    case "qty":
    case "amount":
      return row[key];
    case "createdAt":
      return new Date(row.createdAt).getTime();
    case "aksi":
      return row.customer.toLowerCase();
    default:
      return "";
  }
}

export default function Page() {
  const [rows, setRows] = useState<Order[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [open, setOpen] = useState(false);
  const [codeRow, setCodeRow] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const menuRef = useRef<HTMLDivElement>(null);

  async function load() {
    const [orders, meta] = await Promise.all([
      fetch("/api/v1/evouchers").then((r) => r.json()),
      fetch("/api/v1/vouchers/meta?kind=hotspot").then((r) => r.json()),
    ]);
    setRows(orders.rows ?? []);
    setPlans(meta.plans ?? []);
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      `${orderCode(row.id)} ${row.customer} ${row.phone} ${row.planName} ${row.paymentChannel ?? ""}`
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
  const from = sorted.length ? (safePage - 1) * pageSize + 1 : 0;
  const to = Math.min(safePage * pageSize, sorted.length);
  const selectedIds = filtered.filter((row) => selected[row.id]).map((row) => row.id);
  const allPageSelected = pageRows.length > 0 && pageRows.every((row) => selected[row.id]);

  useEffect(() => {
    setPage(1);
  }, [query, pageSize, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const fd = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/evouchers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: String(fd.get("source") ?? "portal"),
        customer: String(fd.get("customer") ?? ""),
        phone: String(fd.get("phone") ?? ""),
        planId: String(fd.get("planId") ?? ""),
        qty: Number(fd.get("qty") ?? 1) || 1,
        status: String(fd.get("status") ?? "pending"),
        note: String(fd.get("note") ?? ""),
      }),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Gagal simpan e-Voucher.");
      return;
    }
    setOpen(false);
    setToast(`Order e-Voucher disimpan · ${data.row.planName} × ${data.row.qty}`);
    await load();
  }

  async function remove(id: string) {
    if (!window.confirm("Hapus data pembelian ini?")) return;
    await fetch(`/api/v1/evouchers/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Data e-Voucher"
        description="Catatan pembelian e-Voucher. Kode yang sudah dibayar muncul di Voucher Hotspot."
        breadcrumb={["Home", "Kartu Voucher", "Data e-Voucher"]}
      />

      <div className="relative mb-3" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="inline-flex h-9 items-center gap-2 rounded-sm bg-[#00a65a] px-3 text-[13px] font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-[#008d4c]"
        >
          <span aria-hidden>☰</span>
          Pembelian e-Voucher
          <span className="text-[10px] opacity-90">▾</span>
        </button>
        {menuOpen ? (
          <div className="absolute left-0 z-30 mt-1 min-w-[240px] overflow-hidden rounded-sm border border-[#d2d6de] bg-white shadow-lg">
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-[13px] text-[#444] hover:bg-[#f4f4f4]"
              onClick={() => {
                setMenuOpen(false);
                setOpen(true);
              }}
            >
              Tambah Order
            </button>
            <Link
              href="/vouchers/hotspot"
              className="block px-3 py-2 text-[13px] text-[#444] hover:bg-[#f4f4f4]"
              onClick={() => setMenuOpen(false)}
            >
              Buka Voucher Hotspot
            </Link>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-[13px] text-[#dd4b39] hover:bg-[#f4f4f4]"
              onClick={async () => {
                setMenuOpen(false);
                if (!selectedIds.length) {
                  setToast("Centang order yang mau dihapus.");
                  return;
                }
                if (!window.confirm(`Hapus ${selectedIds.length} order?`)) return;
                await Promise.all(
                  selectedIds.map((id) => fetch(`/api/v1/evouchers/${id}`, { method: "DELETE" })),
                );
                setSelected({});
                await load();
              }}
            >
              Hapus yang dipilih
            </button>
          </div>
        ) : null}
      </div>

      <div className="mb-3 space-y-1 text-[13px] text-[#a94442]">
        <p className="flex items-start gap-2">
          <span className="mt-0.5 text-[#f39c12]">⚠</span>
          Menu ini hanya menampilkan data pembelian e-Voucher.
        </p>
        <p className="flex items-start gap-2">
          <span className="mt-0.5 text-[#f39c12]">⚠</span>
          Kode e-Voucher yang berhasil dibeli akan tersedia pada menu{" "}
          <Link
            href="/vouchers/hotspot"
            className="ml-1 inline-flex h-6 items-center rounded-sm bg-[#00a65a] px-2 text-[11px] font-semibold uppercase text-white hover:bg-[#008d4c]"
          >
            Voucher Hotspot
          </Link>
        </p>
      </div>

      {toast ? (
        <p className="mb-3 rounded-sm border border-[#bce8f1] bg-[#d9edf7] px-3 py-2 text-[13px] text-[#31708f]">
          {toast}
        </p>
      ) : null}

      <Panel>
        <TableToolbar
          pageSize={pageSize}
          onPageSize={setPageSize}
          query={query}
          onQuery={setQuery}
          searchId="evoucher-search"
        />
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
            <SortHead key="h-id" label="Order Id" active={sortKey === "id"} dir={sortDir} onClick={() => toggleSort("id")} />,
            <SortHead key="h-name" label="Nama" active={sortKey === "customer"} dir={sortDir} onClick={() => toggleSort("customer")} />,
            <SortHead key="h-wa" label="No. Whatsapp" active={sortKey === "phone"} dir={sortDir} onClick={() => toggleSort("phone")} />,
            <SortHead key="h-plan" label="Profil" active={sortKey === "planName"} dir={sortDir} onClick={() => toggleSort("planName")} />,
            <SortHead key="h-qty" label="Quantity" active={sortKey === "qty"} dir={sortDir} onClick={() => toggleSort("qty")} />,
            <SortHead key="h-price" label="Harga (+PPN)" active={sortKey === "amount"} dir={sortDir} onClick={() => toggleSort("amount")} />,
            <SortHead key="h-dns" label="DNS Hotspot" active={sortKey === "hotspotDomain"} dir={sortDir} onClick={() => toggleSort("hotspotDomain")} />,
            <SortHead key="h-ord" label="Tanggal Order" active={sortKey === "createdAt"} dir={sortDir} onClick={() => toggleSort("createdAt")} />,
            <SortHead key="h-st" label="Status Order" active={sortKey === "status"} dir={sortDir} onClick={() => toggleSort("status")} />,
            <SortHead key="h-pay" label="Tanggal Bayar" active={sortKey === "createdAt"} dir={sortDir} onClick={() => toggleSort("createdAt")} />,
            <SortHead key="h-via" label="Bayar via" active={sortKey === "paymentChannel"} dir={sortDir} onClick={() => toggleSort("paymentChannel")} />,
            <SortHead key="h-aksi" label="Aksi" active={sortKey === "aksi"} dir={sortDir} onClick={() => toggleSort("aksi")} />,
          ]}
          rows={pageRows.map((row) => [
            <input
              key={`${row.id}-c`}
              type="checkbox"
              checked={Boolean(selected[row.id])}
              onChange={(e) =>
                setSelected((prev) => ({ ...prev, [row.id]: e.target.checked }))
              }
              aria-label={`Pilih ${orderCode(row.id)}`}
            />,
            <span key={`${row.id}-id`} className="font-mono text-[12px]">
              {orderCode(row.id)}
            </span>,
            row.customer,
            row.phone || "—",
            <span
              key={`${row.id}-p`}
              className="inline-flex items-center gap-1 rounded-sm bg-[#00a65a] px-1.5 py-0.5 text-[11px] font-semibold text-white"
            >
              HOT {row.planName}
            </span>,
            <span key={`${row.id}-q`} className="inline-flex items-center gap-2">
              {row.qty} Pcs
              <button
                type="button"
                className="rounded-sm border border-[var(--lte-line)] bg-[#f4f4f4] px-1.5 py-0.5 text-[11px] text-[#444] hover:bg-[#ececec]"
                onClick={() => setCodeRow(row)}
              >
                View Code
              </button>
            </span>,
            formatRp(row.amount),
            row.hotspotDomain || "—",
            formatDateTime(row.createdAt),
            <span
              key={`${row.id}-st`}
              className={
                isPaid(row.status)
                  ? "inline-flex items-center gap-1 rounded-sm bg-[#777] px-1.5 py-0.5 text-[11px] font-semibold text-white"
                  : "inline-flex items-center gap-1 rounded-sm bg-[#f39c12] px-1.5 py-0.5 text-[11px] font-semibold text-white"
              }
            >
              {isPaid(row.status) ? <Check className="size-3" /> : null}
              {isPaid(row.status) ? "Paid" : row.status}
            </span>,
            isPaid(row.status) ? formatDateTime(row.createdAt) : "—",
            row.paymentChannel ? (
              <span className="inline-flex rounded-sm border border-[var(--lte-line)] bg-white px-1.5 py-0.5 text-[11px] font-semibold uppercase">
                {row.paymentChannel}
              </span>
            ) : (
              "—"
            ),
            <IconBtn
              key={`${row.id}-a`}
              title="Hapus"
              className="bg-[#f39c12] hover:bg-[#e08e0b]"
              onClick={() => void remove(row.id)}
            >
              <Trash2 className="size-3.5" />
            </IconBtn>,
          ])}
        />
        <TablePager
          from={from}
          to={to}
          total={sorted.length}
          page={safePage}
          pageCount={pageCount}
          onPage={setPage}
        />
      </Panel>

      <Modal
        title="Kode e-Voucher"
        open={Boolean(codeRow)}
        onClose={() => setCodeRow(null)}
        footer={
          <Button variant="secondary" onClick={() => setCodeRow(null)}>
            Tutup
          </Button>
        }
      >
        {codeRow ? (
          <div className="space-y-2 text-[13px] text-[#444]">
            <p>
              Order <span className="font-mono">{orderCode(codeRow.id)}</span> · {codeRow.qty} Pcs
            </p>
            <p>
              Kode yang berhasil dibeli tersedia di menu{" "}
              <Link href="/vouchers/hotspot" className="text-[var(--lte-blue)] hover:underline">
                Voucher Hotspot
              </Link>
              . Gateway pembayaran belum live, jadi kode tidak digenerate otomatis dari halaman ini.
            </p>
          </div>
        ) : null}
      </Modal>

      <Modal
        title="Tambah Order e-Voucher"
        open={open}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" form="evoucher-form" disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan Order"}
            </Button>
          </>
        }
      >
        <form id="evoucher-form" onSubmit={(e) => void onSubmit(e)} className="grid gap-3">
          {error ? (
            <p className="rounded-sm border border-[#ebccd1] bg-[#f2dede] px-3 py-2 text-[13px] text-[#a94442]">
              {error}
            </p>
          ) : null}
          <Field label="Sumber">
            <select name="source" defaultValue="portal" className={inputClass}>
              <option value="portal">Portal web</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="manual">Manual</option>
            </select>
          </Field>
          <Field label="Nama">
            <input name="customer" required className={inputClass} />
          </Field>
          <Field label="No. WhatsApp">
            <input name="phone" className={inputClass} />
          </Field>
          <Field label="Paket">
            <select name="planId" required className={inputClass} defaultValue="">
              <option value="">- Pilih Paket -</option>
              {plans.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name} · Rp {row.priceSell.toLocaleString("id-ID")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Qty">
            <input name="qty" type="number" min={1} defaultValue={1} className={inputClass} />
          </Field>
          <Field label="Status bayar">
            <select name="status" defaultValue="pending" className={inputClass}>
              <option value="pending">pending</option>
              <option value="paid">paid</option>
            </select>
          </Field>
          <Field label="Catatan">
            <input name="note" className={inputClass} />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
