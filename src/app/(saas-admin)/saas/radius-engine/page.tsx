import Link from "next/link";

export default function SaasRadiusEngineMovedPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-xl font-semibold">Radius Engine dipindah</h1>
      <p className="mt-3 text-slate-600">
        Konfigurasi FreeRADIUS sekarang per tenant. Buka panel operator lewat subdomain tenant,
        lalu menu Pengaturan → Radius Engine.
      </p>
      <Link href="/saas" className="mt-6 inline-block text-amber-700 underline">
        Kembali ke SaaS Admin
      </Link>
    </main>
  );
}
