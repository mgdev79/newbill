/** Format Rupiah seperti Mixradius: Rp. 165.000,00 */
export function formatRp(amount: number) {
  const n = Math.round(amount);
  const abs = Math.abs(n).toString();
  const withDots = abs.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `Rp. ${n < 0 ? "-" : ""}${withDots},00`;
}

export function formatLongDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Harga jual dianggap termasuk PPN (seperti bukti Mixradius). */
export function splitInclusiveTax(total: number, vatPct: number) {
  if (vatPct <= 0) {
    return { subTotal: total, taxAmount: 0 };
  }
  const subTotal = Math.round(total / (1 + vatPct / 100));
  return { subTotal, taxAmount: total - subTotal };
}

export function makeInvoiceNumber() {
  const rand = Math.floor(100000000000 + Math.random() * 899999999999);
  return `INV-${rand}`;
}

export function makeMemberId() {
  return String(Math.floor(100000000000 + Math.random() * 899999999999));
}
