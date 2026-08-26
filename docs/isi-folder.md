# Isi folder Newbill

```
newbill/
  src/app/(admin)/              Panel operator (NAS, pelanggan, voucher, tagihan, …)
  src/app/(saas-admin)/saas/    Tenant, paket lisensi, VPN server, Radius Engine
  src/app/(member)/e-voucher/   Portal beli voucher
  src/app/client/               Portal tenant
  src/app/api/v1/               JSON API ({ rows } / { row } / { error })
  src/components/               List page, peta Leaflet, script generator, cetak voucher
  src/lib/                      Prisma, money, nas-ports, radius-codec (CoA saja)
  src/server/aaa.ts             Preview kebijakan SQLite (Tools → Tes RADIUS)
  src/server/radius-policy.ts  Isolir / rate-limit → radreply
  src/server/radius-engine.ts  Konfigurasi FreeRADIUS di DB (bukan .env produksi)
  src/server/freeradius-sync.ts Customer/Voucher/NAS → MySQL
  src/server/radius-coa.ts     Disconnect-Request RFC 5176 ke NAS :3799
  src/server/isolir-job.ts      dueAt → isolir + sync
  src/server/nas-ping-job.ts    Ping API MikroTik berkala
  prisma/                       Schema SQLite + seed
  scripts/                      Util sekali-jalan (bukan daemon RADIUS)
  docs/
  .env.example                  Seed awal Radius Engine (opsional)
```

Peta: `src/components/customer-map.tsx`, `src/components/odp-map.tsx`.
Template cetak voucher: `src/app/(admin)/settings/voucher-template/`.
Finance / tickets: `src/app/(admin)/finance/`, `src/app/(admin)/tickets/`.

```bash
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
```
