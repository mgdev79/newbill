"use client";

import dynamic from "next/dynamic";

const OdpMap = dynamic(() => import("@/components/odp-map").then((mod) => mod.OdpMap), {
  ssr: false,
  loading: () => (
    <div className="rounded-sm border border-[var(--lte-line)] bg-white p-6 text-sm text-[var(--lte-muted)]">
      Memuat peta…
    </div>
  ),
});

export default function Page() {
  return <OdpMap />;
}
