"use client";

import Link from "next/link";
import { Bell, Menu, Router } from "lucide-react";
import { useShell } from "@/components/shell-context";
import { formatDate } from "@/lib/utils";

export function AppHeader() {
  const { setMenuOpen, noticeOpen, setNoticeOpen, company, alerts } = useShell();

  return (
    <header className="sticky top-0 z-20 flex h-[50px] items-center justify-between bg-[var(--lte-blue)] px-3 text-white shadow-sm">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded p-1.5 text-white/90 hover:bg-white/10 md:hidden"
          aria-label="Menu"
          onClick={() => setMenuOpen(true)}
        >
          <Menu className="size-5" />
        </button>
        <p className="text-sm font-semibold tracking-wide">
          {company.tenant}
          <span className="ml-2 hidden font-normal text-white/80 sm:inline">
            · Panel operator
          </span>
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <Link
          href="/neighbors"
          className="hidden items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium text-white/95 hover:bg-white/10 sm:inline-flex"
        >
          <Router className="size-3.5" />
          API MikroTik
        </Link>
        <Link
          href="/tools/usage"
          className="hidden rounded bg-[var(--lte-blue-dark)] px-2.5 py-1.5 text-xs font-medium text-white hover:brightness-110 sm:inline"
        >
          Cek pemakaian
        </Link>
        <div className="relative">
          <button
            type="button"
            className="relative rounded p-1.5 text-white hover:bg-white/10"
            aria-label="Notifikasi"
            onClick={() => setNoticeOpen(!noticeOpen)}
          >
            <Bell className="size-4" />
            <span className="absolute -top-0.5 -right-0.5 inline-flex size-4 items-center justify-center rounded-full bg-[#f39c12] text-[10px] font-bold text-white">
              {alerts.length}
            </span>
          </button>
          {noticeOpen ? (
            <div className="absolute right-0 mt-2 w-80 rounded border border-[var(--lte-line)] bg-white p-3 text-[var(--lte-ink)] shadow-lg">
              <p className="text-xs font-semibold">Isolir / nonaktif</p>
              {alerts.length ? (
                <ul className="mt-2 space-y-2">
                  {alerts.map((row) => (
                    <li key={row.id}>
                      <Link
                        href={`/customers/${row.kind}/${row.id}`}
                        className="block rounded px-2 py-1 text-sm hover:bg-[#f4f4f4]"
                        onClick={() => setNoticeOpen(false)}
                      >
                        <span className="font-medium">{row.name}</span>
                        <span className="block text-xs text-[var(--lte-muted)]">
                          {row.status} · jatuh tempo {formatDate(row.dueAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-[var(--lte-muted)]">Tidak ada.</p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
