# Newbill

Panel billing ISP (Next.js) + database bisnis Prisma/SQLite. Autentikasi UDP RADIUS dipegang **FreeRADIUS + MySQL** (konfigurasi di SaaS Admin → Radius Engine).

```
newbill/
  src/app/                 UI operator, SaaS Admin, client, e-voucher + API
  src/server/              FreeRADIUS sync, CoA, isolir job, Radius Engine
  prisma/                  SQLite bisnis
```

```bash
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
```

Isi koneksi FreeRADIUS di **SaaS Admin → Radius Engine** (`/saas/radius-engine`). Env `FREERADIUS_DB_URL` hanya seed awal jika tabel masih kosong.

- UI: http://localhost:3000
- Isolir due: `GET/POST /api/v1/jobs/isolir` (juga scheduler 5 menit saat `next start`)
- Resync penuh: `POST /api/v1/jobs/radius-resync`

MikroTik: pakai Script Generator per NAS (port auth/acct unik dari tabel `nas` MySQL).

Lihat `docs/isi-folder.md` dan `docs/arsitektur.md`.
