"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AppHeader } from "@/components/app-header";
import { BrandBlock, NavList } from "@/components/nav-list";
import { company } from "@/lib/mock-data";

type ShellValue = {
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  noticeOpen: boolean;
  setNoticeOpen: (open: boolean) => void;
};

const ShellContext = createContext<ShellValue | null>(null);

export function useShell() {
  const value = useContext(ShellContext);
  if (!value) throw new Error("useShell must be used in AppShell");
  return value;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const value = useMemo(
    () => ({ menuOpen, setMenuOpen, noticeOpen, setNoticeOpen }),
    [menuOpen, noticeOpen],
  );

  return (
    <ShellContext.Provider value={value}>
      <div className="min-h-screen bg-[var(--lte-content)]">
        {/* Sidebar selalu terlihat di ≥768px — pola AdminLTE */}
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
