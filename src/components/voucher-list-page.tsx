"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { DataTable } from "@/components/data-table";
import { Modal } from "@/components/modal";
import { Button, Field, PageHeader, Panel, StatusPill, inputClass } from "@/components/ui";
import { formatDate } from "@/lib/utils";

type Meta = {
  nas: { id: string; name: string; ip: string }[];
  plans: { id: string; name: string; priceSell: number; validity: string }[];
};

type Row = {
  id: string;
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
};

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
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [lastBatch, setLastBatch] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    const data = await fetch(`/api/v1/vouchers?kind=${kind}`).then((r) => r.json());
    setRows(data.rows ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    void fetch(`/api/v1/vouchers/meta?kind=${kind}`)
      .then((r) => r.json())
      .then((data: Meta) => setMeta(data));
  }, [kind]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((row) =>
      `${row.code} ${row.plan} ${row.owner} ${row.batchId}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
  }, [query, rows]);

  const selectedIds = filtered.filter((row) => selected[row.id]).map((row) => row.id);
  const allSelected =
    filtered.length > 0 && filtered.every((row) => selected[row.id]);

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

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="relative" ref={menuRef}>
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

        <Button
          variant="secondary"
          onClick={() => setToast("Kirim via Whatsapp: butuh WhatsApp API aktif.")}
        >
          Kirim via Whatsapp
        </Button>
      </div>

      {toast ? (
        <p className="mb-3 rounded-sm border border-[#bce8f1] bg-[#d9edf7] px-3 py-2 text-[13px] text-[#31708f]">
          {toast}
        </p>
      ) : null}

      <Panel title="Daftar voucher">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            id="voucher-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari kode, paket, owner, batch"
            className="h-8 min-w-56 flex-1 rounded-sm border border-[var(--lte-line)] px-2.5 text-[13px]"
          />
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
                checked={allSelected}
                onChange={(e) => {
                  const next = { ...selected };
                  for (const row of filtered) next[row.id] = e.target.checked;
                  setSelected(next);
                }}
                aria-label="Pilih semua"
              />,
              "Username",
              "Password",
              "Nama Profil",
              "Harga Jual",
              "Server",
              "Dibuat",
              "Jatuh Tempo",
              "Owner",
              "Status",
            ]}
            rows={filtered.map((row) => [
              <input
                key={`${row.id}-c`}
                type="checkbox"
                checked={Boolean(selected[row.id])}
                onChange={(e) =>
                  setSelected((prev) => ({ ...prev, [row.id]: e.target.checked }))
                }
                aria-label={`Pilih ${row.code}`}
              />,
              row.code,
              row.password,
              row.plan,
              `Rp ${row.priceSell.toLocaleString("id-ID")}`,
              row.nas,
              formatDate(row.createdAt),
              formatDate(row.expiresAt),
              row.owner,
              <StatusPill
                key={`${row.id}-s`}
                status={row.enabled ? (row.used ? "isolated" : "active") : "disabled"}
              />,
            ])}
          />
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
    </div>
  );
}
