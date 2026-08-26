Ganti mesin RADIUS newbill dari implementasi Node.js custom (`src/server/radius/*`, `npm run radius`) menjadi **FreeRADIUS + MySQL yang sudah berjalan** di LXC `RadiusServer` (192.168.20.5, satu mesin yang sama dengan tempat newbill akan di-deploy). newbill tetap jadi web panel (Next.js) dan sumber data bisnis (Customer, Plan, Voucher, Invoice, dst di SQLite/Prisma) -- yang berubah cuma: **FreeRADIUS yang menjawab paket UDP 1812/1813, bukan Node.js**, dan newbill wajib menulis/sinkron data yang relevan ke database MySQL FreeRADIUS supaya autentikasi jalan.

## Kenapa pindah
FreeRADIUS itu software matang, dipakai skala besar 20+ tahun, protokolnya sudah teruji jauh lebih dalam dibanding parser RADIUS hand-rolled di `src/server/radius/codec.ts`. Sudah saya siapkan dan verifikasi end-to-end di 192.168.20.5: FreeRADIUS 3.2.5 + MySQL 8, skema `radcheck`/`radreply`/`nas`/`radacct` standar, plus fitur tambahan **satu port UDP unik per router (NAS)** yang sudah saya bangun dan test (auth/acct port dialokasikan otomatis per NAS, via script provisioning yang generate config + restart FreeRADIUS dengan rollback otomatis kalau gagal).

## Koneksi ke database FreeRADIUS (MySQL, lokal karena newbill di-deploy di mesin yang sama)
```
host: 127.0.0.1 (atau localhost, karena newbill jalan di 192.168.20.5 juga)
port: 3306
database: radius
user: radius
password: mLHVDqnJNm5hRr0kB9je9RsK
```
Karena Prisma newbill datasource-nya SQLite (`prisma/schema.prisma`), JANGAN ganti datasource utama. Tambahkan koneksi MySQL kedua yang terpisah, cukup pakai library `mysql2` (raw parameterized query, tidak perlu Prisma client kedua) khusus untuk sinkronisasi ke tabel radcheck/radreply/nas. Simpan kredensial di atas sebagai env var baru, misal `FREERADIUS_DB_URL="mysql://radius:mLHVDqnJNm5hRr0kB9je9RsK@127.0.0.1:3306/radius"`.

## Skema tabel FreeRADIUS yang perlu ditulis newbill

**radcheck** (kredensial login, dicek FreeRADIUS saat Access-Request):
```sql
INSERT INTO radcheck (username, attribute, op, value) VALUES (?, 'Cleartext-Password', ':=', ?)
```

**radreply** (atribut dikirim balik saat Accept -- rate limit, group, pool, dst):
```sql
INSERT INTO radreply (username, attribute, op, value) VALUES
  (?, 'Mikrotik-Rate-Limit', ':=', ?),
  (?, 'Mikrotik-Group', ':=', ?),
  (?, 'Framed-Pool', ':=', ?)
```

**nas** (schema sudah saya extend dengan kolom multi-port; lihat di bawah):
```
id, nasname, shortname, type, ports, radius_auth_port, radius_acct_port,
mikrotik_api_port, mikrotik_api_user, mikrotik_api_pass, secret, server, community, description
```

## Yang perlu dikerjakan di kode newbill

### 1. Matikan RADIUS server Node.js
- Hapus/nonaktifkan script `radius` di `package.json` (`"radius": "tsx ... scripts/radius-server.ts"`), atau biarkan filenya ada tapi TIDAK dijalankan lagi -- FreeRADIUS yang pegang port 1812/1813/3799 sekarang, dua-duanya tidak boleh jalan bersamaan di mesin yang sama (rebutan port).
- `src/server/aaa.ts` (`authorize`, `accounting`, `disconnectSession`) sudah tidak dipanggil oleh proses RADIUS manapun -- logic isolir/rate-limit di dalamnya perlu **dipindah jadi fungsi yang menghasilkan nilai radreply**, dipanggil dari layer sync (poin 3), bukan dari handler UDP lagi.

### 2. Sinkronisasi Customer/Voucher/Nas -> MySQL FreeRADIUS
Buat modul baru (mis. `src/server/freeradius-sync.ts`) dengan fungsi:
- `syncCustomerRadius(customer)`: hapus baris lama customer itu di radcheck+radreply (`DELETE ... WHERE username=?`), lalu insert ulang sesuai status terkini -- **pakai logic yang SAMA PERSIS dengan yang sudah ada di `aaa.ts` sekarang**:
  - `status IN ('pending','disabled')` -> jangan insert radcheck sama sekali (user tidak bisa login = FreeRADIUS otomatis reject "unknown user"), ATAU insert radcheck tapi radreply kosong + `Auth-Type := Reject` (pilih salah satu, konsisten).
  - isolir (`status='isolated'` atau `dueAt` sudah lewat) -> radreply `Mikrotik-Rate-Limit=64k/64k`, `Mikrotik-Group=isolir`.
  - aktif -> radreply sesuai `plan.bandwidth` (`maxUp/maxDown`) + `plan.group.name` (Mikrotik-Group) + `plan.group.pool` (Framed-Pool) + `customer.ip` kalau ada (Framed-IP-Address).
  - Panggil fungsi ini di SETIAP tempat yang saat ini mengubah Customer: create (`POST /api/v1/customers`), update status/plan/harga, ganti password, hapus (hapus juga radcheck/radreply-nya).
- `syncVoucherRadius(voucher)`: sama polanya, keyed by `voucher.code`. Voucher yang sudah `used=true` atau `expiresAt` lewat -> hapus dari radcheck (supaya tidak bisa dipakai lagi; FreeRADIUS reject otomatis kalau user tidak ada).
- `syncNasRadius(nas)`: upsert baris ke tabel `nas` (nasname=`nas.ip`, secret=`nas.radiusSecret`, shortname=`nas.name`, description=`nas.description`). **Kalau baris NAS baru (belum punya `radius_auth_port`)**: alokasikan port lewat helper yang sama pola dengan yang sudah ada di `src/lib/nas-ports.ts` kalau sudah dibuat sebelumnya (basis 7100, step 2, cek unik) -- simpan ke kolom `radius_auth_port`/`radius_acct_port` di tabel `nas` MySQL itu langsung (bukan di SQLite newbill, biar satu sumber kebenaran untuk port).
  - Setelah update port, **panggil script provisioning** `/opt/radius-provision/gen_nas_listener.sh <nas_id_di_mysql>` di server yang sama (pakai `child_process.execFile` dari Node, BUKAN `exec` biar aman dari shell injection). Script ini butuh privilege root untuk restart FreeRADIUS -- kalau newbill jalan sebagai user biasa (bukan root), minta saya siapkan sudoers rule khusus (`www-data ALL=(root) NOPASSWD: /opt/radius-provision/gen_nas_listener.sh *` atau sesuai user proses Next.js-nya) supaya bisa panggil lewat `sudo`. **Beri tahu saya user proses Node yang menjalankan newbill di production supaya sudoers-nya saya pasang benar.**

### 3. Job terjadwal untuk isolir otomatis (dueAt lewat)
`syncCustomerRadius` di atas cuma jalan saat ada perubahan eksplisit dari UI. Tapi status isolir juga harus berubah OTOMATIS saat `dueAt` terlewati tanpa ada aksi user. Tambahkan cron/scheduled job (bisa pakai `node-cron` atau route API yang dipanggil scheduler eksternal tiap beberapa menit) yang: cari semua Customer dengan `dueAt < now()` dan status masih `active`, update status jadi isolir di SQLite, lalu panggil `syncCustomerRadius` untuk tiap customer itu supaya radreply di MySQL ikut ter-update ke `64k/64k` + group isolir.

### 4. CoA/Disconnect beneran (opsional tapi direkomendasikan)
Supaya isolir langsung memutus sesi yang sedang online (bukan nunggu re-auth berikutnya), kirim RADIUS Disconnect-Request (RFC 5176) ke NAS terkait setelah isolir. Bisa pakai `radclient` FreeRADIUS langsung dari Node (`child_process.execFile('radclient', [...])`) ke `nas.ip:3799` pakai `nas.radiusSecret`, atau implementasikan pengirim paket native kalau mau tanpa dependency ke binary FreeRADIUS.

### 5. Script Generator (`src/lib/nas-script.ts`, `ScriptGeneratorModal`)
Tetap dipakai apa adanya -- cuma pastikan `radiusAuthPort`/`radiusAcctPort`/`radiusSecret` yang dikirim ke `generateRadiusScript()` diambil dari baris `nas` di MySQL (hasil alokasi poin 2), bukan dari env global `RADIUS_AUTH_PORT`/`RADIUS_ACCT_PORT` lagi (yang sekarang jadi tidak relevan karena FreeRADIUS yang jalan, bukan `npm run radius`).

## Yang saya urus di sisi server (bukan tugas Cursor)
- FreeRADIUS + MySQL `radius` DB sudah jalan dan diverifikasi (`Access-Accept` end-to-end, termasuk multi-port per NAS).
- Sudoers rule untuk trigger provisioning script dari proses newbill -- saya pasang begitu tahu user proses Node-nya.
- CoA di sisi FreeRADIUS (kalau perlu dukungan tambahan selain `radclient` langsung) -- kabari saya kalau approach poin 4 butuh sokongan config tambahan.

## Definition of done
- `npm run radius` tidak perlu dijalankan lagi -- cuma `npm run dev`/`npm run build && npm run start` (Next.js) yang jalan.
- Tambah Customer baru di panel newbill -> muncul baris di `radcheck`+`radreply` MySQL FreeRADIUS -- cek lewat `radtest <username> <password> localhost:<port_nas_terkait> 0 <secret_nas>` dapat `Access-Accept` dengan atribut rate-limit/group yang benar.
- Tambah NAS baru di panel -> otomatis dapat port unik, FreeRADIUS listen di port itu (`ss -tulnp | grep <port>` di 192.168.20.5), Script Generator menampilkan port yang sama persis.
- Ubah status Customer jadi isolir (manual atau via job dueAt) -> radtest user itu tetap Accept tapi dengan `Mikrotik-Rate-Limit=64k/64k`.
- Hapus Customer/Voucher -> baris terkait di radcheck/radreply MySQL ikut terhapus (tidak ada data basi yang bisa dipakai login).
