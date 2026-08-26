# Arsitektur (ringkas)

Sumber kebenaran: database Prisma (`prisma/dev.db`). RADIUS tidak menyimpan user sendiri.

## Alur login

1. MikroTik Access-Request UDP `1812` (secret `testing123`)
   atau POST `/api/radius/authorize`
2. `src/server/aaa.ts` baca `Customer` / `Voucher`
3. Accept: Mikrotik-Rate-Limit, Mikrotik-Group, Framed-Pool, Framed-IP
4. Isolir: `64k/64k` + group `isolir`
5. Accounting UDP `1813` atau POST `/api/radius/accounting` → `RadAcct`

## Status pelanggan

| Status | RADIUS |
|---|---|
| active | Accept plan normal |
| isolated / due lewat | Accept isolir |
| pending / disabled | Reject |
| MAC bind salah / shared users | Reject |

Password seed: `radius123`. Voucher uji: `ARIY-8K2P`.

Diagram ER interaktif: salinan di `docs/ppp-er-api.canvas.tsx` (buka di Cursor Canvas).
