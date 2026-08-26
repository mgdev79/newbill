"use client";

import { createContext, useContext } from "react";

export type ShellAlert = {
  id: string;
  name: string;
  status: string;
  dueAt: string;
  kind: string;
};

export type ShellCompany = {
  name: string;
  tenant: string;
  staff: string;
};

export type ShellValue = {
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  noticeOpen: boolean;
  setNoticeOpen: (open: boolean) => void;
  company: ShellCompany;
  alerts: ShellAlert[];
};

export const fallbackCompany: ShellCompany = {
  name: "Newbill",
  tenant: "Newbill",
  staff: "admin",
};

export const ShellContext = createContext<ShellValue | null>(null);

export function useShell() {
  const value = useContext(ShellContext);
  if (!value) throw new Error("useShell must be used in AppShell");
  return value;
}
