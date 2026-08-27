"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Modal } from "@/components/modal";
import { Button, Field, PageHeader, Panel, StatusPill, inputClass, textareaClass } from "@/components/ui";

type Engine = {
  id: string;
  name: string;
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUser: string;
  hasDbPassword: boolean;
  provisionMethod: "local" | "ssh";
  sshHost: string;
  sshPort: number;
  sshUser: string;
  hasSshPrivateKey: boolean;
  provisionScript: string;
  useSudo: boolean;
  coaPort: number;
  publicIp: string;
  active: boolean;
  lastTestOk: boolean;
  lastTestAt: string | null;
  lastTestError: string;
};

type FormState = {
  name: string;
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  provisionMethod: "local" | "ssh";
  sshHost: string;
  sshPort: number;
  sshUser: string;
  sshPrivateKey: string;
  provisionScript: string;
  useSudo: boolean;
  coaPort: number;
  publicIp: string;
  active: boolean;
};

const emptyForm = (): FormState => ({
  name: "default",
  dbHost: "127.0.0.1",
  dbPort: 3306,
  dbName: "radius",
  dbUser: "radius",
  dbPassword: "",
  provisionMethod: "local",
  sshHost: "",
  sshPort: 22,
  sshUser: "root",
  sshPrivateKey: "",
  provisionScript: "/opt/radius-provision/gen_nas_listener.sh",
  useSudo: true,
  coaPort: 3799,
  publicIp: "",
  active: true,
});

function formFromRow(row: Engine): FormState {
  return {
    name: row.name,
    dbHost: row.dbHost,
    dbPort: row.dbPort,
    dbName: row.dbName,
    dbUser: row.dbUser,
    dbPassword: "",
    provisionMethod: row.provisionMethod,
    sshHost: row.sshHost,
    sshPort: row.sshPort,
    sshUser: row.sshUser,
    sshPrivateKey: "",
    provisionScript: row.provisionScript,
    useSudo: row.useSudo,
    coaPort: row.coaPort,
    publicIp: row.publicIp,
    active: row.active,
  };
}

export default function RadiusEnginePage() {
  const [rows, setRows] = useState<Engine[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingHasPassword, setEditingHasPassword] = useState(false);
  const [editingHasKey, setEditingHasKey] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [testMessage, setTestMessage] = useState("Belum dites.");
  const [testOk, setTestOk] = useState<boolean | null>(null);

  async function load() {
    const data = await fetch("/api/v1/radius-engine").then((r) => r.json());
    setRows(data.rows ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setEditingId(null);
    setEditingHasPassword(false);
    setEditingHasKey(false);
    setForm(emptyForm());
    setError(null);
    setTestOk(null);
    setTestMessage("Belum dites.");
    setOpen(true);
  }

  function openEdit(row: Engine) {
    setEditingId(row.id);
    setEditingHasPassword(row.hasDbPassword);
    setEditingHasKey(row.hasSshPrivateKey);
    setForm(formFromRow(row));
    setError(null);
    setTestOk(row.lastTestOk);
    setTestMessage(row.lastTestError || (row.lastTestOk ? "Tes terakhir OK." : "Belum dites."));
    setOpen(true);
  }

  async function save() {
    setError(null);
    if (!form.dbHost.trim() || !form.dbUser.trim()) {
      setError("Host dan user MySQL wajib.");
      return;
    }
    if (!editingId && !form.dbPassword) {
      setError("Password MySQL wajib untuk engine baru.");
      return;
    }
    const response = await fetch(
      editingId ? `/api/v1/radius-engine/${editingId}` : "/api/v1/radius-engine",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          dbPassword: form.dbPassword || undefined,
          sshPrivateKey: form.sshPrivateKey || undefined,
        }),
      },
    );
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "Gagal menyimpan.");
      return;
    }
    setOpen(false);
    setToast("Radius Engine tersimpan.");
    await load();
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Hapus engine ${name}?`)) return;
    setBusyId(id);
    await fetch(`/api/v1/radius-engine/${id}`, { method: "DELETE" });
    setBusyId(null);
    setToast(`Engine ${name} dihapus.`);
    await load();
  }

  async function testForm() {
    setTesting(true);
    setError(null);
    const endpoint =
      editingId && !form.dbPassword
        ? `/api/v1/radius-engine/${editingId}/test`
        : "/api/v1/radius-engine/test";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dbHost: form.dbHost,
        dbPort: form.dbPort,
        dbName: form.dbName,
        dbUser: form.dbUser,
        dbPassword: form.dbPassword,
        provisionMethod: form.provisionMethod,
        sshHost: form.sshHost,
        sshPort: form.sshPort,
        sshUser: form.sshUser,
        sshPrivateKey: form.sshPrivateKey,
      }),
    });
    const result = (await response.json()) as { ok?: boolean; message?: string };
    setTesting(false);
    setTestOk(Boolean(result.ok));
    setTestMessage(result.message ?? (result.ok ? "OK" : "Tes gagal."));
    if (!result.ok) setError(result.message ?? "Tes gagal.");
    await load();
  }

  async function testRow(row: Engine) {
    setBusyId(row.id);
    const response = await fetch(`/api/v1/radius-engine/${row.id}/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const result = (await response.json()) as { ok?: boolean; message?: string };
    setBusyId(null);
    setToast(result.message ?? (result.ok ? "Tes OK" : "Tes gagal"));
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Radius Engine"
        description="Koneksi MySQL FreeRADIUS dan cara provision NAS. Bisa diubah tanpa edit .env."
        actions={<Button onClick={openCreate}>Tambah engine</Button>}
      />
      {toast ? (
        <p className="mb-3 rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-900">{toast}</p>
      ) : null}
      <Panel>
        <DataTable
          headers={["Nama", "MySQL", "Provision", "Public IP", "CoA", "Status", ""]}
          rows={rows.map((row) => [
            <span key={`${row.id}-n`}>
              {row.name}
              {row.active ? (
                <span className="ml-2 text-[11px] text-teal-700">aktif</span>
              ) : null}
            </span>,
            `${row.dbUser}@${row.dbHost}:${row.dbPort}/${row.dbName}`,
            row.provisionMethod === "ssh"
              ? `SSH ${row.sshUser}@${row.sshHost}:${row.sshPort}`
              : "Lokal",
            row.publicIp || "ΓÇö",
            String(row.coaPort),
            <StatusPill key={`${row.id}-s`} status={row.lastTestOk ? "ok" : "warn"} />,
            <span key={`${row.id}-a`} className="flex flex-wrap gap-2">
              <Button variant="secondary" disabled={busyId === row.id} onClick={() => void testRow(row)}>
                Tes
              </Button>
              <Button variant="secondary" onClick={() => openEdit(row)}>
                Ubah
              </Button>
              <Button variant="ghost" disabled={busyId === row.id} onClick={() => void remove(row.id, row.name)}>
                Hapus
              </Button>
            </span>,
          ])}
        />
        {!rows.length ? (
          <p className="mt-3 text-sm text-slate-500">
            Belum ada engine. Kalau FREERADIUS_DB_URL masih di env, baris default terisi otomatis
            saat sinkron pertama.
          </p>
        ) : null}
      </Panel>

      <Modal
        title={editingId ? "Ubah Radius Engine" : "Tambah Radius Engine"}
        open={open}
        onClose={() => setOpen(false)}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button variant="secondary" disabled={testing} onClick={() => void testForm()}>
              {testing ? "MengujiΓÇª" : "Tes Koneksi"}
            </Button>
            <Button onClick={() => void save()}>Simpan</Button>
          </>
        }
      >
        {error ? (
          <p className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>
        ) : null}
        <p
          className={`mb-3 rounded-md px-3 py-2 text-sm ${
            testOk === true
              ? "bg-emerald-50 text-emerald-900"
              : testOk === false
                ? "bg-rose-50 text-rose-800"
                : "bg-slate-50 text-slate-600"
          }`}
        >
          {testMessage}
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Nama">
            <input
              className={inputClass}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </Field>
          <Field label="Public IP (Script Generator)">
            <input
              className={inputClass}
              value={form.publicIp}
              onChange={(event) => setForm({ ...form, publicIp: event.target.value })}
              placeholder="IP yang dipakai MikroTik untuk RADIUS"
            />
          </Field>
          <Field label="MySQL host">
            <input
              className={inputClass}
              value={form.dbHost}
              onChange={(event) => setForm({ ...form, dbHost: event.target.value })}
            />
          </Field>
          <Field label="Port">
            <input
              className={inputClass}
              type="number"
              value={form.dbPort}
              onChange={(event) => setForm({ ...form, dbPort: Number(event.target.value) })}
            />
          </Field>
          <Field label="Nama database">
            <input
              className={inputClass}
              value={form.dbName}
              onChange={(event) => setForm({ ...form, dbName: event.target.value })}
            />
          </Field>
          <Field label="User">
            <input
              className={inputClass}
              value={form.dbUser}
              onChange={(event) => setForm({ ...form, dbUser: event.target.value })}
            />
          </Field>
          <Field
            label={
              editingId && editingHasPassword
                ? "Password MySQL (kosongkan jika tidak ganti)"
                : "Password MySQL"
            }
          >
            <input
              className={inputClass}
              type="password"
              autoComplete="new-password"
              value={form.dbPassword}
              onChange={(event) => setForm({ ...form, dbPassword: event.target.value })}
            />
          </Field>
          <Field label="CoA / incoming port">
            <input
              className={inputClass}
              type="number"
              value={form.coaPort}
              onChange={(event) => setForm({ ...form, coaPort: Number(event.target.value) })}
            />
          </Field>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <p className="font-medium text-slate-800">Provision NAS listener</p>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={form.provisionMethod === "local"}
              onChange={() => setForm({ ...form, provisionMethod: "local" })}
            />
            Lokal (proses sama)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={form.provisionMethod === "ssh"}
              onChange={() => setForm({ ...form, provisionMethod: "ssh" })}
            />
            SSH (server terpisah)
          </label>
        </div>

        {form.provisionMethod === "ssh" ? (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Field label="SSH host">
              <input
                className={inputClass}
                value={form.sshHost}
                onChange={(event) => setForm({ ...form, sshHost: event.target.value })}
              />
            </Field>
            <Field label="SSH port">
              <input
                className={inputClass}
                type="number"
                value={form.sshPort}
                onChange={(event) => setForm({ ...form, sshPort: Number(event.target.value) })}
              />
            </Field>
            <Field label="SSH user">
              <input
                className={inputClass}
                value={form.sshUser}
                onChange={(event) => setForm({ ...form, sshUser: event.target.value })}
              />
            </Field>
            <div className="md:col-span-2">
              <Field
                label={
                  editingId && editingHasKey
                    ? "Private key (kosongkan jika tidak ganti)"
                    : "Private key PEM"
                }
              >
                <textarea
                  className={`${textareaClass} min-h-28 font-mono text-[12px]`}
                  value={form.sshPrivateKey}
                  onChange={(event) => setForm({ ...form, sshPrivateKey: event.target.value })}
                  placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                  spellCheck={false}
                />
              </Field>
            </div>
          </div>
        ) : null}

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Field label="Path script provisioning">
            <input
              className={inputClass}
              value={form.provisionScript}
              onChange={(event) => setForm({ ...form, provisionScript: event.target.value })}
            />
          </Field>
          <div className="flex flex-col justify-end gap-2 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.useSudo}
                onChange={(event) => setForm({ ...form, useSudo: event.target.checked })}
              />
              Pakai sudo
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm({ ...form, active: event.target.checked })}
              />
              Aktif (dipakai runtime)
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
