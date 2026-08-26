# Isi folder Newbill

Semua kode (frontend, API, RADIUS, database) ada di:

`C:\Users\Dev\Documents\newbill`

```
newbill/
  src/app/                 UI Next.js + route API
  src/components/          Komponen admin
  src/lib/                 util, mock, Prisma client
  src/server/aaa.ts        Logika Accept/Reject
  src/server/radius/      Codec + server UDP 1812/1813
  prisma/                  Schema SQLite + seed
  scripts/                 radius-server, tes AAA/UDP
  docs/                    Riset ER/API + salinan canvas
  .env.example             Template env
```

Bukan clone Mixradius. Jalankan dari folder ini:

```bash
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
npm run radius
```
