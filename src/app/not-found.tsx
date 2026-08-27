import Link from "next/link";
import { TENANT_ROOT_DOMAIN } from "@/lib/tenant-host";

export default function TenantNotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-8 text-center shadow-xl">
        <p className="text-sm uppercase tracking-wide text-red-400">404</p>
        <h1 className="mt-2 text-2xl font-semibold">Tenant tidak ditemukan</h1>
        <p className="mt-4 text-slate-300">
          Subdomain tenant tidak terdaftar di platform. Periksa ejaan subdomain atau hubungi
          administrator SaaS.
        </p>
        <p className="mt-3 text-sm text-slate-400">
          Contoh URL valid: <code className="text-amber-200">kode-tenant.{TENANT_ROOT_DOMAIN}</code>
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href={`https://${TENANT_ROOT_DOMAIN}/saas/login`}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-amber-400"
          >
            SaaS Admin
          </Link>
          <Link
            href="/signup"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
          >
            Daftar tenant baru
          </Link>
        </div>
      </div>
    </main>
  );
}
