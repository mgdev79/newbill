import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const SECRET =
  process.env.MEMBER_CAPTCHA_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "newbill-member-captcha-dev";

export function randomCaptchaCode(length = 6) {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

export function signCaptcha(code: string, expMs: number) {
  const payload = `${code.toLowerCase()}.${expMs}`;
  const sig = createHmac("sha256", SECRET).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyCaptchaToken(token: string, answer: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [code, expStr, sig] = parts;
  if (!code || !expStr || !sig) return false;
  const expMs = Number(expStr);
  if (!Number.isFinite(expMs) || Date.now() > expMs) return false;
  const payload = `${code}.${expMs}`;
  const expected = createHmac("sha256", SECRET).update(payload).digest("hex");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }
  return code === answer.trim().toLowerCase();
}

export function signGate(expMs: number) {
  const payload = `ok.${expMs}`;
  const sig = createHmac("sha256", SECRET).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyGateToken(token: string | undefined) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [ok, expStr, sig] = parts;
  if (ok !== "ok" || !expStr || !sig) return false;
  const expMs = Number(expStr);
  if (!Number.isFinite(expMs) || Date.now() > expMs) return false;
  const payload = `ok.${expMs}`;
  const expected = createHmac("sha256", SECRET).update(payload).digest("hex");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** SVG captcha sederhana (noise + teks). */
export function captchaSvg(code: string) {
  const chars = code.split("");
  const letters = chars
    .map((ch, i) => {
      const x = 22 + i * 24;
      const y = 34 + ((i % 3) - 1) * 4;
      const rot = ((i % 2) * 2 - 1) * (8 + (i % 5));
      return `<text x="${x}" y="${y}" fill="#1e5a8a" font-size="28" font-family="Georgia, serif" transform="rotate(${rot} ${x} ${y})">${ch}</text>`;
    })
    .join("");
  const noise = Array.from({ length: 18 }, (_, i) => {
    const x1 = (i * 17) % 170;
    const y1 = (i * 11) % 60;
    const x2 = (x1 + 20 + (i % 9)) % 170;
    const y2 = (y1 + 10 + (i % 7)) % 60;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#9bb" stroke-width="1" opacity="0.55"/>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="170" height="60" viewBox="0 0 170 60">
  <rect width="170" height="60" fill="#f4fbff"/>
  ${noise}
  ${letters}
</svg>`;
}
