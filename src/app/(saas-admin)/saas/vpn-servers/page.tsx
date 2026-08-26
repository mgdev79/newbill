"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Modal } from "@/components/modal";
import { Button, Field, PageHeader, Panel, StatusPill, inputClass } from "@/components/ui";

type Server = {
  id: string;
  name: string;
  host: string;
  region: string;
  online: boolean;
  innerRadiusIp: string;
  note: string;
  apiPort: number;
  useSsl: boolean;
  timeoutSec: number;
  apiUser: string;
  hasApiPassword: boolean;
  lastSeenAt: string | null;
  lastError: string;
  accountCount: number;
};

type FormState = {
  name: string;
  host: string;
  region: string;
  innerRadiusIp: string;
  note: string;
  apiPort: number;
  useSsl: boolean;
  timeoutSec: number;
  apiUser: string;
  apiPassword: string;
  online: boolean;
};

type TestState = {
  status: "idle" | "success" | "error";
  message: string;
  fingerprint: string;
};

const emptyForm = (): FormState => ({
  name: "",
  host: "",
  region: "Indonesia",
  innerRadiusIp: "172.31.12.1",
  note: "",
  apiPort: 8728,
  useSsl: false,
  timeoutSec: 5,
  apiUser: "newbill",
  apiPassword: "",
  online: true,
});

function formFromRow(row: Server): FormState {
  return {
    name: row.name,
    host: row.host,
    region: row.region,
    innerRadiusIp: row.innerRadiusIp,
    note: row.note,
    apiPort: row.apiPort ?? 8728,
    useSsl: Boolean(row.useSsl),
    timeoutSec: row.timeoutSec ?? 5,
    apiUser: row.apiUser || "newbill",
    apiPassword: "",
    online: row.online,
  };
}

function formFingerprint(form: FormState, editingHasPassword: boolean) {
  const authMarker =
    form.apiPassword.trim().length > 0
      ? `new:${form.apiPassword}`
      : editingHasPassword
        ? "__saved__"
        : "__none__";
  return [
    form.host.trim(),
    form.apiPort,
    form.apiUser.trim(),
    form.useSsl ? "ssl" : "plain",
    form.timeoutSec,
    authMarker,
  ].join("|");
}

export default function VpnServersPage() {
  const [rows, setRows] = useState<Server[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingHasPassword, setEditingHasPassword] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [testState, setTestState] = useState<TestState>({
    status: "idle",
    message: "Belum dites.",
    fingerprint: "",
  });

  async function load() {
    const data = await fetch("/api/v1/saas/vpn-servers").then((r) => r.json());
    setRows(data.rows);
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setEditingId(null);
    setEditingHasPassword(false);
    setForm(emptyForm());
    setError(null);
    setTestState({ status: "idle", message: "Belum dites.", fingerprint: "" });
    setOpen(true);
  }

  function openEdit(row: Server) {
    setEditingId(row.id);
    setEditingHasPassword(row.hasApiPassword);
    setForm(formFromRow(row));
    setError(null);
    setTestState({ status: "idle", message: "Belum dites.", fingerprint: "" });
    setOpen(true);
  }

  function updateForm(next: FormState) {
    setForm(next);
    if (testState.status !== "idle") {
      setTestState({
        status: "idle",
        message: "Konfigurasi berubah. Jalankan tes lagi.",
        fingerprint: "",
      });
    }
  }

  async function save() {
    setError(null);
    if (!form.name.trim() || !form.host.trim()) {
      setError("Nama dan host wajib.");
      return;
    }
    if (!editingId && !form.apiPassword.trim()) {
      setError("Password API wajib saat menambah server baru.");
      return;
    }
    if (editingId && !editingHasPassword && !form.apiPassword.trim()) {
      setError("Password API belum pernah disimpan. Isi password lalu simpan.");
      return;
    }

    const currentFingerprint = formFingerprint(form, editingHasPassword);
    const testedOk =
      testState.status === "success" && testState.fingerprint === currentFingerprint;
    const testedFail =
      testState.status === "error" && testState.fingerprint === currentFingerprint;

    if (!testedOk && !testedFail) {
      // Masih boleh simpan (demo/host belum reachable), tapi user diarahkan tes dulu sekali.
      // Tidak memblok — ini penyebab "perubahan kembali ke awal" sebelumnya.
    }

    const payload = {
      name: form.name,
      host: form.host,
      region: form.region,
      innerRadiusIp: form.innerRadiusIp,
      note: form.note,
      apiPort: form.apiPort,
      useSsl: form.useSsl,
      timeoutSec: form.timeoutSec,
      apiUser: form.apiUser,
      // Kalau tes gagal, tandai offline; kalau sukses online; selain itu ikut form.
      online: testedOk ? true : testedFail ? false : form.online,
      ...(form.apiPassword ? { apiPassword: form.apiPassword } : {}),
    };

    const response = await fetch(
      editingId ? `/api/v1/saas/vpn-servers/${editingId}` : "/api/v1/saas/vpn-servers",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Gagal menyimpan.");
      return;
    }
    setOpen(false);
    const warn = testedOk
      ? ""
      : testedFail
        ? " (tersimpan, status Offline karena tes gagal)"
        : " (tersimpan tanpa tes sukses — isi IP MikroTik nyata lalu Tes)";
    setToast(
      (editingId ? `Server ${form.name} diperbarui` : `Server ${form.name} ditambah`) +
        warn +
        ".",
    );
    await load();
  }

  async function removeRow(row: Server) {
    if (!window.confirm(`Hapus VPN server ${row.name}?`)) return;
    setBusyId(row.id);
    setToast(null);
    const response = await fetch(`/api/v1/saas/vpn-servers/${row.id}`, {
      method: "DELETE",
    });
    setBusyId(null);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setToast(data.error ?? "Tidak bisa dihapus.");
      return;
    }
    setToast(`Server ${row.name} dihapus.`);
    await load();
  }

  async function toggle(id: string, online: boolean) {
    setBusyId(id);
    await fetch(`/api/v1/saas/vpn-servers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ online: !online }),
    });
    setBusyId(null);
    await load();
  }

  async function testSaved(row: Server) {
    setBusyId(row.id);
    setToast(null);
    const response = await fetch(`/api/v1/saas/vpn-servers/${row.id}/test`, {
      method: "POST",
    });
    const result = (await response.json()) as {
      ok?: boolean;
      message?: string;
      identity?: string;
      error?: string;
    };
    setBusyId(null);
    if (result.ok) {
      setToast(
        `Koneksi ${row.name} OK` +
          (result.identity ? ` · identity ${result.identity}` : "") +
          (result.message ? ` · ${result.message}` : ""),
      );
    } else {
      setToast(result.message ?? result.error ?? "Tes gagal.");
    }
    await load();
  }

  async function testForm() {
    setTesting(true);
    setError(null);
    const currentFingerprint = formFingerprint(form, editingHasPassword);

    if (!form.host || !form.apiUser) {
      setError("Host dan username API wajib untuk tes.");
      setTestState({
        status: "error",
        message: "Host dan username API wajib untuk tes.",
        fingerprint: currentFingerprint,
      });
      setTesting(false);
      return;
    }

    // Jika edit tanpa password baru, tes lewat endpoint tersimpan
    if (editingId && !form.apiPassword && editingHasPassword) {
      const response = await fetch(`/api/v1/saas/vpn-servers/${editingId}/test`, {
        method: "POST",
      });
      const result = (await response.json()) as { ok?: boolean; message?: string };
      setTesting(false);
      if (result.ok) {
        setError(null);
        setTestState({
          status: "success",
          message: result.message ?? `Koneksi ${form.name || form.host} OK.`,
          fingerprint: currentFingerprint,
        });
      } else {
        const msg = result.message ?? "Tes gagal.";
        setError(msg);
        setTestState({
          status: "error",
          message: msg,
          fingerprint: currentFingerprint,
        });
      }
      await load();
      return;
    }

    if (!form.apiPassword) {
      setError("Password API wajib untuk tes (atau simpan dulu lalu tes dari daftar).");
      setTestState({
        status: "error",
        message: "Password API wajib untuk tes.",
        fingerprint: currentFingerprint,
      });
      setTesting(false);
      return;
    }

    const response = await fetch("/api/v1/saas/vpn-servers/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: form.host,
        apiPort: form.apiPort,
        apiUser: form.apiUser,
        apiPassword: form.apiPassword,
        useSsl: form.useSsl,
        timeoutSec: form.timeoutSec,
      }),
    });
    const result = (await response.json()) as {
      ok?: boolean;
      message?: string;
      identity?: string;
    };
    setTesting(false);
    if (result.ok) {
      setError(null);
      setTestState({
        status: "success",
        message:
          `Tes OK` +
          (result.identity ? ` · ${result.identity}` : "") +
          (result.message ? ` · ${result.message}` : ""),
        fingerprint: currentFingerprint,
      });
    } else {
      const msg = result.message ?? "Tes koneksi gagal.";
      setError(msg);
      setTestState({
        status: "error",
        message: msg,
        fingerprint: currentFingerprint,
      });
    }
  }

  return (
    <div>
      <PageHeader
        title="VPN server pool"
        description="Data tersimpan di database. Isi password API lalu Simpan. Tes koneksi opsional (host demo *.newbill.local biasanya gagal sampai diganti IP MikroTik nyata)."
        actions={<Button onClick={openCreate}>Tambah server</Button>}
      />
      {toast ? (
        <p className="mb-3 rounded-sm border border-[#bce8f1] bg-[#d9edf7] px-3 py-2 text-[13px] text-[#31708f]">
          {toast}
        </p>
      ) : null}
      <Panel title="Daftar server">
        <DataTable
          headers={[
            "Nama",
            "Host",
            "API",
            "Region",
            "Inner RADIUS",
            "Akun",
            "Status",
            "",
          ]}
          rows={rows.map((row) => [
            <div key={`${row.id}-n`}>
              <p className="font-medium">{row.name}</p>
              {row.lastError ? (
                <p className="max-w-[180px] truncate text-[11px] text-[#dd4b39]">
                  {row.lastError}
                </p>
              ) : null}
            </div>,
            row.host,
            <span key={`${row.id}-api`} className="text-[12px]">
              {row.apiUser ?? "newbill"}@{row.apiPort ?? 8728}
              {row.useSsl ? " SSL" : ""}
              {!row.hasApiPassword ? (
                <span className="ml-1 text-[#f39c12]">· no pass</span>
              ) : null}
            </span>,
            row.region,
            row.innerRadiusIp || "—",
            String(row.accountCount),
            <StatusPill key={`${row.id}-s`} status={row.online ? "ok" : "warn"} />,
            <span key={`${row.id}-a`} className="flex flex-wrap gap-1">
              <Button
                variant="secondary"
                disabled={busyId === row.id}
                onClick={() => void testSaved(row)}
              >
                {busyId === row.id ? "Tes…" : "Tes"}
              </Button>
              <Button variant="secondary" onClick={() => openEdit(row)}>
                Ubah
              </Button>
              <Button
                variant="secondary"
                disabled={busyId === row.id}
                onClick={() => void toggle(row.id, row.online)}
              >
                {row.online ? "Offline" : "Online"}
              </Button>
              <Button
                variant="ghost"
                disabled={busyId === row.id}
                onClick={() => void removeRow(row)}
              >
                Hapus
              </Button>
            </span>,
          ])}
        />
      </Panel>

      <Modal
        title={editingId ? "Ubah VPN server" : "Tambah VPN server"}
        open={open}
        onClose={() => setOpen(false)}
        size="xl"
        footer={
          <>
            <Button variant="secondary" disabled={testing} onClick={() => void testForm()}>
              {testing ? "Mengetes…" : "Tes koneksi MikroTik"}
            </Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => void save()}>Simpan</Button>
          </>
        }
      >
        {error ? <p className="mb-2 text-sm text-rose-700">{error}</p> : null}
        <p
          className={
            testState.status === "success"
              ? "mb-3 rounded-sm border border-[#d6e9c6] bg-[#dff0d8] px-3 py-2 text-[13px] text-[#3c763d]"
              : testState.status === "error"
                ? "mb-3 rounded-sm border border-[#ebccd1] bg-[#f2dede] px-3 py-2 text-[13px] text-[#a94442]"
                : "mb-3 rounded-sm border border-[#bce8f1] bg-[#d9edf7] px-3 py-2 text-[13px] text-[#31708f]"
          }
        >
          Status tes:{" "}
          <strong>
            {testState.status === "success"
              ? "Sukses"
              : testState.status === "error"
                ? "Gagal"
                : "Belum dites"}
          </strong>{" "}
          · {testState.message}
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Nama">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => updateForm({ ...form, name: e.target.value })}
              placeholder="vpn-id11"
            />
          </Field>
          <Field label="Host / IP MikroTik">
            <input
              className={inputClass}
              value={form.host}
              onChange={(e) => updateForm({ ...form, host: e.target.value })}
              placeholder="vpn-id11.example.com atau 10.x.x.x"
            />
          </Field>
          <Field label="Region">
            <select
              className={inputClass}
              value={form.region}
              onChange={(e) => updateForm({ ...form, region: e.target.value })}
            >
              <option>Indonesia</option>
              <option>Singapore</option>
            </select>
          </Field>
          <Field label="IP inner RADIUS">
            <input
              className={inputClass}
              value={form.innerRadiusIp}
              onChange={(e) => updateForm({ ...form, innerRadiusIp: e.target.value })}
            />
          </Field>
          <Field label="Username API MikroTik">
            <input
              className={inputClass}
              value={form.apiUser}
              onChange={(e) => updateForm({ ...form, apiUser: e.target.value })}
              placeholder="newbill"
              autoComplete="off"
            />
          </Field>
          <Field
            label={
              editingId && editingHasPassword
                ? "Password API (kosongkan = tetap)"
                : "Password API MikroTik"
            }
          >
            <input
              type="password"
              className={inputClass}
              value={form.apiPassword}
              onChange={(e) => updateForm({ ...form, apiPassword: e.target.value })}
              placeholder={editingHasPassword ? "••••••••" : "wajib untuk tes & API"}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Port API">
            <input
              type="number"
              className={inputClass}
              value={form.apiPort}
              onChange={(e) =>
                updateForm({ ...form, apiPort: Number(e.target.value) || 8728 })
              }
            />
          </Field>
          <Field label="Timeout (detik)">
            <input
              type="number"
              className={inputClass}
              value={form.timeoutSec}
              onChange={(e) =>
                updateForm({ ...form, timeoutSec: Number(e.target.value) || 5 })
              }
            />
          </Field>
          <label className="flex items-center gap-2 text-[13px] text-[#444] md:col-span-2">
            <input
              type="checkbox"
              checked={form.useSsl}
              onChange={(e) => updateForm({ ...form, useSsl: e.target.checked })}
            />
            Gunakan API-SSL (port biasanya 8729)
          </label>
          <Field label="Catatan">
            <input
              className={inputClass}
              value={form.note}
              onChange={(e) => updateForm({ ...form, note: e.target.value })}
            />
          </Field>
        </div>
        <p className="mt-3 text-[12px] text-[var(--lte-muted)]">
          Simpan menulis ke database meski tes gagal (host demo sering unreachable). Ganti Host
          ke IP/API MikroTik nyata lalu Tes untuk status Online. Password tidak ditampilkan ulang
          setelah disimpan — label <em>no pass</em> hilang setelah password tersimpan.
        </p>
      </Modal>
    </div>
  );
}
