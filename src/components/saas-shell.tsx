"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { saasNavGroups, pathMatches } from "@/lib/nav";
import { cn } from "@/lib/utils";

function SaasBrand() {
  return (
    <div className="border-b border-indigo-950/80 px-5 py-4">
      <p className="text-xs tracking-[0.2em] text-indigo-300 uppercase">Platform</p>
      <p className="text-lg font-semibold text-white">Newbill SaaS</p>
      <p className="text-xs text-indigo-200/70">Admin tenant & VPN</p>
    </div>
  );
}

function SaasNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {saasNavGroups.map((group) => {
        if (!group.href) return null;
        const active = pathMatches(pathname, group.href);
        const Icon = group.icon;
        return (
          <Link
            key={group.href}
            href={group.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm",
              active
                ? "bg-indigo-500 text-white"
                : "text-indigo-100/80 hover:bg-indigo-950 hover:text-white",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {group.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SaasShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  async function logout() {
    await fetch("/api/v1/saas/login", { method: "DELETE" });
    window.location.href = "/saas/login";
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-indigo-950 text-indigo-50 lg:flex">
        <SaasBrand />
        <div className="flex-1 overflow-y-auto p-3">
          <SaasNav />
        </div>
        <div className="space-y-2 border-t border-indigo-900 px-5 py-4 text-xs">
          <Link href="/client/login" className="block text-indigo-200 hover:text-white">
            Client area tenant →
          </Link>
          <Link href="/login" className="block text-indigo-200 hover:text-white">
            Panel billing operator →
          </Link>
          <button type="button" onClick={() => void logout()} className="text-left text-indigo-300 hover:text-white">
            Keluar SaaS
          </button>
        </div>
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/50"
            aria-label="Tutup menu"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="relative flex h-full w-72 flex-col bg-indigo-950 text-indigo-50">
            <SaasBrand />
            <div className="flex-1 overflow-y-auto p-3">
              <SaasNav onNavigate={() => setMenuOpen(false)} />
            </div>
          </aside>
        </div>
      ) : null}

      <div className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4">
          <button
            type="button"
            className="rounded-md p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Menu"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <p className="text-sm font-medium text-slate-800">Admin SaaS</p>
          <span className="ml-auto text-xs text-slate-500">Kelola tenant · VPN · Radius · paket</span>
        </header>
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
