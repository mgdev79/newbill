import Link from "next/link";

const portals = [
  {
    href: "/saas/login",
    title: "Admin SaaS",
    desc: "Kelola tenant, paket, dan VPN Radius.",
    creds: "saas / saas123",
    tone: "bg-indigo-950 text-indigo-50 border-indigo-800",
  },
  {
    href: "/client/login",
    title: "Client Area Tenant",
    desc: "Portal tenant: dashboard & VPN account.",
    creds: "tenant@ariyana.local / tenant123",
    tone: "bg-slate-900 text-slate-50 border-slate-700",
  },
  {
    href: "/login",
    title: "Billing Operator",
    desc: "Panel ISP: NAS, pelanggan, RADIUS, tagihan.",
    creds: "admin / admin (dummy)",
    tone: "bg-teal-900 text-teal-50 border-teal-800",
  },
];

export default function GatePage() {
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs tracking-[0.2em] text-teal-700 uppercase">Newbill</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Pintu uji coba</h1>
        <p className="mt-2 text-sm text-slate-600">
          Tiga portal terpisah. Pastikan <code className="rounded bg-slate-200 px-1">npm run dev</code>{" "}
          berjalan. RADIUS UDP dipegang FreeRADIUS, bukan npm run radius.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {portals.map((portal) => (
            <Link
              key={portal.href}
              href={portal.href}
              className={`rounded-xl border p-4 transition hover:opacity-95 ${portal.tone}`}
            >
              <p className="text-sm font-semibold">{portal.title}</p>
              <p className="mt-2 text-xs opacity-80">{portal.desc}</p>
              <p className="mt-4 font-mono text-[11px] opacity-90">{portal.creds}</p>
            </Link>
          ))}
        </div>
        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <p className="font-medium">Checklist cepat</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-600">
            <li>Admin SaaS → Tenant → provision VPN (jika perlu)</li>
            <li>Client area → tab VPN Account → salin kredensial</li>
            <li>Billing → Router NAS → Script Generator / Tes RADIUS</li>
            <li>
              RADIUS seed: <code>budi.s</code> / <code>radius123</code>, MAC{" "}
              <code>4C:5E:0C:11:22:33</code>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
