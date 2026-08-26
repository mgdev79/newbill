"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

type Tab = "buy" | "check";

type Plan = {
  id: string;
  name: string;
  priceSell: number;
  validity: string;
  sharedUsers: number;
  bandwidth: string;
  duration: string;
  quota: string;
};

type Channel = { value: string; label: string };

type CheckResult = {
  code: string;
  planName: string;
  validity: string;
  priceSell: number;
  status: string;
  expiresAt: string;
  hotspotUrl: string;
};

type BuyResult = {
  id: string;
  planName: string;
  amount: number;
  qty: number;
  paymentChannel: string;
  instruction: string;
};

const teal = "#00bcd4";
const tealDark = "#00a5bb";
const fieldClass =
  "mt-1.5 h-11 w-full rounded-lg border-0 bg-[#e8f8fb] px-3 text-[14px] text-[#1a3a5c] outline-none focus:ring-2 focus:ring-[#00bcd4]";

export function MemberEvoucherPortal() {
  const [tab, setTab] = useState<Tab>("buy");
  const [gated, setGated] = useState(false);
  const [company, setCompany] = useState("Newbill");
  const [captchaUrl, setCaptchaUrl] = useState("/api/v1/member/captcha");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [buyDone, setBuyDone] = useState<BuyResult | null>(null);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  const reloadCaptcha = useCallback(() => {
    setCaptchaUrl(`/api/v1/member/captcha?r=${Date.now()}`);
    setAnswer("");
  }, []);

  async function loadMeta() {
    const response = await fetch("/api/v1/member/evoucher/plans");
    if (!response.ok) {
      setGated(false);
      return;
    }
    const data = await response.json();
    setPlans(data.plans ?? []);
    setDomains(data.domains ?? []);
    setChannels(data.paymentChannels ?? []);
  }

  useEffect(() => {
    void (async () => {
      const data = await fetch("/api/v1/member/evoucher/session").then((r) => r.json());
      setCompany(data.company?.name || "Newbill");
      if (data.gated) {
        setGated(true);
        setTab(data.action === "check" ? "check" : "buy");
        await loadMeta();
      }
    })();
  }, []);

  async function onVerify(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/v1/member/captcha/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer, action: tab }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "kode keamanan salah");
      reloadCaptcha();
      return;
    }
    setGated(true);
    setBuyDone(null);
    setCheckResult(null);
    setSelectedPlanId("");
    await loadMeta();
  }

  async function onBuy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/member/evoucher/buy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: String(fd.get("customer") ?? ""),
        email: String(fd.get("email") ?? ""),
        phone: String(fd.get("phone") ?? ""),
        planId: String(fd.get("planId") ?? ""),
        qty: Number(fd.get("qty") ?? 1) || 1,
        hotspotDomain: String(fd.get("hotspotDomain") ?? "-"),
        paymentChannel: String(fd.get("paymentChannel") ?? ""),
      }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "Gagal membuat order.");
      if (response.status === 401) {
        setGated(false);
        reloadCaptcha();
      }
      return;
    }
    setBuyDone({
      id: data.row.id,
      planName: data.row.planName,
      amount: data.row.amount,
      qty: data.row.qty,
      paymentChannel: data.row.paymentChannel,
      instruction: data.payment?.instruction ?? "Order menunggu pembayaran.",
    });
  }

  async function onCheck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setCheckResult(null);
    const fd = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/member/evoucher/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: String(fd.get("code") ?? "") }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "Voucher tidak ditemukan.");
      if (response.status === 401) {
        setGated(false);
        reloadCaptcha();
      }
      return;
    }
    setCheckResult(data.row);
  }

  function switchTab(next: Tab) {
    setTab(next);
    setError(null);
    setBuyDone(null);
    setCheckResult(null);
    if (!gated) reloadCaptcha();
  }

  const heading = !gated
    ? {
        title: "Selamat Datang",
        sub: "Selesaikan tantangan keamanan berikut untuk masuk ke Form eVoucher",
      }
    : tab === "buy"
      ? {
          title: "Beli eVoucher Sekarang",
          sub: "Isi formulir di bawah untuk menyelesaikan pembelian.",
        }
      : {
          title: "Cek Status Voucher",
          sub: "Masukkan kode voucher untuk melihat status pemakaian voucher.",
        };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{ background: "linear-gradient(180deg, #dff7fb 0%, #c8eef5 100%)" }}
    >
      <div
        className={`w-full rounded-2xl bg-white px-6 py-7 shadow-[0_12px_40px_rgba(0,120,140,0.12)] ${
          gated && tab === "buy" ? "max-w-[720px]" : "max-w-[420px]"
        }`}
      >
        <div className="mx-auto mb-5 flex h-[72px] w-[250px] max-w-full items-center justify-center rounded-md border border-[#bfe8f0] bg-white px-3">
          <div className="text-center leading-tight">
            <p className="text-[22px] font-bold tracking-tight text-[#1a3a5c]">
              <span style={{ color: teal }}>NB</span> {company}
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#e53935]">
              Network
            </p>
          </div>
        </div>

        <h1 className="text-center text-[22px] font-bold text-[#1a3a5c]">
          {heading.title}
        </h1>
        <p className="mt-1 text-center text-[13px] text-[#7a8a99]">{heading.sub}</p>

        {!gated ? (
          <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-[#e8f8fb] p-1.5">
            <button
              type="button"
              onClick={() => switchTab("buy")}
              className="rounded-lg py-2.5 text-[13px] font-semibold transition"
              style={
                tab === "buy"
                  ? { background: teal, color: "#fff" }
                  : { background: "transparent", color: "#5a6f7e" }
              }
            >
              Beli eVoucher
            </button>
            <button
              type="button"
              onClick={() => switchTab("check")}
              className="rounded-lg py-2.5 text-[13px] font-semibold transition"
              style={
                tab === "check"
                  ? { background: teal, color: "#fff" }
                  : { background: "transparent", color: "#5a6f7e" }
              }
            >
              Cek eVoucher
            </button>
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-lg border border-[#f5c6cb] bg-[#f8d7da] px-3 py-2 text-center text-[13px] font-semibold text-[#721c24]">
            {error}
          </div>
        ) : null}

        {!gated ? (
          <form onSubmit={onVerify} className="mt-5 space-y-4">
            <div className="text-center">
              {/* Challenge image is a rotating data URL; next/image would cache it. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={captchaUrl}
                alt="Verification Code"
                width={170}
                height={60}
                className="mx-auto rounded border border-[#dceef3] bg-[#f4fbff]"
              />
              <button
                type="button"
                onClick={reloadCaptcha}
                className="mt-2 text-[12px] text-[#5a6f7e] underline-offset-2 hover:underline"
              >
                ↻ Reload
              </button>
            </div>
            <label className="block text-[13px] font-bold text-[#1a3a5c]">
              Masukkan Kode diatas
              <input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                required
                placeholder="Misal: xbph34"
                className={fieldClass}
                autoComplete="off"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg text-[14px] font-semibold text-white disabled:opacity-60"
              style={{ background: teal }}
            >
              → Konfirmasi
            </button>
          </form>
        ) : tab === "buy" ? (
          <div className="mt-5">
            {buyDone ? (
              <div className="space-y-3 rounded-xl border border-[#b8e6cf] bg-[#eafaf1] p-4 text-[13px] text-[#1b5e3a]">
                <p className="text-[16px] font-bold">Menunggu Pembayaran</p>
                <p>{buyDone.instruction}</p>
                <p>
                  Order ID: <code className="text-[12px]">{buyDone.id}</code>
                </p>
                <p>
                  {buyDone.planName} × {buyDone.qty} · Rp{" "}
                  {buyDone.amount.toLocaleString("id-ID")}
                </p>
                <p>Channel: {buyDone.paymentChannel}</p>
                <button
                  type="button"
                  className="mt-1 w-full rounded-lg py-2.5 font-semibold text-white"
                  style={{ background: teal }}
                  onClick={() => setBuyDone(null)}
                >
                  Buat Order Baru
                </button>
                <button
                  type="button"
                  className="w-full text-[13px] font-semibold text-[var(--lte-blue,#3c8dbc)]"
                  onClick={() => switchTab("check")}
                >
                  ← Buka Halaman Cek Voucher
                </button>
              </div>
            ) : (
              <form onSubmit={onBuy} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-[13px] font-bold text-[#1a3a5c]">
                    Nama Lengkap
                    <input
                      name="customer"
                      required
                      placeholder="Masukkan Nama Lengkap"
                      className={fieldClass}
                    />
                  </label>
                  <label className="block text-[13px] font-bold text-[#1a3a5c]">
                    Email — Optional
                    <input
                      name="email"
                      type="email"
                      placeholder="Masukkan Email Valid"
                      className={fieldClass}
                    />
                  </label>
                  <label className="block text-[13px] font-bold text-[#1a3a5c]">
                    No. Whatsapp
                    <input
                      name="phone"
                      required
                      inputMode="numeric"
                      placeholder="Contoh: 6281234567890"
                      className={fieldClass}
                    />
                    <span className="mt-1 block text-[11px] font-normal text-[#7a8a99]">
                      Dengan kode negara (tanpa +): 62812...
                    </span>
                  </label>
                  <label className="block text-[13px] font-bold text-[#1a3a5c]">
                    Paket Voucher
                    <select
                      name="planId"
                      required
                      value={selectedPlanId}
                      onChange={(e) => setSelectedPlanId(e.target.value)}
                      className={fieldClass}
                    >
                      <option value="">-- Pilih Paket --</option>
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} ( IDR {plan.priceSell.toLocaleString("id-ID")} )
                        </option>
                      ))}
                    </select>
                    {selectedPlan ? (
                      <ul className="mt-2 grid grid-cols-2 gap-1 text-[11px] font-normal text-[#5a6f7e]">
                        <li>Durasi: {selectedPlan.duration}</li>
                        <li>Quota Data: {selectedPlan.quota}</li>
                        <li>Masa Aktif: {selectedPlan.validity}</li>
                        <li>Share: {selectedPlan.sharedUsers} perangkat</li>
                      </ul>
                    ) : null}
                  </label>
                  <label className="block text-[13px] font-bold text-[#1a3a5c]">
                    Jumlah Pesanan
                    <input
                      name="qty"
                      type="number"
                      min={1}
                      max={20}
                      defaultValue={1}
                      required
                      placeholder="Minimal 1"
                      className={fieldClass}
                    />
                  </label>
                  <label className="block text-[13px] font-bold text-[#1a3a5c]">
                    DNS Hotspot — AutoLogin URL
                    <select
                      name="hotspotDomain"
                      required
                      defaultValue="-"
                      className={fieldClass}
                    >
                      <option value="-">— tidak ditentukan —</option>
                      {domains.map((domain) => (
                        <option key={domain} value={domain}>
                          {domain}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block text-[13px] font-bold text-[#1a3a5c]">
                  Metode Pembayaran
                  <select
                    name="paymentChannel"
                    required
                    defaultValue=""
                    className={fieldClass}
                  >
                    <option value="">— Pilih Metode Bayar —</option>
                    {channels.map((ch) => (
                      <option key={ch.value} value={ch.value}>
                        {ch.label}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="submit"
                  disabled={busy || !plans.length}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg text-[14px] font-semibold text-white disabled:opacity-60"
                  style={{ background: teal }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = tealDark;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = teal;
                  }}
                >
                  🛒 {busy ? "Memproses…" : "Beli Sekarang"}
                </button>
                <button
                  type="button"
                  className="w-full text-center text-[13px] font-semibold text-[#3c8dbc]"
                  onClick={() => switchTab("check")}
                >
                  ← Buka Halaman Cek Voucher
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="mt-5">
            <form onSubmit={onCheck} className="space-y-3">
              <label className="block text-[13px] font-bold text-[#1a3a5c]">
                Kode Voucher Anda
                <input
                  name="code"
                  required
                  placeholder="Misal: ABC123XYZ"
                  className={fieldClass}
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="flex h-11 w-full items-center justify-center rounded-lg text-[14px] font-semibold text-white disabled:opacity-60"
                style={{ background: teal }}
              >
                {busy ? "Mencari…" : "Cek Voucher"}
              </button>
              <button
                type="button"
                className="w-full text-center text-[13px] font-semibold text-[#3c8dbc]"
                onClick={() => switchTab("buy")}
              >
                ← Buka Halaman Pembelian
              </button>
            </form>
            {checkResult ? (
              <div className="mt-4 space-y-1.5 rounded-xl border border-[#dceef3] bg-[#f7fcfd] p-4 text-[13px] text-[#1a3a5c]">
                <p>
                  <span className="text-[#7a8a99]">Kode:</span>{" "}
                  <strong>{checkResult.code}</strong>
                </p>
                <p>
                  <span className="text-[#7a8a99]">Paket:</span> {checkResult.planName}
                </p>
                <p>
                  <span className="text-[#7a8a99]">Validity:</span> {checkResult.validity}
                </p>
                <p>
                  <span className="text-[#7a8a99]">Status:</span>{" "}
                  <strong className="uppercase">{checkResult.status}</strong>
                </p>
                <p>
                  <span className="text-[#7a8a99]">Expired:</span>{" "}
                  {new Date(checkResult.expiresAt).toLocaleString("id-ID")}
                </p>
              </div>
            ) : null}
          </div>
        )}

        <div className="mt-7 border-t border-[#e8eef1] pt-4 text-center text-[12px] text-[#9aabb8]">
          {new Date().getFullYear()} © {company}. All Rights Reserved.
        </div>
      </div>
    </div>
  );
}
