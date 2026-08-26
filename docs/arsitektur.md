# Arsitektur (ringkas)

Sumber kebenaran bisnis: Prisma SQLite (`prisma/dev.db`). Auth/acct UDP: **FreeRADIUS 3** + MySQL `radius` di 192.168.20.5.

## Alur login

1. Operator menambah NAS / Customer / Voucher di panel Newbill
2. `src/server/freeradius-sync.ts` menulis `radcheck` + `radreply` (+ upsert `nas` + alokasi port 7100+)
3. MikroTik Access-Request ke **port unik NAS** (bukan 1812 global)
4. FreeRADIUS Accept: Mikrotik-Rate-Limit, Mikrotik-Group, Framed-Pool, Framed-IP
5. Isolir: `64k/64k` + group `isolir` (job `/api/v1/jobs/isolir` + CoA Disconnect)

## Status pelanggan

| Status | FreeRADIUS |
|---|---|
| active | radcheck + radreply paket normal |
| isolated / due lewat | Accept isolir 64k/64k |
| pending / disabled | tidak ada radcheck (unknown user) |
| voucher used / expired | radcheck dihapus |

`POST /api/radius/authorize` hanya preview kebijakan SQLite. Jangan jalankan `npm run radius` (rebutan port dengan FreeRADIUS).
