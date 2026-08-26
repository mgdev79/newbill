"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SaasShell } from "@/components/saas-shell";

export default function SaasAdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/saas/login";
  const [ready, setReady] = useState(isLogin);

  useEffect(() => {
    if (isLogin) {
      setReady(true);
      return;
    }
    void fetch("/api/v1/saas/login")
      .then((r) => {
        if (r.status === 401) {
          router.replace("/saas/login");
          return;
        }
        setReady(true);
      })
      .catch(() => router.replace("/saas/login"));
  }, [isLogin, router, pathname]);

  if (isLogin) return <>{children}</>;
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">
        Memuat Admin SaaS…
      </div>
    );
  }
  return <SaasShell>{children}</SaasShell>;
}
