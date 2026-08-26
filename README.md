# Newbill

Satu folder: frontend, API, RADIUS, dan database.

Lokasi: `C:\Users\Dev\Documents\newbill`

```
newbill/
  src/app/              UI + API
  src/server/           AAA + RADIUS UDP
  prisma/               SQLite
  scripts/              npm run radius
  docs/                 arsitektur
```

```bash
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
```

Terminal lain: `npm run radius`

- UI: http://localhost:3000 (atau 3001 jika 3000 terpakai)
- Tes AAA: /tools/radius
- UDP: 1812 auth, 1813 acct, secret `testing123`
- Password uji: `radius123`

MikroTik: `/radius add address=<IP_PC> secret=testing123 service=ppp,hotspot timeout=2s`

Lihat `docs/isi-folder.md` dan `docs/arsitektur.md`.
