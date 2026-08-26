"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { BrandBlock, NavList } from "@/components/nav-list";
import {
  ShellContext,
  fallbackCompany,
  type ShellAlert,
  type ShellCompany,
} from "@/components/shell-context";

export { useShell } from "@/components/shell-context";

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [company, setCompany] = useState<ShellCompany>(fallbackCompany);
  const [alerts, setAlerts] = useState<ShellAlert[]>([]);

  useEffect(() => {
    void fetch("/api/v1/shell")
      .then((r) => r.json())
      .then((data: { company?: ShellCompany; alerts?: ShellAlert[] }) => {
        if (data.company) setCompany({ ...fallbackCompany, ...data.company });
        setAlerts(data.alerts ?? []);
      })
      .catch(() => undefined);
  }, []);

  const value = useMemo(
    () => ({ menuOpen, setMenuOpen, noticeOpen, setNoticeOpen, company, alerts }),
    [menuOpen, noticeOpen, company, alerts],
  );

  return (
    <ShellContext.Provider value={value}>
      <div className="min-h-screen bg-[var(--lte-content)]">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[230px] flex-col bg-[var(--lte-sidebar)] text-[#b8c7ce] md:flex">
          <BrandBlock />
          <div className="flex-1 overflow-y-auto py-2">
            <NavList />
          </div>
          <div className="border-t border-black/20 px-4 py-3 text-[11px] text-[#73879c]">
            Masuk sebagai {company.staff}
          </div>
        </aside>

        {menuOpen ? (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              aria-label="Tutup menu"
              onClick={() => setMenuOpen(false)}
            />
            <aside className="relative flex h-full w-[230px] flex-col bg-[var(--lte-sidebar)] text-[#b8c7ce]">
              <BrandBlock />
              <div className="flex-1 overflow-y-auto py-2">
                <NavList onNavigate={() => setMenuOpen(false)} />
              </div>
            </aside>
          </div>
        ) : null}

        <div className="min-h-screen md:pl-[230px]">
          <AppHeader />
          <main className="p-4">{children}</main>
        </div>
      </div>
    </ShellContext.Provider>
  );
}
