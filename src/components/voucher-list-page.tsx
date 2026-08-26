"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { DataTable } from "@/components/data-table";
import { Modal } from "@/components/modal";
import { IconBtn, SortHead, TablePager, TableToolbar } from "@/components/table-kit";
import { Button, Field, PageHeader, Panel, inputClass } from "@/components/ui";
import { formatRp } from "@/lib/money";
import { formatYmd } from "@/lib/utils";

type Meta = {
  nas: { id: string; name: string; ip: string }[];
  plans: { id: string; name: string; priceSell: number; validity: string }[];
};

type Row = {
  id: string;
  seq: number;
  code: string;
  password: string;
  plan: string;
  priceSell: number;
  nas: string;
  owner: string;
  enabled: boolean;
  used: boolean;
  createdAt: string;
  expiresAt: string;
  batchId: string;
  bindOnLogin?: boolean;
};

type SortKey =
  | "seq"
  | "code"
  | "password"
  | "plan"
  | "priceSell"
  | "nas"
  | "createdAt"
  | "expiresAt"
  | "owner"
  | "status"
  | "aksi";

function sortValue(row: Row, key: SortKey): string | number {
  switch (key) {
    case "seq":
      return row.seq;
    case "code":
    case "password":
    case "plan":
    case "nas":
    case "owner":
      return row[key].toLowerCase();
    case "priceSell":
      return row.priceSell;
    case "createdAt":
      return new Date(row.createdAt).getTime();
    case "expiresAt":
      return row.used ? new Date(row.expiresAt).getTime() : 0;
    case "status":
      return voucherStatus(row).label;
    case "aksi":
      return row.code.toLowerCase();
    default:
      return "";
  }
}

function voucherStatus(row: Row) {
  if (!row.enabled) return { label: "Disabled", className: "bg-[#dd4b39] text-white" };
  if (new Date(row.expiresAt).getTime() < Date.now() && !row.used) {
    return { label: "Expired", className: "bg-[#dd4b39] text-white" };
  }
  if (row.used) return { label: "Used", className: "bg-[#777] text-white" };
  return { label: "Active", className: "bg-[#00a65a] text-white" };
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 fill-current" aria-hidden>
      <path d="M12.04 2c-5.46 0-9.91 4.43-9.91 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.9-4.44 9.9-9.9C21.94 6.43 17.5 2 12.04 2zm5.72 14.13c-.24.67-1.4 1.24-1.94 1.32-.5.07-1.13.1-1.82-.11-.42-.13-.96-.31-1.66-.61-2.92-1.26-4.83-4.2-4.98-4.39-.14-.2-1.18-1.57-1.18-3 0-1.42.75-2.12 1.01-2.41.24-.27.64-.39 1.02-.39.12 0 .23 0 .33.01.29.01.44.03.63.49.24.55.82 2 .89 2.15.07.15.12.32.02.52-.09.2-.14.32-.28.5-.14.17-.3.38-.42.51-.14.14-.28.3-.12.58.16.29.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.22 1.37.28.14.44.12.6-.07.17-.2.72-.84.91-1.13.19-.29.38-.24.64-.14.27.1 1.71.8 2 .95.29.15.48.22.55.34.07.13.07.75-.17 1.42z" />
    </svg>
  );
}

export function VoucherListPage({
  title,
  kind,
}: {
  title: string;
  kind: "ppp" | "hotspot";
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [lastBatch, setLastBatch] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetch(`/api/v1/vouchers?kind=${kind}`).then((r) => r.json());
      const list = (data.rows ?? []) as Omit<Row, "seq">[];
      setRows(list.map((row, index, arr) => ({ ...row, seq: arr.length - index })));
    } catch {
      setError("Gagal memuat voucher.");
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void load();
    void fetch(`/api/v1/vouchers/meta?kind=${kind}`)
      .then((r) => r.json())
      .then((data: Meta) => setMeta(data));
  }, [kind, load]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((row) =>
      `${row.code} ${row.plan} ${row.owner} ${row.batchId} ${row.nas}`
        .toLowerCase()
        .includes(query.toLowerCase()),
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

  const selectedIds = filtered.filter((row) => selected[row.id]).map((row) => row.id);
  const allPageSelected = pageRows.length > 0 && pageRows.every((row) => selected[row.id]);

  function needSelection(action: string) {
    if (!selectedIds.length) {
      setToast(`Aksi "${action}": centang voucher di tabel dulu.`);
      setMenuOpen(false);
      return false;
    }
    return true;
  }

  async function patchSelected(patch: { enabled?: boolean; owner?: string }) {
    for (const id of selectedIds) {
      await fetch(`/api/v1/vouchers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    }
    await load();
  }

  async function printVouchers(payload: {
    voucherIds?: string[];
    batchId?: string;
  }) {
    const response = await fetch("/api/v1/vouchers/print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      setToast(data.error ?? "Gagal cetak voucher.");
      return;
    }
    const win = window.open("", "_blank");
    if (!win) {
      setToast("Popup diblokir browser. Izinkan popup untuk cetak.");
      return;
    }
    win.document.write(data.html);
    win.document.close();
    setToast(`Cetak ${data.count} voucher · template ${data.template.name}.`);
  }

  async function onGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const fd = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/vouchers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        nasId: String(fd.get("nasId") ?? ""),
        planId: String(fd.get("planId") ?? ""),
        owner: String(fd.get("owner") ?? "admin"),
        bindOnLogin: fd.get("bind") === "yes",
        loginMethod: String(fd.get("loginMethod") ?? "voucher_code"),
        sellerFee: Number(fd.get("sellerFee") ?? 0) || 0,
        qty: Number(fd.get("qty") ?? 1) || 1,
        length: Number(fd.get("length") ?? 6) || 6,
        prefix: String(fd.get("prefix") ?? ""),
        combination: String(fd.get("combination") ?? "type1"),
        serviceType:
          kind === "ppp" ? String(fd.get("serviceType") ?? "pppoe") : "hotspot",
      }),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Gagal generate voucher.");
      return;
    }
    setAddOpen(false);
    setLastBatch(data.batchId);
    setToast(
      `${data.count} voucher dibuat · batch ${data.batchId}. Disarankan langsung dicetak.`,
    );
    await load();
  }

  function waToast() {
    setToast("Kirim via WhatsApp: konfigurasi tersimpan, API provider belum dihubungkan.");
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editRow) return;
    const fd = new FormData(event.currentTarget);
    await fetch(`/api/v1/vouchers/${editRow.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: String(fd.get("owner") ?? ""),
        enabled: fd.get("enabled") === "yes",
        bindOnLogin: fd.get("bind") === "yes",
      }),
    });
    setEditRow(null);
    await load();
  }

  const from = sorted.length ? (safePage - 1) * pageSize + 1 : 0;
  const to = Math.min(safePage * pageSize, sorted.length);

  return (
    <div>
      <PageHeader
        title={title}
        description={
          kind === "hotspot"
            ? "Kartu Voucher Hotspot · generate ke database (RADIUS)."
            : "Kartu Voucher PPP · generate ke database (RADIUS)."
        }
        breadcrumb={[
          "Home",
          "Kartu Voucher",
          kind === "hotspot" ? "Voucher Hotspot" : "Voucher PPP",
        ]}
      />

      <div className="relative mb-3" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-9 items-center gap-2 rounded-sm bg-[#00a65a] px-3 text-[13px] font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-[#008d4c]"
          >
            <span aria-hidden>☰</span>
            Manajemen Voucher
            <span className="text-[10px] opacity-90">▾</span>
          </button>
          {menuOpen ? (
            <div className="absolute left-0 z-30 mt-1 min-w-[260px] overflow-hidden rounded-sm border border-[#d2d6de] bg-white shadow-lg">
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[13px] text-[#444] hover:bg-[#f4f4f4]"
                onClick={() => {
                  setMenuOpen(false);
                  setAddOpen(true);
                }}
              >
                Tambah Voucher
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[13px] text-[#444] hover:bg-[#f4f4f4]"
                onClick={() => {
                  setMenuOpen(false);
                  document.getElementById("voucher-search")?.focus();
                }}
              >
                Cari Data Voucher{" "}
                <span className="ml-1 rounded-sm bg-[#00c0ef] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  NEW
                </span>
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[13px] text-[#444] hover:bg-[#f4f4f4]"
                onClick={async () => {
                  setMenuOpen(false);
                  if (!lastBatch) {
                    setToast("Belum ada batch terakhir. Generate dulu.");
                    return;
                  }
                  await printVouchers({ batchId: lastBatch });
                }}
              >
                Cetak Voucher{" "}
                <span className="ml-1 rounded-sm bg-[#00c0ef] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  NEW
                </span>
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[13px] text-[#444] hover:bg-[#f4f4f4]"
                onClick={async () => {
                  const expired = rows.filter(
                    (r) => new Date(r.expiresAt).getTime() < Date.now(),
                  );
                  for (const row of expired) {
                    await fetch(`/api/v1/vouchers/${row.id}`, { method: "DELETE" });
                  }
                  setToast(`${expired.length} voucher expired dihapus.`);
                  setMenuOpen(false);
                  await load();
                }}
              >
                Hapus Voucher Expired
              </button>
              <div className="border-t border-[#eee] px-3 py-1.5 text-[12px] font-semibold text-[#dd4b39]">
                Aksi Checkbox ( Massal )
              </div>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[13px] text-[#444] hover:bg-[#f4f4f4]"
                onClick={async () => {
                  if (!needSelection("Cetak Yang Dipilih")) return;
                  setMenuOpen(false);
                  await printVouchers({ voucherIds: selectedIds });
                }}
              >
                Cetak Yang Dipilih{" "}
                <span className="ml-1 rounded-sm bg-[#00c0ef] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  NEW
                </span>
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[13px] text-[#444] hover:bg-[#f4f4f4]"
                onClick={async () => {
                  if (!needSelection("Ubah Owner")) return;
                  const owner = window.prompt("Owner Data baru:", "admin");
                  if (!owner) return;
                  await patchSelected({ owner });
                  setToast(`Owner diubah → ${owner}`);
                  setMenuOpen(false);
                }}
              >
                Ubah Owner Data
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[13px] text-[#444] hover:bg-[#f4f4f4]"
                onClick={() => {
                  if (!needSelection("Set Bind")) return;
                  setToast("Set Bind Onlogin: segera dihubungkan massal.");
                  setMenuOpen(false);
                }}
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
                onClick={async () => {
                  if (!needSelection("Aktifkan")) return;
                  await patchSelected({ enabled: true });
                  setToast(`${selectedIds.length} voucher diaktifkan.`);
                  setMenuOpen(false);
                }}
              >
                Aktifkan Voucher
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[13px] text-[#444] hover:bg-[#f4f4f4]"
                onClick={async () => {
                  if (!needSelection("Nonaktifkan")) return;
                  await patchSelected({ enabled: false });
                  setToast(`${selectedIds.length} voucher dinonaktifkan.`);
                  setMenuOpen(false);
                }}
              >
                Nonaktifkan Voucher
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[13px] text-[#dd4b39] hover:bg-[#f4f4f4]"
                onClick={async () => {
                  if (!needSelection("Hapus")) return;
                  if (!window.confirm(`Hapus ${selectedIds.length} voucher?`)) return;
                  for (const id of selectedIds) {
                    await fetch(`/api/v1/vouchers/${id}`, { method: "DELETE" });
                  }
                  setSelected({});
                  setToast("Voucher terpilih dihapus.");
                  setMenuOpen(false);
                  await load();
                }}
              >
                Hapus Voucher
              </button>
            </div>
          ) : null}
        </div>

      <ul className="mb-3 list-disc space-y-1 pl-5 text-[13px] text-[#444]">
        <li>Voucher yang sudah digenerate disarankan untuk langsung dicetak.</li>
        <li>
          Klik tombol ini:{" "}
          <button
            type="button"
            onClick={waToast}
            className="inline-flex h-6 items-center gap-1 rounded-sm bg-[#00a65a] px-2 text-[12px] font-semibold text-white hover:bg-[#008d4c]"
          >
            <WhatsAppIcon />
            Kirim via Whatsapp
          </button>{" "}
          jika ingin mengirim voucher ke nomor whatsapp.
        </li>
      </ul>

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
          searchId="voucher-search"
        />
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
                <SortHead key="h-id" label="Id" active={sortKey === "seq"} dir={sortDir} onClick={() => toggleSort("seq")} />,
                <SortHead key="h-user" label="Username" active={sortKey === "code"} dir={sortDir} onClick={() => toggleSort("code")} />,
                <SortHead key="h-pass" label="Password" active={sortKey === "password"} dir={sortDir} onClick={() => toggleSort("password")} />,
                <SortHead key="h-plan" label="Nama Profil" active={sortKey === "plan"} dir={sortDir} onClick={() => toggleSort("plan")} />,
                <SortHead key="h-price" label="Harga Jual" active={sortKey === "priceSell"} dir={sortDir} onClick={() => toggleSort("priceSell")} />,
                <SortHead key="h-nas" label="Nama Server | Service" active={sortKey === "nas"} dir={sortDir} onClick={() => toggleSort("nas")} />,
                <SortHead key="h-created" label="Tanggal Dibuat" active={sortKey === "createdAt"} dir={sortDir} onClick={() => toggleSort("createdAt")} />,
                <SortHead key="h-due" label="Jatuh Tempo" active={sortKey === "expiresAt"} dir={sortDir} onClick={() => toggleSort("expiresAt")} />,
                <SortHead key="h-own" label="Owner Data" active={sortKey === "owner"} dir={sortDir} onClick={() => toggleSort("owner")} />,
                <SortHead key="h-st" label="Status" active={sortKey === "status"} dir={sortDir} onClick={() => toggleSort("status")} />,
                <SortHead key="h-aksi" label="Aksi" active={sortKey === "aksi"} dir={sortDir} onClick={() => toggleSort("aksi")} />,
              ]}
              rows={pageRows.map((row) => {
                const status = voucherStatus(row);
                return [
                  <input
                    key={`${row.id}-c`}
                    type="checkbox"
                    checked={Boolean(selected[row.id])}
                    onChange={(e) =>
                      setSelected((prev) => ({ ...prev, [row.id]: e.target.checked }))
                    }
                    aria-label={`Pilih ${row.code}`}
                  />,
                  row.seq,
                  <span key={`${row.id}-u`} className="inline-flex items-center gap-1">
                    {row.code}
                    <button
                      type="button"
                      title="Kirim via WhatsApp"
                      className="inline-flex size-5 items-center justify-center rounded-sm bg-[#25d366] text-white"
                      onClick={waToast}
                    >
                      <WhatsAppIcon />
                    </button>
                  </span>,
                  row.password,
                  row.plan,
                  formatRp(row.priceSell),
                  row.nas || "Semua Server & NAS",
                  formatYmd(row.createdAt),
                  row.used ? formatYmd(row.expiresAt) : "Waiting Login",
                  row.owner || "admin",
                  <span key={`${row.id}-s`} className="inline-flex flex-wrap items-center gap-1">
                    <span className={`inline-flex rounded-sm px-1.5 py-0.5 text-[11px] font-semibold ${status.className}`}>
                      {status.label}
                    </span>
                    {lastBatch && row.batchId === lastBatch ? (
                      <span className="inline-flex rounded-sm bg-[#00c0ef] px-1.5 py-0.5 text-[11px] font-semibold text-white">
                        last created
                      </span>
                    ) : null}
                  </span>,
                  <div key={`${row.id}-a`} className="flex items-center gap-1">
                    <IconBtn
                      title="Edit"
                      className="bg-[#00c0ef] hover:bg-[#00a7d0]"
                      onClick={() => setEditRow(row)}
                    >
                      <Pencil className="size-3.5" />
                    </IconBtn>
                    <IconBtn
                      title="Hapus"
                      className="bg-[#f39c12] hover:bg-[#e08e0b]"
                      onClick={() => {
                        if (!window.confirm(`Hapus voucher ${row.code}?`)) return;
                        void fetch(`/api/v1/vouchers/${row.id}`, { method: "DELETE" }).then(
                          () => void load(),
                        );
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </IconBtn>
                  </div>,
                ];
              })}
            />
            <TablePager
              from={from}
              to={to}
              total={sorted.length}
              page={safePage}
              pageCount={pageCount}
              onPage={setPage}
            />
          </>
        )}
      </Panel>

      <Modal
        title="Tambah Voucher"
        open={addOpen}
        onClose={() => setAddOpen(false)}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              Batal
            </Button>
            <Button type="submit" form="voucher-add-form" disabled={saving || !meta}>
              {saving ? "Generate…" : "Generate Voucher"}
            </Button>
          </>
        }
      >
        {!meta ? (
          <p className="text-[13px] text-[var(--lte-muted)]">Memuat NAS/paket…</p>
        ) : (
          <form id="voucher-add-form" onSubmit={(e) => void onGenerate(e)}>
            {error ? (
              <p className="mb-3 rounded-sm border border-[#ebccd1] bg-[#f2dede] px-3 py-2 text-[13px] text-[#a94442]">
                {error}
              </p>
            ) : null}
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Tipe">
                <input
                  className={inputClass}
                  value={kind === "hotspot" ? "HOTSPOT" : "PPP"}
                  readOnly
                />
              </Field>
              <Field label="Nama Server | Service">
                <select name="nasId" required className={inputClass} defaultValue="">
                  <option value="">- Pilih Server / NAS -</option>
                  {meta.nas.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name} ({row.ip})
                    </option>
                  ))}
                </select>
              </Field>
              {kind === "ppp" ? (
                <Field label="Tipe Service">
                  <select name="serviceType" defaultValue="pppoe" className={inputClass}>
                    <option value="pppoe">PPPoE</option>
                    <option value="pptp">PPTP/L2TP</option>
                    <option value="ovpn">OpenVPN/SSTP</option>
                  </select>
                </Field>
              ) : null}
              <Field label="Owner Data">
                <input name="owner" defaultValue="admin" className={inputClass} />
              </Field>
              <Field label="Bind On Login">
                <select name="bind" defaultValue="no" className={inputClass}>
                  <option value="no">TIDAK</option>
                  <option value="yes">YA</option>
                </select>
              </Field>
              <Field label="Paket Langganan">
                <select name="planId" required className={inputClass} defaultValue="">
                  <option value="">- Pilih Paket -</option>
                  {meta.plans.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name} · Rp {row.priceSell.toLocaleString("id-ID")}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Fee Seller">
                <input name="sellerFee" defaultValue={0} className={inputClass} />
              </Field>
              <Field label="Metode Login">
                <select name="loginMethod" defaultValue="voucher_code" className={inputClass}>
                  <option value="voucher_code">
                    KODE VOUCHER ( PASSWORD = USERNAME )
                  </option>
                  <option value="username_and_password">USERNAME DAN PASSWORD</option>
                </select>
              </Field>
              <Field label="Jumlah Voucher">
                <input
                  name="qty"
                  type="number"
                  min={1}
                  max={200}
                  defaultValue={1}
                  className={inputClass}
                />
              </Field>
              <Field label="Panjang Kode">
                <input
                  name="length"
                  type="number"
                  min={4}
                  max={24}
                  defaultValue={6}
                  className={inputClass}
                />
              </Field>
              <Field label="Prefix Voucher">
                <input name="prefix" placeholder="opsional" className={inputClass} />
              </Field>
              <Field label="Kombinasi Kode">
                <select name="combination" defaultValue="type1" className={inputClass}>
                  <option value="type1">HURUF BESAR DAN ANGKA</option>
                  <option value="type2">HURUF KECIL DAN ANGKA</option>
                  <option value="type3">HANYA HURUF BESAR</option>
                  <option value="type4">HANYA HURUF KECIL</option>
                  <option value="type5">HANYA KOMBINASI ANGKA</option>
                </select>
              </Field>
            </div>
            <p className="mt-3 text-[12px] text-[var(--lte-muted)]">
              Voucher yang sudah digenerate disarankan untuk langsung dicetak.
            </p>
          </form>
        )}
      </Modal>

      <Modal
        title="Ubah Voucher"
        open={Boolean(editRow)}
        onClose={() => setEditRow(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditRow(null)}>
              Batal
            </Button>
            <Button type="submit" form="voucher-edit-form">
              Simpan
            </Button>
          </>
        }
      >
        {editRow ? (
          <form id="voucher-edit-form" onSubmit={(e) => void save(e)} className="grid gap-3">
            <Field label="Username">
              <input className={inputClass} value={editRow.code} readOnly />
            </Field>
            <Field label="Owner Data">
              <input name="owner" defaultValue={editRow.owner} className={inputClass} />
            </Field>
            <Field label="Status">
              <select name="enabled" defaultValue={editRow.enabled ? "yes" : "no"} className={inputClass}>
                <option value="yes">Aktif</option>
                <option value="no">Nonaktif</option>
              </select>
            </Field>
            <Field label="Bind On Login">
              <select
                name="bind"
                defaultValue={editRow.bindOnLogin ? "yes" : "no"}
                className={inputClass}
              >
                <option value="no">TIDAK</option>
                <option value="yes">YA</option>
              </select>
            </Field>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
