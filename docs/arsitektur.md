# Arsitektur (ringkas)

Sumber kebenaran bisnis: Prisma SQLite (`prisma/dev.db`). Auth/acct UDP: **FreeRADIUS 3** + MySQL, koneksi dan IP publik diatur di **SaaS Admin → Radius Engine** (`RadiusEngine` di SQLite; env `FREERADIUS_*` hanya seed awal).

## Portal

| Path | Siapa |
|---|---|
| `/saas/*` | Admin SaaS: tenant, paket lisensi, VPN server, Radius Engine |
| `/client/*` | Portal tenant (VPN / billing ringkas) |
| `/` operator | Billing ISP: NAS, pelanggan, voucher, tagihan, ODP, tiket, finance |

## Alur login RADIUS

1. Operator menambah NAS / Customer / Voucher di panel
2. `src/server/freeradius-sync.ts` menulis `radcheck` + `radreply` (+ upsert `nas` + alokasi port 7100+)
3. MikroTik Access-Request ke **port unik NAS** (bukan 1812 global)
4. FreeRADIUS Accept: Mikrotik-Rate-Limit, Mikrotik-Group, Framed-Pool, Framed-IP
5. Isolir: `64k/64k` + group `isolir` (job `/api/v1/jobs/isolir` + CoA Disconnect ke NAS :3799)

## Status pelanggan

| Status | FreeRADIUS |
|---|---|
| active | radcheck + radreply paket normal |
| isolated / due lewat | Accept isolir 64k/64k |
| pending / disabled | tidak ada radcheck (unknown user) |
| voucher used / expired | radcheck dihapus |

`POST /api/radius/authorize` hanya preview kebijakan SQLite (Tools → Tes RADIUS). Paket UDP dijawab FreeRADIUS, bukan proses Node.

## Fitur panel yang ditambah belakangan

- **SaaS Admin:** tenant, kuota VPN, lisensi, Radius Engine
- **Finance:** harian/periode, topup reseller, payout
- **Tickets:** open/closed + balasan
- **Peta:** pelanggan (`/customers/map`) dan ODP (`/odp/map`) Leaflet
- **Voucher template:** HTML cetak di Pengaturan
- **e-Voucher:** portal member + data order di admin

## API JSON (`/api/v1`)

CRUD list memakai `{ rows }`, item `{ row }`, gagal `{ error }`. Endpoint aksi (login, test koneksi, job, CoA) boleh menambah `{ ok }` / field khusus; tetap `{ error }` kalau gagal.
