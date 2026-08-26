"use client";

import dynamic from "next/dynamic";

const CustomerMap = dynamic(
  () => import("@/components/customer-map").then((mod) => mod.CustomerMap),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-sm border border-[var(--lte-line)] bg-white p-6 text-sm text-[var(--lte-muted)]">
        Memuat peta…
      </div>
    ),
  },
);

export default function Page() {
  return <CustomerMap />;
}
