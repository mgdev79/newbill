"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { formatLongDate, formatRp } from "@/lib/money";

type ReceiptPayload = {
  row: {
    id: string;
    customerCode: string;
    name: string;
    username: string;
    password: string;
    phone: string;
    address: string;
    kind: string;
    payMode: string;
    subscriptionType: string;
  };
  invoice: {
    number: string;
    planName: string;
    planNote: string;
    periodLabel: string;
    amount: number;
    subTotal: number;
    taxAmount: number;
    deviceFee: number;
    dueAt: string;
    status: string;
    method: string;
    payMode: string;
    subscriptionType: string;
    createdAt: string;
  } | null;
  company: {
    name: string;
    address: string;
    phone: string;
  };
};

export function CustomerReceipt({
  customerId,
  kind,
}: {
  customerId: string;
  kind: "ppp" | "hotspot";
}) {
  const [data, setData] = useState<ReceiptPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPpp, setShowPpp] = useState(true);

  useEffect(() => {
    void fetch(`/api/v1/customers/${customerId}?receipt=1`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "Gagal memuat");
        setData(json as ReceiptPayload);
      })
      .catch((e: Error) => setError(e.message));
  }, [customerId]);

  if (error) {
    return (
      <p className="rounded-sm border border-[#ebccd1] bg-[#f2dede] px-3 py-2 text-[13px] text-[#a94442]">
        {error}
      </p>
    );
  }
  if (!data) {
    return <p className="text-[13px] text-[var(--lte-muted)]">Memuat bukti…</p>;
  }

  const inv = data.invoice;
  const paid = inv?.status === "paid";
  const subLabel =
    (inv?.subscriptionType === "non_regular" ? "NON-REGULAR" : "REGULAR") +
    " " +
    (inv?.payMode ?? "prepaid").toUpperCase();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="print-hidden mb-4">
        <p className="mb-3 text-[15px] italic text-[#00a65a]">
          ✔ Pelanggan baru berhasil ditambahkan !
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          <Button
            onClick={() => {
              document.body.classList.remove("pos-print");
              window.print();
            }}
          >
            A4 Print
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              document.body.classList.add("pos-print");
              window.print();
              document.body.classList.remove("pos-print");
            }}
          >
            POS Print
          </Button>
          <Link href={`/customers/${kind}`}>
            <Button variant="danger">Selesai</Button>
          </Link>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-[#444]">
          <input
            type="checkbox"
            checked={showPpp}
            onChange={(e) => setShowPpp(e.target.checked)}
          />
          Show {kind.toUpperCase()} Account on Print Result [ A4 Only ]
        </label>
      </div>

      <article className="receipt-sheet rounded-sm border border-[var(--lte-line)] bg-white p-6 shadow-sm print:border-0 print:shadow-none">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-[#eee] pb-4">
          <div>
            <p className="text-lg font-semibold tracking-wide text-[#333]">
              {data.company.name}
            </p>
            <p className="text-[12px] text-[var(--lte-muted)]">{data.company.address}</p>
            <p className="text-[12px] text-[var(--lte-muted)]">{data.company.phone}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-semibold uppercase text-[#444]">
              INVOICE |{" "}
              <span className={paid ? "italic text-[#00a65a]" : "italic text-[#dd4b39]"}>
                {paid ? "✔ SUDAH BAYAR" : "BELUM BAYAR"}
              </span>
            </h2>
            <p className="mt-1 text-[13px] text-[#555]">
              Number : # {inv?.number ?? "—"}
            </p>
          </div>
        </div>

        <div className="mb-6 grid gap-4 text-[13px] md:grid-cols-2">
          <div>
            <p className="mb-1 font-semibold text-[#444]">Ditagihkan ke :</p>
            <p>
              {data.row.name} | {data.row.customerCode}
            </p>
            <p className="text-[var(--lte-muted)]">{data.row.address || "—"}</p>
            <p className="text-[var(--lte-muted)]">{data.row.phone || "—"}</p>
          </div>
          <div>
            <p className="mb-1 font-semibold text-[#444]">Dibayarkan ke :</p>
            <p>{data.company.name}</p>
            <p className="text-[var(--lte-muted)]">{data.company.address}</p>
            <p className="text-[var(--lte-muted)]">{data.company.phone}</p>
          </div>
        </div>

        {showPpp ? (
          <div className="mb-6 rounded-sm border border-dashed border-[#ccc] bg-[#fafafa] p-3 text-[13px] print:block">
            <p className="mb-1 font-semibold text-[#444]">Akun {kind.toUpperCase()}</p>
            <p>
              Username: <strong>{data.row.username}</strong>
            </p>
            <p>
              Password: <strong>{data.row.password}</strong>
            </p>
          </div>
        ) : null}

        <h3 className="mb-2 text-[14px] font-semibold text-[#444]">Ringkasan Layanan</h3>
        <div className="overflow-x-auto">
          <table className="mb-4 w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#ddd] text-left text-[#666]">
                <th className="py-2 pr-2 font-semibold">Paket Langganan</th>
                <th className="py-2 pr-2 font-semibold">Jatuh Tempo</th>
                <th className="py-2 pr-2 font-semibold">Periode Aktif</th>
                <th className="py-2 text-right font-semibold">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#eee] align-top">
                <td className="py-3 pr-2">
                  <p className="font-semibold uppercase">{inv?.planName ?? "—"}</p>
                  {inv?.planNote ? (
                    <p className="text-[12px] text-[var(--lte-muted)]">
                      ( {inv.planNote} )
                    </p>
                  ) : null}
                  <p className="mt-1 text-[12px] text-[var(--lte-muted)]">— {subLabel}</p>
                </td>
                <td className="py-3 pr-2">
                  {inv ? formatLongDate(new Date(inv.dueAt)) : "—"}
                </td>
                <td className="py-3 pr-2">{inv?.periodLabel ?? "—"}</td>
                <td className="py-3 text-right">
                  {inv ? formatRp(inv.subTotal) : "—"}
                </td>
              </tr>
              <tr className="border-b border-[#eee]">
                <td className="py-3 pr-2">Biaya Sewa Perangkat ( Modem/Router, dll )</td>
                <td className="py-3 pr-2">—</td>
                <td className="py-3 pr-2">—</td>
                <td className="py-3 text-right">
                  {inv ? formatRp(inv.deviceFee) : formatRp(0)}
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="py-2 text-right font-medium">
                  Sub Total :
                </td>
                <td className="py-2 text-right">{inv ? formatRp(inv.subTotal) : "—"}</td>
              </tr>
              <tr>
                <td colSpan={3} className="py-1 text-right">
                  <span className="font-medium">PPN :</span>
                  <span className="ml-2 block text-[11px] text-[var(--lte-muted)]">
                    based on company & country regulation
                  </span>
                </td>
                <td className="py-1 text-right align-top">
                  {inv ? formatRp(inv.taxAmount) : "—"}
                </td>
              </tr>
              <tr className="border-t border-[#ddd]">
                <td colSpan={3} className="py-2 text-right text-[15px] font-semibold">
                  Total :
                </td>
                <td className="py-2 text-right text-[15px] font-semibold">
                  {inv ? formatRp(inv.amount) : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {paid && inv ? (
          <div className="overflow-x-auto">
            <table className="mb-4 w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[#ddd] text-left text-[#666]">
                  <th className="py-2 font-semibold">Transaction Date</th>
                  <th className="py-2 font-semibold">Gateway</th>
                  <th className="py-2 font-semibold">Transaction ID</th>
                  <th className="py-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2">{formatLongDate(new Date(inv.createdAt))}</td>
                  <td className="py-2">{inv.method}</td>
                  <td className="py-2">{inv.number}</td>
                  <td className="py-2 text-right">{formatRp(inv.amount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}

        <ul className="mt-4 list-disc space-y-1 pl-5 text-[12px] text-[#555]">
          <li>
            {paid
              ? "Pembayaran sudah diterima, terima kasih sudah melunasi tagihan anda"
              : "Tagihan belum lunas — silakan selesaikan pembayaran sesuai jatuh tempo"}
          </li>
          <li>
            Jika informasi pada bukti pembayaran ini ada kesalahan, silahkan hubungi kami{" "}
            {data.company.name} {data.company.address} {data.company.phone}
          </li>
        </ul>
        <p className="mt-6 text-center text-[11px] text-[var(--lte-muted)]">
          NOTE : This is computer generated receipt and does not require physical signature.
        </p>
      </article>

      <style>{`
        @media print {
          nav, aside, .print-hidden, header {
            display: none !important;
          }
          body.pos-print .receipt-sheet {
            max-width: 80mm;
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
}
