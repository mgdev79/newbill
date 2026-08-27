import Link from "next/link";
import { TENANT_ROOT_DOMAIN } from "@/lib/tenant-host";

export default function TenantRequiredPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-8 text-center shadow-xl">
        <p className="text-sm uppercase tracking-wide text-amber-400">Panel operator</p>
        <h1 className="mt-2 text-2xl font-semibold">Butuh subdomain tenant</h1>
        <p className="mt-4 text-slate-300">
          Panel operasional ISP hanya tersedia lewat subdomain tenant, misalnya{" "}
          <code className="rounded bg-slate-800 px-1.5 py-0.5 text-amber-200">
            tenant-a.{TENANT_ROOT_DOMAIN}
          </code>
          .
        </p>
        <p className="mt-3 text-sm text-slate-400">
          Domain utama <strong>{TENANT_ROOT_DOMAIN}</strong> dipakai untuk SaaS Admin dan area klien.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/saas/login"
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-amber-400"
          >
            SaaS Admin
          </Link>
          <Link
            href="/client/login"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
          >
            Client Area
          </Link>
        </div>
      </div>
    </main>
  );
}
