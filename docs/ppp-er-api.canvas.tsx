import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  Code,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  Pill,
  Row,
  Stack,
  Stat,
  Table,
  Text,
  computeDAGLayout,
  useCanvasState,
  useHostTheme,
} from "cursor/canvas";

type Tab = "overview" | "er" | "states" | "api" | "radius";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Fase 0–5" },
  { id: "er", label: "ER" },
  { id: "states", label: "State machine" },
  { id: "api", label: "API" },
  { id: "radius", label: "RADIUS" },
];

const ER_LABELS: Record<string, string> = {
  staff: "Staff",
  nas: "NAS",
  station: "CalledStation",
  bandwidth: "Bandwidth",
  group: "ProfileGroup",
  plan: "Plan",
  customer: "Customer",
  invoice: "Invoice",
  payment: "Payment",
  session: "RadAcct",
};

export default function PppErApiCanvas() {
  const [tab, setTab] = useCanvasState<Tab>("tab", "overview");

  return (
    <Stack gap={20}>
      <Stack gap={6}>
        <H1>Billing PPP — ER & API fase 0–5</H1>
        <Text tone="secondary">
          Kontrak clean-room untuk rebuild Next.js. Bukan clone Mixradius.
          Cakupan: auth, NAS, paket, pelanggan PPP, invoice, sesi RADIUS,
          isolir, dashboard.
        </Text>
      </Stack>

      <Row gap={8} wrap>
        {TABS.map((item) => (
          <span key={item.id}>
            <Pill active={tab === item.id} onClick={() => setTab(item.id)}>
              {item.label}
            </Pill>
          </span>
        ))}
      </Row>

      {tab === "overview" ? <Overview /> : null}
      {tab === "er" ? <ErTab /> : null}
      {tab === "states" ? <StatesTab /> : null}
      {tab === "api" ? <ApiTab /> : null}
      {tab === "radius" ? <RadiusTab /> : null}

      <Text size="small" tone="tertiary">
        Sumber: observasi UI Mixradius V3.2 tenant Ariyana ID + dokumentasi
        publik Mixradius V2.0. Field secret tidak disertakan.
      </Text>
    </Stack>
  );
}

function Overview() {
  return (
    <Stack gap={16}>
      <Grid columns={5} gap={12}>
        <Stat value="0" label="Auth + RBAC + tenant" />
        <Stat value="1" label="NAS + health API" />
        <Stat value="2" label="Bandwidth → group → plan" />
        <Stat value="3" label="Customer PPP + invoice + isolir" />
        <Stat value="4–5" label="Sesi, usage, dashboard" />
      </Grid>

      <Callout tone="info" title="Urutan dependensi">
        Jangan mulai dari dashboard. KPI hanyalah COUNT/SUM dari tabel yang
        sudah diisi fase 1–4.
      </Callout>

      <H2>Deliverable per fase</H2>
      <Table
        striped
        stickyHeader
        headers={["Fase", "Tabel wajib", "API inti", "Efek jaringan"]}
        rows={[
          [
            "0 Auth",
            "staff, session",
            "POST /auth/login, GET /me",
            "Tidak ada",
          ],
          [
            "1 NAS",
            "nas, nas_health_log",
            "CRUD /nas, POST /nas/:id/test",
            "Koneksi API MikroTik (read)",
          ],
          [
            "2 Paket",
            "bandwidth, profile_group, plan, called_station",
            "CRUD nested plans",
            "Inject PPP profile + IP pool (tulis terkontrol)",
          ],
          [
            "3 Pelanggan",
            "customer, invoice, payment, isolir_event",
            "customers, renew, invoices, mark-paid",
            "Tulis radcheck/radreply + CoA",
          ],
          [
            "4 Sesi",
            "radacct (atau accounting mirror)",
            "sessions, usage",
            "Baca accounting; disconnect",
          ],
          [
            "5 Dashboard",
            "view/agregat saja",
            "GET /dashboard",
            "Health Radius daemon + NAS ping",
          ],
        ]}
        rowTone={[
          "info",
          "neutral",
          "neutral",
          "warning",
          "success",
          "success",
        ]}
      />

      <H2>Di luar fase 0–5</H2>
      <Text>
        Voucher hotspot, e-voucher, ODP peta, tiket, Duitku, WA blast, BHP/USO,
        backup DB. Boleh dirancang belakangan tanpa mengubah skema inti di atas.
      </Text>
    </Stack>
  );
}

function ErTab() {
  const theme = useHostTheme();
  const layout = computeDAGLayout({
    nodes: Object.keys(ER_LABELS).map((id) => ({ id })),
    edges: [
      { from: "staff", to: "customer" },
      { from: "staff", to: "plan" },
      { from: "nas", to: "group" },
      { from: "nas", to: "station" },
      { from: "nas", to: "session" },
      { from: "bandwidth", to: "plan" },
      { from: "group", to: "plan" },
      { from: "station", to: "customer" },
      { from: "plan", to: "customer" },
      { from: "customer", to: "invoice" },
      { from: "customer", to: "session" },
      { from: "invoice", to: "payment" },
    ],
    direction: "horizontal",
    nodeWidth: 120,
    nodeHeight: 36,
    rankGap: 56,
    nodeGap: 20,
    padding: 12,
  });

  return (
    <Stack gap={16}>
      <H2>Graf relasi (kardinalitas di tabel bawah)</H2>
      <Text tone="secondary">
        Arah panah = dependensi create: parent harus ada sebelum child.
      </Text>
      <svg
        width="100%"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        style={{ maxWidth: 980 }}
      >
        {layout.edges.map((edge) => (
          <line
            key={`${edge.from}-${edge.to}`}
            x1={edge.sourceX}
            y1={edge.sourceY}
            x2={edge.targetX}
            y2={edge.targetY}
            stroke={
              edge.isBackEdge ? theme.stroke.secondary : theme.accent.primary
            }
            strokeWidth={1.25}
            strokeDasharray={edge.isBackEdge ? "4 3" : undefined}
          />
        ))}
        {layout.nodes.map((node) => (
          <g key={node.id} transform={`translate(${node.x},${node.y})`}>
            <rect
              width={120}
              height={36}
              rx={4}
              fill={theme.fill.secondary}
              stroke={theme.stroke.primary}
            />
            <text
              x={60}
              y={23}
              textAnchor="middle"
              fill={theme.text.primary}
              fontSize={11}
            >
              {ER_LABELS[node.id]}
            </text>
          </g>
        ))}
      </svg>

      <H2>Kardinalitas & aturan hapus</H2>
      <Table
        striped
        stickyHeader
        headers={["Relasi", "Tipe", "On delete"]}
        rows={[
          ["staff 1—N customer (owner)", "wajib", "RESTRICT"],
          ["staff 1—N plan (owner)", "wajib", "RESTRICT"],
          ["nas 1—N profile_group", "wajib", "RESTRICT"],
          ["nas 1—N called_station", "opsional", "RESTRICT"],
          ["nas 1—N radacct", "wajib accounting", "CASCADE log saja"],
          ["bandwidth 1—N plan", "wajib", "RESTRICT"],
          ["profile_group 1—N plan", "wajib PPP", "RESTRICT"],
          ["called_station 0—N customer", "opsional (semua server)", "SET NULL"],
          ["plan 1—N customer", "wajib", "RESTRICT"],
          ["customer 1—N invoice", "wajib", "RESTRICT jika unpaid"],
          ["invoice 0—N payment", "opsional", "RESTRICT"],
          ["customer 1—N radacct", "accounting", "CASCADE histori"],
        ]}
      />

      <H2>Kolom inti (logical schema)</H2>
      <Grid columns={2} gap={12}>
        <Card>
          <CardHeader trailing={<Pill tone="neutral">fase 0–1</Pill>}>
            staff / nas
          </CardHeader>
          <CardBody>
            <Text size="small">
              staff: id, username, passwordHash, role
              (admin|manager|operator), ownerScope, topupEnabled, balance,
              locale, isActive
            </Text>
            <Text size="small">
              nas: id, name, ip, apiPort, apiUser, apiPasswordRef (vault),
              radiusSecretRef, timezone, hotspotQrUrl, isolirInfoUrl,
              isActive
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader trailing={<Pill tone="neutral">fase 2</Pill>}>
            catalog
          </CardHeader>
          <CardBody>
            <Text size="small">
              bandwidth: minUp, maxUp, minDown, maxDown, burst, ownerId
            </Text>
            <Text size="small">
              profile_group: nasId, type=ppp, poolModule
              (mikrotik|sql|groupOnly), localAddress, poolStart, poolEnd, dns
            </Text>
            <Text size="small">
              plan: type=ppp, priceBase, priceSell, vatPct, validityValue,
              validityUnit, sharedUsers, priority, bandwidthId, groupId,
              ownerId, resellerVisible
            </Text>
            <Text size="small">
              called_station: nasId, type, serverName, allowedOwnerIds[]
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader trailing={<Pill active>fase 3</Pill>}>
            customer / invoice
          </CardHeader>
          <CardBody>
            <Text size="small">
              customer: customerCode, username, passwordHash, fullName, phone,
              email, address, serviceType (pppoe|pptp|l2tp|ovpn), ipMode
              (static|dynamic), staticIp?, payMode (prepaid|postpaid),
              accountStatus, bindOnLogin, boundMac, planId, nasId,
              calledStationId?, ownerId, startsAt, dueAt, registrationStatus
              (pending|active)
            </Text>
            <Text size="small">
              invoice: number, customerId, planId, planSnapshot JSON, amount,
              vatAmount, dueAt, periodStart, periodEnd, status
              (unpaid|paid|void), ownerId
            </Text>
            <Text size="small">
              payment: invoiceId, method (cash|transfer|gateway|adjust),
              amount, paidAt, externalRef?, recordedBy
            </Text>
            <Text size="small">
              isolir_event: customerId, reason (expired|unpaid|manual),
              fromProfile, toProfile, at, reversedAt?
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader trailing={<Pill tone="success">fase 4</Pill>}>
            accounting
          </CardHeader>
          <CardBody>
            <Text size="small">
              radacct: username, nasIp, framedIp, callingStationId (MAC),
              sessionId, start, stop?, inputOctets, outputOctets,
              sessionTime, acctStatus (start|interim|stop)
            </Text>
            <Text size="small">
              Online = baris tanpa stop. Usage report = agregat per bulan
              + last MAC + last IP.
            </Text>
          </CardBody>
        </Card>
      </Grid>
    </Stack>
  );
}

function StatesTab() {
  return (
    <Stack gap={16}>
      <H2>Customer.accountStatus</H2>
      <Table
        headers={["Status", "RADIUS", "Kapan masuk", "Kapan keluar"]}
        rows={[
          [
            "pending",
            "Reject / belum ditulis",
            "Registrasi belum diproses",
            "POST .../activate",
          ],
          [
            "active",
            "Accept + plan normal",
            "Aktivasi atau setelah bayar isolir",
            "disable / isolir / hapus",
          ],
          [
            "disabled",
            "Reject",
            "Manual enable/disable",
            "Enable kembali",
          ],
          [
            "isolated",
            "Accept + profile isolir",
            "Job dueAt lewat / unpaid policy",
            "Renew + mark-paid + CoA",
          ],
        ]}
        rowTone={["warning", "success", "danger", "warning"]}
      />

      <H2>Invoice.status</H2>
      <Table
        headers={["Status", "Arti", "Efek pelanggan"]}
        rows={[
          [
            "unpaid",
            "Tagihan terbuka",
            "KPI Data Tagihan +1; tombol renew mengikuti lock window",
          ],
          [
            "paid",
            "Ada payment yang menutup amount",
            "dueAt diperpanjang; isolir dilepas",
          ],
          [
            "void",
            "Dibatalkan admin",
            "Tidak masuk income; tidak extend dueAt",
          ],
        ]}
      />

      <H2>Transisi yang wajib atomik</H2>
      <Callout tone="warning" title="Renew">
        Satu transaksi DB: insert payment (jika kasir) → invoice paid → dueAt
        = max(dueAt, now) + validity (sisa waktu tidak dibuang) → tulis ulang
        radreply rate-limit/profile → CoA atau disconnect. Jangan pecah jadi
        tiga request UI tanpa orchestrator server.
      </Callout>
      <Callout tone="warning" title="Isolir job">
        Cron: dueAt &lt; now AND accountStatus=active → set isolated → ganti
        group/profile AAA → catat isolir_event. PPP boleh tetap Accept agar
        captive isolir URL jalan.
      </Callout>

      <H2>Window renew (default, bisa di settings)</H2>
      <Text>
        Tombol perpanjang aktif jika now &gt;= dueAt minus lockDays (contoh 10
        hari) dan plan.validity &gt; 0. Invoice periode baru dibuat saat renew,
        bukan setiap hari.
      </Text>

      <H3>Prepaid vs postpaid</H3>
      <Text>
        Prepaid: layanan hidup setelah paid. Postpaid: layanan hidup dulu,
        invoice menumpuk sampai mark-paid. Non-reguler di UI Mixradius = paksa
        prepaid. Tetap simpan payMode terpisah dari accountStatus.
      </Text>
    </Stack>
  );
}

function ApiTab() {
  return (
    <Stack gap={16}>
      <Callout tone="neutral" title="Konvensi">
        Prefix /api/v1. Auth: session cookie httpOnly milik aplikasi baru
        (bukan cookie Mixradius). Semua list: page, pageSize, q, sort. Operator
        otomatis ter-filter ownerId = me.id kecuali admin/manager.
      </Callout>

      <H2>Fase 0 — Auth</H2>
      <Table
        striped
        headers={["Method", "Path", "Body / query", "Response inti"]}
        rows={[
          [
            "POST",
            "/auth/login",
            "username, password",
            "Set-Cookie; { staff: public }",
          ],
          ["POST", "/auth/logout", "—", "204"],
          [
            "GET",
            "/me",
            "—",
            "{ id, role, locale, permissions[] }",
          ],
          [
            "GET",
            "/settings/app",
            "—",
            "nama usaha, lockRenewDays, timezone, currency",
          ],
          [
            "PATCH",
            "/settings/app",
            "partial settings",
            "settings (admin)",
          ],
        ]}
      />

      <H2>Fase 1 — NAS</H2>
      <Table
        striped
        headers={["Method", "Path", "Catatan"]}
        rows={[
          ["GET", "/nas", "list + lastHealth"],
          ["POST", "/nas", "secret disimpan vault; response tidak mengembalikan secret"],
          ["GET", "/nas/:id", "detail tanpa secret plaintext"],
          ["PATCH", "/nas/:id", "ganti koneksi"],
          ["DELETE", "/nas/:id", "409 jika masih ada profile_group"],
          [
            "POST",
            "/nas/:id/test",
            "ping API MikroTik: resource uptime/RAM — jangan simpan hasil penuh di log publik",
          ],
        ]}
      />

      <H2>Fase 2 — Paket</H2>
      <Table
        striped
        headers={["Method", "Path", "Catatan"]}
        rows={[
          ["CRUD", "/bandwidths", "409 jika dipakai plan"],
          ["CRUD", "/profile-groups", "PPP wajib; optional export-to-nas"],
          ["POST", "/profile-groups/:id/export-nas", "body: targetNasId"],
          ["CRUD", "/plans", "type=ppp di MVP"],
          ["CRUD", "/called-stations", "serverName = nama PPPoE server MikroTik"],
        ]}
      />

      <H2>Fase 3 — Pelanggan & tagihan</H2>
      <Table
        striped
        stickyHeader
        headers={["Method", "Path", "Kontrak"]}
        rows={[
          [
            "GET",
            "/customers",
            "filter: status, ownerId, planId, dueFrom, dueTo, q, ipMode, serviceType. summary: { registeredThisMonth, renewedThisMonth, isolated, disabled }",
          ],
          [
            "POST",
            "/customers",
            "buat pending atau active; tulis AAA jika active+paid sesuai payMode",
          ],
          ["GET", "/customers/:id", "plus lastSession, openInvoice"],
          ["PATCH", "/customers/:id", "identitas; ganti plan = kebijakan terpisah"],
          ["POST", "/customers/:id/activate", "pending → active; body payStatus"],
          ["POST", "/customers/:id/enable", "disabled → active"],
          ["POST", "/customers/:id/disable", "active → disabled + Reject"],
          [
            "POST",
            "/customers/:id/renew",
            "body: { paymentMethod, ownerId? } → invoice paid + extend dueAt",
          ],
          ["POST", "/customers/:id/bind-mac", "body: { enabled, reset? }"],
          ["POST", "/customers/bulk", "action + ids[] (owner, type, bind, delete)"],
          ["GET", "/invoices", "status, ownerId, serviceType, from, to"],
          ["GET", "/invoices/:id", "snapshot plan + payments"],
          [
            "POST",
            "/invoices/:id/mark-paid",
            "kasir; sama orkestrasi dengan renew jika periode tertutup",
          ],
          ["POST", "/invoices/:id/void", "admin; alasan wajib"],
        ]}
      />

      <H2>Fase 4 — Sesi & pemakaian</H2>
      <Table
        striped
        headers={["Method", "Path", "Kontrak"]}
        rows={[
          [
            "GET",
            "/sessions",
            "type=ppp|hotspot, nasId, q. Hanya baris tanpa stop",
          ],
          ["POST", "/sessions/:acctUniqueId/disconnect", "PoD/CoA ke NAS"],
          [
            "GET",
            "/usage",
            "q=customerCode|username|mac → profil, dueAt, octets, lastMac, monthly buckets",
          ],
        ]}
      />

      <H2>Fase 5 — Dashboard</H2>
      <Table
        striped
        headers={["Method", "Path", "Shape"]}
        rows={[
          [
            "GET",
            "/dashboard",
            "{ kpis: { incomeToday, unpaidCount, pppOnline, hotspotOnline }, host: { uptime, ramTotalMb, ramFreeMb, diskFreeGb }, counts: { hotspotUsers, pppoeUsers, vpnUsers, vouchers, vcToday, vcLoginToday, expVoucher, expCustomer }, services: { radius, mikrotik, sessionJob, dueJob } }",
          ],
          [
            "GET",
            "/dashboard/table",
            "view=income|invoices|nas + pagination",
          ],
          ["GET", "/notifications", "expired 30 hari terakhir per tipe"],
        ]}
      />

      <H3>Error kontrak</H3>
      <Text>
        401 unauth · 403 RBAC/owner · 404 · 409 relasi hapus / renew di luar
        window · 422 validasi · 503 NAS API unreachable. Body:{" "}
        <Code>{`{ error: { code, message, details? } }`}</Code>
      </Text>
    </Stack>
  );
}

function RadiusTab() {
  return (
    <Stack gap={16}>
      <H2>AAA vs billing DB</H2>
      <Text>
        Billing DB adalah sumber kebenaran bisnis. Radius membaca user yang
        di-sync (tabel radcheck/radreply/radgroup atau ekuivalen). Jangan biarkan
        MikroTik secret lokal jadi master.
      </Text>

      <H2>Atribut yang harus di-map (PPP)</H2>
      <Table
        striped
        stickyHeader
        headers={["Saat", "Atribut / aksi", "Sumber"]}
        rows={[
          ["Access-Request", "User-Name / User-Password", "customer.username"],
          [
            "Accept",
            "Mikrotik-Rate-Limit / WISPr-Bandwidth",
            "bandwidth + burst plan",
          ],
          [
            "Accept",
            "Session-Timeout (opsional hotspot; PPP lebih ke dueAt job)",
            "sisa validity jika time-limited",
          ],
          [
            "Accept",
            "Framed-IP-Address",
            "customer.staticIp jika ipMode=static",
          ],
          [
            "Accept",
            "Framed-Pool / SQL IP pool",
            "profile_group",
          ],
          [
            "Accept",
            "Mikrotik-Group / Filter-Id",
            "profile_group.name atau isolir group",
          ],
          [
            "Reject",
            "disabled / MAC mismatch bind / called-station mismatch / unknown user",
            "accountStatus, boundMac, Called-Station-Id",
          ],
          [
            "Accounting",
            "Acct-Status-Type Start/Interim/Stop + octets",
            "tulis radacct; interim ~10 menit",
          ],
          [
            "CoA / PoD",
            "setelah isolir, renew, disable, ganti plan",
            "NAS API atau RADIUS CoA port",
          ],
        ]}
      />

      <Divider />
      <H2>Job background (fase 3–5)</H2>
      <Table
        headers={["Job", "Jadwal", "Aksi"]}
        rows={[
          [
            "due-isolir",
            "tiap 5–15 menit",
            "active + dueAt < now → isolated + AAA isolir",
          ],
          [
            "nas-health",
            "tiap 1 menit",
            "test API; isi dashboard services.mikrotik",
          ],
          [
            "radius-health",
            "tiap 1 menit",
            "cek proses/status FreeRADIUS",
          ],
          [
            "session-reaper",
            "tiap 5 menit",
            "Interim stale → anggap stop (timeout)",
          ],
        ]}
      />

      <Callout tone="info" title="Yang tidak di-spec di sini">
        Isi persis dictionary MikroTik, script provision NAS, dan kredensial
        tenant. Implementasi provision NAS ditulis sendiri saat fase 1, dengan
        checklist: radius server, accounting on, interim 10 menit, timeout 2s.
      </Callout>
    </Stack>
  );
}
