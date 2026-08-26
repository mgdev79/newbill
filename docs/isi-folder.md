# Isi folder Newbill

```
newbill/
  src/app/                      UI Next.js + route API
  src/components/               Komponen admin
  src/lib/                      util, Prisma, nas-ports
  src/server/aaa.ts             Preview kebijakan (tools)
  src/server/radius-policy.ts  Isolir / rate-limit → radreply
  src/server/freeradius-sync.ts Customer/Voucher/NAS → MySQL
  src/server/radius-coa.ts     Disconnect-Request ke NAS :3799
  src/server/isolir-job.ts      dueAt → isolir + sync
  prisma/                       Schema SQLite + seed
  scripts/                      radius-server lama (jangan dijalankan)
  docs/
  .env.example                  FREERADIUS_DB_URL
```

```bash
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
```
