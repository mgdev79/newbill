"use client";

import { AppShell } from "@/components/app-shell";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
