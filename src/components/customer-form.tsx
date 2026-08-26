"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button, Field, PageHeader, Panel, inputClass } from "@/components/ui";
import type { Customer } from "@/lib/types";

type Meta = {
  nas: { id: string; name: string; ip: string }[];
  plans: {
    id: string;
    name: string;
    priceSell: number;
    vatPct: number;
    validity: string;
  }[];
  odp: string[];
};

export function CustomerForm({
  kind,
  initial,
}: {
  kind: "ppp" | "hotspot";
  initial?: Customer;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"paket" | "info">("paket");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [ipMode, setIpMode] = useState(initial?.ip ? "static" : "automatic");
  const [regStatus, setRegStatus] = useState<"active" | "pending">(
    initial?.status === "pending" ? "pending" : "active",
  );

  useEffect(() => {
    void fetch(`/api/v1/customers/meta?kind=${kind}`)
      .then((r) => r.json())
      .then((data: Meta) => setMeta(data));
  }, [kind]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const fd = new FormData(form);
    const password = String(fd.get("password") ?? "");
    const cpassword = String(fd.get("cpassword") ?? "");
    if (!initial && password !== cpassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setSaving(true);
    const payload = {
      kind,
      name: String(fd.get("name") ?? ""),
      customerCode: String(fd.get("customerCode") ?? ""),
      username: String(fd.get("username") ?? ""),
      password,
      portalPassword: String(fd.get("portalPassword") ?? "") || password,
      phone: String(fd.get("phone") ?? ""),
      email: String(fd.get("email") ?? ""),
      address: String(fd.get("address") ?? ""),
      identityNumber: String(fd.get("identityNumber") ?? ""),
      note: String(fd.get("note") ?? ""),
      serviceType: String(
        fd.get("serviceType") ?? (kind === "hotspot" ? "hotspot" : "pppoe"),
      ),
      payMode: String(fd.get("payMode") ?? "prepaid").toLowerCase(),
      trxStatus: String(fd.get("trxStatus") ?? "paid").toLowerCase(),
      status: regStatus === "pending" ? "pending" : String(fd.get("status") ?? "active"),
      subscriptionType: String(fd.get("subscriptionType") ?? "regular"),
      expiredAction: String(fd.get("expiredAction") ?? "isolir"),
      nasId: String(fd.get("nasId") ?? ""),
      planId: String(fd.get("planId") ?? ""),
      odp: String(fd.get("odp") ?? ""),
      ipAddressType: ipMode,
      ip: ipMode === "static" ? String(fd.get("ip") ?? "") : "",
      localAddress: String(fd.get("localAddress") ?? ""),
      bindOnLogin: fd.get("bind") === "yes",
      owner: String(fd.get("owner") ?? "admin"),
      dueAt: String(fd.get("dueAt") ?? "") || undefined,
      discount: Number(fd.get("discount") ?? 0) || 0,
      sellerFee: Number(fd.get("sellerFee") ?? 0) || 0,
      setupFee: Number(fd.get("setupFee") ?? 0) || 0,
      deviceFee: Number(fd.get("deviceFee") ?? 0) || 0,
      applyTax: fd.get("applyTax") === "1",
      latitude: String(fd.get("latitude") ?? ""),
      longitude: String(fd.get("longitude") ?? ""),
    };

    const response = await fetch(
      initial ? `/api/v1/customers/${initial.id}` : "/api/v1/customers",
      {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          initial && !password ? { ...payload, password: undefined } : payload,
        ),
      },
    );
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Gagal menyimpan ke database.");
      return;
    }

    if (initial) {
      router.push(`/customers/${kind}`);
      router.refresh();
      return;
    }

    router.push(`/customers/${kind}/added/${data.row.id}`);
    router.refresh();
  }

  const defaultDue = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  })();

  return (
    <div>
      <PageHeader
        title={initial ? `Ubah ${initial.name}` : `Tambah pelanggan ${kind === "hotspot" ? "HOTSPOT" : "PPP"}`}
        description="Alur Mixradius: simpan pelanggan + invoice, lalu halaman bukti bayar."
        breadcrumb={[
          "Home",
          "List Pelanggan",
          kind === "hotspot" ? "User Hotspot" : "User PPP",
          initial ? "Ubah" : "Tambah",
        ]}
        actions={
          <Link href={`/customers/${kind}`} className="text-sm text-[var(--lte-blue)] hover:underline">
            Kembali
          </Link>
        }
      />      {error ? (
        <p className="mb-3 rounded-sm border border-[#ebccd1] bg-[#f2dede] px-3 py-2 text-[13px] text-[#a94442]">
          {error}
        </p>
      ) : null}
      {!meta ? (
        <p className="text-[13px] text-[var(--lte-muted)]">Memuat NAS/paket dari database…</p>
      ) : (
        <>
          <div className="mb-3 flex gap-0 border-b border-[var(--lte-line)]">
            <button
              type="button"
              onClick={() => setTab("paket")}
              className={`border px-4 py-2 text-[13px] ${
                tab === "paket"
                  ? "border-b-white bg-white text-[var(--lte-blue)]"
                  : "border-transparent bg-[#f7f7f7] text-[#444]"
              }`}
            >
              Paket Langganan
            </button>
            <button
              type="button"
              onClick={() => setTab("info")}
              className={`border px-4 py-2 text-[13px] ${
                tab === "info"
                  ? "border-b-white bg-white text-[var(--lte-blue)]"
                  : "border-transparent bg-[#f7f7f7] text-[#444]"
              }`}
            >
              Info Pelanggan
            </button>
          </div>
          <form onSubmit={(e) => void onSubmit(e)}>
            <Panel title="Paket Langganan" className={tab === "paket" ? "" : "hidden"}>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Status Registrasi">
                  <div className="flex flex-wrap gap-4 pt-2 text-[13px]">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="reg_status"
                        checked={regStatus === "active"}
                        onChange={() => setRegStatus("active")}
                      />
                      AKTIF SEKARANG
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="reg_status"
                        checked={regStatus === "pending"}
                        onChange={() => setRegStatus("pending")}
                      />
                      ON PROCESS
                    </label>
                  </div>
                </Field>
                <Field label="Tipe Pelanggan">
                  <div className="flex flex-wrap gap-4 pt-2 text-[13px]">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="subscriptionType"
                        value="regular"
                        defaultChecked
                      />
                      Reguler
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="subscriptionType" value="non_regular" />
                      Non-Reguler
                    </label>
                  </div>
                </Field>
                <Field label="Nama Server | Service">
                  <select
                    name="nasId"
                    required
                    defaultValue={(initial as { nasId?: string } | undefined)?.nasId}
                    className={inputClass}
                  >
                    <option value="">- Pilih Server / NAS -</option>
                    {meta.nas.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name} ({row.ip})
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Tipe Pembayaran">
                  <select
                    name="payMode"
                    defaultValue={initial?.payMode ?? "prepaid"}
                    className={inputClass}
                  >
                    <option value="prepaid">PREPAID</option>
                    <option value="postpaid">POSTPAID</option>
                  </select>
                </Field>
                <Field label="Status Bayar">
                  <select name="trxStatus" defaultValue="paid" className={inputClass}>
                    <option value="paid">SUDAH BAYAR</option>
                    <option value="unpaid">BELUM BAYAR</option>
                  </select>
                </Field>
                <Field label="Status Akun">
                  <select
                    name="status"
                    defaultValue={initial?.status ?? "active"}
                    className={inputClass}
                  >
                    <option value="active">ENABLED</option>
                    <option value="disabled">DISABLED</option>
                  </select>
                </Field>
                <Field label="Owner Data">
                  <input
                    name="owner"
                    defaultValue={initial?.owner ?? "admin"}
                    className={inputClass}
                    placeholder="- Pilih Owner Data -"
                  />
                </Field>
                <Field label="Bind On Login">
                  <select
                    name="bind"
                    defaultValue={initial?.bindOnLogin ? "yes" : "no"}
                    className={inputClass}
                  >
                    <option value="no">TIDAK</option>
                    <option value="yes">YA</option>
                  </select>
                </Field>
                {kind === "ppp" ? (
                  <Field label="Tipe Service">
                    <select
                      name="serviceType"
                      defaultValue={initial?.serviceType ?? "pppoe"}
                      className={inputClass}
                    >
                      <option value="">- Pilih Tipe Service -</option>
                      <option value="pppoe">PPPoE</option>
                      <option value="pptp">PPTP</option>
                      <option value="l2tp">L2TP</option>
                      <option value="ovpn">OpenVPN / SSTP</option>
                    </select>
                  </Field>
                ) : (
                  <input type="hidden" name="serviceType" value="hotspot" />
                )}
                <Field label="Paket Langganan">
                  <select
                    name="planId"
                    required
                    defaultValue={(initial as { planId?: string } | undefined)?.planId}
                    className={inputClass}
                  >
                    <option value="">- Pilih Paket -</option>
                    {meta.plans.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name} · Rp {row.priceSell.toLocaleString("id-ID")}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Tagihkan PPN">
                  <label className="flex items-center gap-2 pt-2 text-[13px]">
                    <input type="checkbox" name="applyTax" value="1" defaultChecked />
                    ( Persentase PPN diambil dari Profil )
                  </label>
                </Field>
                <Field label="Diskon (1x)">
                  <input name="discount" defaultValue={0} className={inputClass} />
                </Field>
                <Field label="Fee Seller">
                  <input name="sellerFee" defaultValue={0} className={inputClass} />
                </Field>
                <Field label="Biaya Instalasi">
                  <input name="setupFee" defaultValue={0} className={inputClass} />
                </Field>
                <Field label="Sewa Perangkat">
                  <input name="deviceFee" defaultValue={0} className={inputClass} />
                </Field>
                <Field label="Ubah Jatuh Tempo">
                  <input
                    type="date"
                    name="dueAt"
                    defaultValue={
                      initial?.dueAt ? initial.dueAt.slice(0, 10) : defaultDue
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Aksi Jatuh Tempo">
                  <select name="expiredAction" defaultValue="isolir" className={inputClass}>
                    <option value="isolir">ISOLIR INTERNET (Suspend)</option>
                    <option value="none">TETAP TERHUBUNG (No Action)</option>
                  </select>
                </Field>
                {kind === "ppp" ? (
                  <>
                    <Field label="Tipe IP Address">
                      <select
                        name="ipAddressType"
                        className={inputClass}
                        value={ipMode}
                        onChange={(e) => setIpMode(e.target.value)}
                      >
                        <option value="automatic">IP DINAMIS</option>
                        <option value="static">IP STATIC</option>
                      </select>
                    </Field>
                    <Field label="Local Address">
                      <input
                        name="localAddress"
                        placeholder="192.168.1.1"
                        className={inputClass}
                        disabled={ipMode !== "static"}
                      />
                    </Field>
                    <Field label="Remote Address">
                      <input
                        name="ip"
                        defaultValue={initial?.ip}
                        placeholder="192.168.1.75"
                        className={inputClass}
                        disabled={ipMode !== "static"}
                      />
                    </Field>
                  </>
                ) : (
                  <input type="hidden" name="ipAddressType" value="automatic" />
                )}
                <Field label="ODP | POP">
                  <select name="odp" defaultValue={initial?.odp ?? ""} className={inputClass}>
                    <option value="">—</option>
                    {meta.odp.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </Panel>
            <Panel title="Info Pelanggan" className={tab === "info" ? "" : "hidden"}>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="ID Pelanggan">
                  <input
                    name="customerCode"
                    defaultValue={initial?.customerCode}
                    placeholder="Auto jika kosong"
                    className={inputClass}
                  />
                </Field>
                <Field label="Nama Lengkap">
                  <input
                    name="name"
                    required
                    defaultValue={initial?.name}
                    className={inputClass}
                  />
                </Field>
                <Field label="No. Identitas">
                  <input
                    name="identityNumber"
                    placeholder="KTP / identitas"
                    className={inputClass}
                  />
                </Field>
                <Field label="Telepon">
                  <input
                    name="phone"
                    defaultValue={initial?.phone}
                    placeholder="Format Telepon International"
                    className={inputClass}
                  />
                </Field>
                <Field label="Email">
                  <input
                    name="email"
                    type="email"
                    defaultValue={initial?.email}
                    placeholder="example@email.com"
                    className={inputClass}
                  />
                </Field>
                <Field label="Alamat">
                  <textarea
                    name="address"
                    defaultValue={initial?.address}
                    className={inputClass}
                    rows={3}
                  />
                </Field>
                <Field label="Latitude">
                  <input name="latitude" placeholder="-0.0000000" className={inputClass} />
                </Field>
                <Field label="Longitude">
                  <input name="longitude" placeholder="0.0000000" className={inputClass} />
                </Field>
                <Field label="Username (RADIUS)">
                  <input
                    name="username"
                    required
                    defaultValue={initial?.username}
                    className={inputClass}
                  />
                </Field>
                <Field label={initial ? "Password (kosongkan = tetap)" : "Password"}>
                  <input
                    name="password"
                    type="text"
                    required={!initial}
                    className={inputClass}
                    autoComplete="new-password"
                  />
                </Field>
                {!initial ? (
                  <Field label="Konfirmasi Password">
                    <input
                      name="cpassword"
                      type="text"
                      required
                      className={inputClass}
                      autoComplete="new-password"
                    />
                  </Field>
                ) : null}
                <Field label="Customer Portal Password">
                  <input name="portalPassword" type="text" className={inputClass} />
                </Field>
                <Field label="Catatan">
                  <input name="note" className={inputClass} />
                </Field>
              </div>
            </Panel>
            <div className="mt-4 flex gap-2">
              <Button type="submit" className="h-10" disabled={saving}>
                {saving ? "Menyimpan…" : initial ? "Simpan perubahan" : "Tambah Pelanggan"}
              </Button>
              <Link href={`/customers/${kind}`}>
                <Button variant="secondary">Batal</Button>
              </Link>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
