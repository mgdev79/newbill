"use client";

import { useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import { CustomerForm } from "@/components/customer-form";
import type { Customer } from "@/lib/types";

export default function Page() {
  const params = useParams<{ id: string }>();
  const [row, setRow] = useState<Customer | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    void fetch(`/api/v1/customers/${params.id}`)
      .then(async (r) => {
        if (!r.ok) {
          setMissing(true);
          return;
        }
        const data = await r.json();
        if (data.row?.kind !== "ppp") {
          setMissing(true);
          return;
        }
        setRow({
          ...data.row,
          renewedAt: null,
          serviceType: data.row.serviceType,
          status: data.row.status,
          payMode: data.row.payMode,
          kind: "ppp",
        });
      });
  }, [params.id]);

  if (missing) notFound();
  if (!row) return <p className="text-[13px] text-[var(--lte-muted)]">Memuat…</p>;
  return <CustomerForm kind="ppp" initial={row} />;
}
