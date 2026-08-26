"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/client/dashboard", label: "Dashboard", hash: "overview" },
  { href: "/client/vpn", label: "VPN Account", hash: "vpn_account" },
  { href: "/client/billing", label: "Billing", hash: "billing" },
];

export function ClientShell({
  children,
  tenantName,
}: {
  children: React.ReactNode;
  tenantName?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/v1/client/login", { method: "DELETE" });
    router.push("/client/login");
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-xs tracking-[0.18em] text-teal-700 uppercase">Newbill Client Area</p>
            <p className="text-sm font-semibold text-slate-900">{tenantName ?? "Tenant"}</p>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Keluar
          </button>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
          {tabs.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm whitespace-nowrap",
                  active ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-slate-100",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
