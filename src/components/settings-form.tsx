"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button, PageHeader, Panel } from "@/components/ui";

export function SettingsForm({
  title,
  description,
  namespace,
  notice,
  keys,
  children,
}: {
  title: string;
  description?: string;
  namespace: string;
  notice?: string;
  keys?: string[];
  children: ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const prefix = namespace ? `${namespace}.` : "";
    const url = keys?.length
      ? `/api/v1/settings?keys=${encodeURIComponent(keys.join(","))}`
      : prefix
        ? `/api/v1/settings?prefix=${encodeURIComponent(prefix)}`
        : "/api/v1/settings";
    void fetch(url)
      .then((r) => r.json())
      .then((data: { rows?: { key: string; value: string }[] }) => {
        const form = formRef.current;
        if (!form) return;
        for (const row of data.rows ?? []) {
          const name = prefix ? row.key.slice(prefix.length) : row.key;
          const el = form.elements.namedItem(name);
          if (
            el instanceof HTMLInputElement ||
            el instanceof HTMLSelectElement ||
            el instanceof HTMLTextAreaElement
          ) {
            if (el instanceof HTMLInputElement && el.type === "file") continue;
            el.value = row.value;
          }
        }
      });
  }, [namespace]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setSaved(false);
    setError(null);
    const fd = new FormData(event.currentTarget);
    const entries: Record<string, string> = {};
    for (const [name, value] of fd.entries()) {
      if (typeof value !== "string") continue;
      const key = namespace ? `${namespace}.${name}` : name;
      entries[key] = value;
    }
    const response = await fetch("/api/v1/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });
    setBusy(false);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Gagal menyimpan.");
      return;
    }
    setSaved(true);
  }

  return (
    <div>
      <PageHeader title={title} description={description} />
      {notice ? (
        <p className="mb-3 rounded-sm border border-[#bce8f1] bg-[#d9edf7] px-3 py-2 text-[13px] text-[#31708f]">
          {notice}
        </p>
      ) : null}
      {saved ? (
        <p className="mb-3 rounded-sm border border-[#d6e9c6] bg-[#dff0d8] px-3 py-2 text-[13px] text-[#3c763d]">
          Pengaturan tersimpan ke database.
        </p>
      ) : null}
      {error ? (
        <p className="mb-3 rounded-sm border border-[#ebccd1] bg-[#f2dede] px-3 py-2 text-[13px] text-[#a94442]">
          {error}
        </p>
      ) : null}
      <form ref={formRef} onSubmit={(event) => void onSubmit(event)}>
        <Panel>
          <div className="grid gap-3 md:grid-cols-2">{children}</div>
          <div className="mt-4">
            <Button type="submit" disabled={busy}>
              {busy ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </Panel>
      </form>
    </div>
  );
}
