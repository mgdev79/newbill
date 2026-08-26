/** Generate kode voucher seperti Mixradius (prefix + kombinasi). */

export type CodeCombination =
  | "type1" // HURUF BESAR DAN ANGKA
  | "type2" // HURUF KECIL DAN ANGKA
  | "type3" // HANYA HURUF BESAR
  | "type4" // HANYA HURUF KECIL
  | "type5"; // HANYA ANGKA

const SETS: Record<CodeCombination, string> = {
  type1: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",
  type2: "abcdefghjkmnpqrstuvwxyz23456789",
  type3: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  type4: "abcdefghjkmnpqrstuvwxyz",
  type5: "23456789",
};

export function randomBatchId() {
  return `VB-${Date.now().toString(36).toUpperCase()}`;
}

export function generateVoucherCode(
  length: number,
  combination: CodeCombination = "type1",
  prefix = "",
) {
  const chars = SETS[combination] || SETS.type1;
  const n = Math.min(Math.max(length, 4), 32);
  let body = "";
  for (let i = 0; i < n; i += 1) {
    body += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}${body}`;
}

export function parseValidityToExpiry(validity: string, from = new Date()) {
  const lower = validity.toLowerCase();
  const d = new Date(from);
  const dayMatch = lower.match(/(\d+)\s*hari/);
  const monthMatch = lower.match(/(\d+)\s*bulan/) || lower.match(/(\d+)\s*bulan/);
  if (dayMatch) {
    d.setDate(d.getDate() + Number(dayMatch[1]));
    return d;
  }
  if (monthMatch || /1\s*bulan/i.test(validity)) {
    const months = monthMatch ? Number(monthMatch[1]) : 1;
    d.setMonth(d.getMonth() + months);
    return d;
  }
  // default 30 hari
  d.setDate(d.getDate() + 30);
  return d;
}
