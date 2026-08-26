"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Button, Field, PageHeader, Panel, StatusPill, inputClass } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { TicketStatus } from "@/lib/types";

type Reply = { id: string; author: string; message: string; createdAt: string };
type Row = {
  id: string;
  subject: string;
  customer: string;
  status: string;
  body: string;
  createdAt: string;
  replies: Reply[];
};

export default function TicketsPage({ filter }: { filter?: TicketStatus }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState({ subject: "", customer: "", body: "" });
  const [reply, setReply] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const params = filter ? `?status=${filter}` : "";
    const data = await fetch(`/api/v1/tickets${params}`).then((r) => r.json());
    setRows(data.rows ?? []);
  }

  useEffect(() => {
    void load();
  }, [filter]);

  const title =
    filter === "open" ? "Tiket aktif" : filter === "closed" ? "Tiket ditutup" : "Semua tiket";
  const selected = rows.find((row) => row.id === openId) ?? null;

  async function createTicket() {
    setBusy(true);
    setToast(null);
    const response = await fetch("/api/v1/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = (await response.json()) as { error?: string; row?: Row };
    setBusy(false);
    if (!response.ok) {
      setToast(data.error ?? "Gagal membuat tiket.");
      return;
    }
    setForm({ subject: "", customer: "", body: "" });
    await load();
    if (data.row) setOpenId(data.row.id);
  }

  async function patch(id: string, body: { status?: string; reply?: string }) {
    setBusy(true);
    const response = await fetch(`/api/v1/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setToast(data.error ?? "Gagal menyimpan.");
      return;
    }
    setReply("");
    await load();
  }

  return (
    <div>
      <PageHeader
        title={title}
        description="Tiket disimpan di database. Portal pelanggan belum live — tiket dibuat dari panel ini."
      />
      {toast ? (
        <p className="mb-3 rounded-sm border border-[#ebccd1] bg-[#f2dede] px-3 py-2 text-[13px] text-[#a94442]">
          {toast}
        </p>
      ) : null}
      {!filter || filter === "open" ? (
        <Panel className="mb-4" title="Tiket baru">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Subjek">
              <input className={inputClass} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </Field>
            <Field label="Pelanggan">
              <input className={inputClass} value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} />
            </Field>
            <Field label="Isi">
              <textarea
                className={inputClass}
                rows={3}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </Field>
          </div>
          <div className="mt-3">
            <Button disabled={busy} onClick={() => void createTicket()}>
              Buat tiket
            </Button>
          </div>
        </Panel>
      ) : null}
      <Panel title="Daftar">
        <DataTable
          headers={["Subjek", "Pelanggan", "Status", "Dibuat", ""]}
          rows={rows.map((row) => [
            row.subject,
            row.customer || "—",
            <StatusPill key={row.id} status={row.status} />,
            formatDate(row.createdAt),
            <Button key={`${row.id}-o`} variant="secondary" onClick={() => setOpenId(row.id)}>
              Buka
            </Button>,
          ])}
        />
      </Panel>
      {selected ? (
        <Panel className="mt-4" title={selected.subject}>
          <p className="text-sm text-slate-600">{selected.body || "(tanpa isi)"}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {selected.replies.map((item) => (
              <li key={item.id} className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">
                  {item.author} · {formatDate(item.createdAt)}
                </p>
                <p>{item.message}</p>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid gap-2">
            <textarea
              className={inputClass}
              rows={2}
              placeholder="Balasan"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy || !reply.trim()} onClick={() => void patch(selected.id, { reply })}>
                Kirim balasan
              </Button>
              {selected.status === "open" ? (
                <Button variant="secondary" disabled={busy} onClick={() => void patch(selected.id, { status: "closed" })}>
                  Tutup tiket
                </Button>
              ) : (
                <Button variant="secondary" disabled={busy} onClick={() => void patch(selected.id, { status: "open" })}>
                  Buka kembali
                </Button>
              )}
            </div>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
