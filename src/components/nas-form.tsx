"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ScriptGeneratorButton } from "@/components/script-generator-modal";
import { Button, Field, PageHeader, Panel, inputClass } from "@/components/ui";
import type { NasPublic } from "@/lib/nas-dto";

const timezones = [
  "Asia/Jakarta",
  "Asia/Makassar",
  "Asia/Jayapura",
  "Asia/Singapore",
  "UTC",
];

type FormState = {
  name: string;
  ip: string;
  apiPort: string;
  useSsl: boolean;
  timeoutSec: string;
  apiUser: string;
  apiPassword: string;
  timezone: string;
  enabled: boolean;
  description: string;
  radiusSecret: string;
  radiusAddress: string;
  latitude: string;
  longitude: string;
  coverageM: string;
  hotspotUrl: string;
  isolirUrl: string;
  enablePpp: boolean;
  enableHotspot: boolean;
};

type TestResult = {
  ok: boolean;
  message: string;
  identity?: string;
  version?: string;
  board?: string;
  uptime?: string;
};

const emptyForm: FormState = {
  name: "",
  ip: "",
  apiPort: "8728",
  useSsl: false,
  timeoutSec: "5",
  apiUser: "newbill",
  apiPassword: "",
  timezone: "Asia/Jakarta",
  enabled: true,
  description: "",
  radiusSecret: "testing123",
  radiusAddress: "",
  latitude: "",
  longitude: "",
  coverageM: "0",
  hotspotUrl: "",
  isolirUrl: "",
  enablePpp: true,
  enableHotspot: false,
};

export function NasForm({ nasId }: { nasId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loaded, setLoaded] = useState(!nasId);
  const [busy, setBusy] = useState<"save" | "test" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [test, setTest] = useState<TestResult | null>(null);
  const [hasApiPassword, setHasApiPassword] = useState(false);

  useEffect(() => {
    void (async () => {
      const list = await fetch("/api/v1/nas");
      const payload = (await list.json()) as {
        meta?: { suggestedRadiusIp?: string };
      };
      const suggested = payload.meta?.suggestedRadiusIp ?? "";

      if (!nasId) {
        setForm((current) => ({
          ...current,
          radiusAddress: suggested || current.radiusAddress,
        }));
        return;
      }

      const response = await fetch(`/api/v1/nas/${nasId}`);
      if (!response.ok) {
        setError("Router tidak ditemukan.");
        setLoaded(true);
        return;
      }
      const data = (await response.json()) as { row: NasPublic };
      const row = data.row;
      setHasApiPassword(row.hasApiPassword);
      setForm({
        name: row.name,
        ip: row.ip,
        apiPort: String(row.apiPort),
        useSsl: row.useSsl,
        timeoutSec: String(row.timeoutSec),
        apiUser: row.apiUser,
        apiPassword: "",
        timezone: row.timezone,
        enabled: row.enabled,
        description: row.description,
        radiusSecret: "",
        radiusAddress: suggested,
        latitude: row.latitude,
        longitude: row.longitude,
        coverageM: String(row.coverageM),
        hotspotUrl: row.hotspotUrl,
        isolirUrl: row.isolirUrl,
        enablePpp: row.enablePpp,
        enableHotspot: row.enableHotspot,
      });
      setLoaded(true);
    })();
  }, [nasId]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function testConnection() {
    setBusy("test");
    setError(null);
    setTest(null);
    const response = await fetch("/api/v1/nas/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ip: form.ip,
        apiPort: Number(form.apiPort),
        apiUser: form.apiUser,
        apiPassword: form.apiPassword,
        useSsl: form.useSsl,
        timeoutSec: Number(form.timeoutSec),
      }),
    });
    const result = (await response.json()) as TestResult;
    setTest(result);
    setBusy(null);
  }

  async function save() {
    setBusy("save");
    setError(null);
    const payload = {
      name: form.name,
      ip: form.ip,
      apiPort: Number(form.apiPort),
      useSsl: form.useSsl,
      timeoutSec: Number(form.timeoutSec),
      apiUser: form.apiUser,
      apiPassword: form.apiPassword || undefined,
      timezone: form.timezone,
      enabled: form.enabled,
      description: form.description,
      radiusSecret: form.radiusSecret || undefined,
      latitude: form.latitude,
      longitude: form.longitude,
      coverageM: Number(form.coverageM),
      hotspotUrl: form.hotspotUrl,
      isolirUrl: form.isolirUrl,
      enablePpp: form.enablePpp,
      enableHotspot: form.enableHotspot,
    };

    const response = await fetch(nasId ? `/api/v1/nas/${nasId}` : "/api/v1/nas", {
      method: nasId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { error?: string };
    setBusy(null);
    if (!response.ok) {
      setError(data.error ?? "Gagal menyimpan router.");
      return;
    }
    setToast("Router tersimpan ke database.");
    router.push("/nas");
    router.refresh();
  }

  if (!loaded) {
    return <p className="text-sm text-slate-500">Memuat form router…</p>;
  }

  return (
    <div>
      <PageHeader
        title={nasId ? "Ubah router NAS" : "Tambah router NAS"}
        description="Isi koneksi API, tes ke MikroTik, simpan ke database. Skrip RouterOS lewat Script Generator."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ScriptGeneratorButton radiusAddressOverride={form.radiusAddress} />
            <Link href="/nas" className="text-sm text-slate-600 hover:underline">
              Kembali ke daftar
            </Link>
          </div>
        }
      />
      {toast ? (
        <p className="mb-3 rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-900">{toast}</p>
      ) : null}
      {error ? (
        <p className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>
      ) : null}

      <Panel>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Nama router">
            <input
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
              className={inputClass}
              placeholder="CORE-PPPOE"
            />
          </Field>
          <Field label="IP / hostname">
            <input
              value={form.ip}
              onChange={(event) => set("ip", event.target.value)}
              className={inputClass}
              placeholder="10.10.10.1"
            />
          </Field>
          <Field label="Username API">
            <input
              value={form.apiUser}
              onChange={(event) => set("apiUser", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field
            label={
              nasId && hasApiPassword
                ? "Password API (kosongkan jika tidak ganti)"
                : "Password API"
            }
          >
            <input
              type="password"
              value={form.apiPassword}
              onChange={(event) => set("apiPassword", event.target.value)}
              className={inputClass}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Port API">
            <input
              value={form.apiPort}
              onChange={(event) => set("apiPort", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Timeout (detik)">
            <input
              value={form.timeoutSec}
              onChange={(event) => set("timeoutSec", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Radius secret">
            <input
              type="password"
              value={form.radiusSecret}
              onChange={(event) => set("radiusSecret", event.target.value)}
              className={inputClass}
              placeholder={nasId ? "Kosongkan jika tidak ganti" : "testing123"}
              autoComplete="new-password"
            />
          </Field>
          <Field label="IP server Newbill (RADIUS)">
            <input
              value={form.radiusAddress}
              onChange={(event) => set("radiusAddress", event.target.value)}
              className={inputClass}
              placeholder="IP PC / VPS yang menjalankan Newbill"
            />
          </Field>
          <Field label="Timezone">
            <select
              value={form.timezone}
              onChange={(event) => set("timezone", event.target.value)}
              className={inputClass}
            >
              {timezones.map((zone) => (
                <option key={zone}>{zone}</option>
              ))}
            </select>
          </Field>
          <Field label="Cakupan (meter)">
            <input
              value={form.coverageM}
              onChange={(event) => set("coverageM", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Latitude">
            <input
              value={form.latitude}
              onChange={(event) => set("latitude", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Longitude">
            <input
              value={form.longitude}
              onChange={(event) => set("longitude", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="URL hotspot (QR)">
            <input
              value={form.hotspotUrl}
              onChange={(event) => set("hotspotUrl", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="URL info isolir">
            <input
              value={form.isolirUrl}
              onChange={(event) => set("isolirUrl", event.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Deskripsi">
              <input
                value={form.description}
                onChange={(event) => set("description", event.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-700">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.useSsl}
              onChange={(event) => {
                set("useSsl", event.target.checked);
                if (event.target.checked && form.apiPort === "8728") set("apiPort", "8729");
                if (!event.target.checked && form.apiPort === "8729") set("apiPort", "8728");
              }}
            />
            API-SSL
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(event) => set("enabled", event.target.checked)}
            />
            Aktif
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.enablePpp}
              onChange={(event) => set("enablePpp", event.target.checked)}
            />
            Layanan PPP
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.enableHotspot}
              onChange={(event) => set("enableHotspot", event.target.checked)}
            />
            Layanan hotspot
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button disabled={busy !== null} onClick={() => void testConnection()}>
            {busy === "test" ? "Menguji…" : "Tes koneksi"}
          </Button>
          <Button variant="secondary" disabled={busy !== null} onClick={() => void save()}>
            {busy === "save" ? "Menyimpan…" : "Simpan ke database"}
          </Button>
        </div>

        {test ? (
          <div
            className={`mt-4 rounded-md px-3 py-2 text-sm ${
              test.ok ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-800"
            }`}
          >
            <p className="font-medium">{test.ok ? "Koneksi berhasil" : "Koneksi gagal"}</p>
            <p className="mt-1">{test.message}</p>
            {test.ok ? (
              <p className="mt-1 text-xs">
                {[test.identity, test.board, test.version, test.uptime].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
