"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Button, Field, PageHeader, Panel, StatusPill, inputClass } from "@/components/ui";
import { formatIdr } from "@/lib/utils";

type Plan = {
  id: string;
  name: string;
  vpnQuota: number;
  priceMonth: number;
  routerLimit?: number;
  customerLimit?: number;
  voucherLimit?: number;
  sessionLimit?: number;
};
type Server = { id: string; name: string; host: string; online: boolean; region: string };
type Vpn = {
  id: string;
  label: string;
  username: string;
  password: string;
  type: string;
  serverHost: string;
  innerRadiusIp: string;
  online: boolean;
  enabled: boolean;
};

type TenantState = {
  id: string;
  code: string;
  name: string;
  email: string;
  status: string;
  phone: string;
  billingUrl: string;
  radiusPublicIp: string;
  notes: string;
  expiresAt: string | null;
  activatedAt: string | null;
  requestId: string;
  hardwareId: string;
  softwareKey: string;
  sessionLimit: number | null;
  plan: Plan;
  vpnUsed: number;
};

function toDateInput(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function toDateTimeLocal(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function TenantDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [tenant, setTenant] = useState<TenantState | null>(null);
  const [vpnAccounts, setVpnAccounts] = useState<Vpn[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [serverId, setServerId] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [billingBound, setBillingBound] = useState(false);

  async function load() {
    const [detail, planRes, serverRes, settingRes] = await Promise.all([
      fetch(`/api/v1/saas/tenants/${params.id}`).then((r) => r.json()),
      fetch("/api/v1/saas/plans").then((r) => r.json()),
      fetch("/api/v1/saas/vpn-servers").then((r) => r.json()),
      fetch("/api/v1/saas/billing-tenant").then((r) => r.json()).catch(() => ({ code: null })),
    ]);
    if (detail.error) {
      setError(detail.error);
      return;
    }
    setTenant(detail.row);
    setVpnAccounts(detail.vpnAccounts);
    setPlans(planRes.rows);
    setServers(serverRes.rows);
    setBillingBound(settingRes.code === detail.row.code);
    if (!serverId && serverRes.rows[0]) setServerId(serverRes.rows[0].id);
  }

  useEffect(() => {
    void load();
  }, [params.id]);

  async function save() {
    if (!tenant) return;
    setError(null);
    const response = await fetch(`/api/v1/saas/tenants/${tenant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone,
        status: tenant.status,
        billingUrl: tenant.billingUrl,
        radiusPublicIp: tenant.radiusPublicIp,
        notes: tenant.notes,
        planId: tenant.plan.id,
        expiresAt: tenant.expiresAt,
        activatedAt: tenant.activatedAt,
        requestId: tenant.requestId,
        hardwareId: tenant.hardwareId,
        softwareKey: tenant.softwareKey,
        sessionLimit: tenant.sessionLimit,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Gagal simpan");
      return;
    }
    setToast("Tenant & lisensi disimpan.");
    await load();
  }

  async function bindBillingPanel() {
    if (!tenant) return;
    setError(null);
    const response = await fetch("/api/v1/saas/billing-tenant", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: tenant.code }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Gagal set tenant billing.");
      return;
    }
    setToast(`Panel operator sekarang memakai lisensi tenant ${tenant.code}.`);
    setBillingBound(true);
  }

  async function provisionVpn() {
    setError(null);
    const response = await fetch(`/api/v1/saas/tenants/${params.id}/vpn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serverId, type: "l2tp" }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Gagal buat VPN");
      return;
    }
    setToast(
      data.mikrotik?.ok
        ? `VPN dibuat di router: ${data.row.username}`
        : `VPN dibuat: ${data.row.username}`,
    );
    await load();
  }

  async function removeTenant() {
    if (!window.confirm("Hapus tenant dan semua akun VPN-nya?")) return;
    await fetch(`/api/v1/saas/tenants/${params.id}`, { method: "DELETE" });
    router.push("/saas/tenants");
  }

  if (!tenant && !error) return <p className="text-sm text-slate-500">Memuat…</p>;
  if (!tenant) return <p className="text-sm text-rose-700">{error}</p>;

  return (
    <div>
      <PageHeader
        title={tenant.name}
        description={`Kode ${tenant.code} · client area login: ${tenant.email}`}
        actions={
          <Link href="/saas/tenants" className="text-sm text-slate-600 hover:underline">
            Kembali
          </Link>
        }
      />
      {toast ? (
        <p className="mb-3 rounded-sm border border-[#d6e9c6] bg-[#dff0d8] px-3 py-2 text-[13px] text-[#3c763d]">
          {toast}
        </p>
      ) : null}
      {error ? (
        <p className="mb-3 rounded-sm border border-[#ebccd1] bg-[#f2dede] px-3 py-2 text-[13px] text-[#a94442]">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Profil tenant">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Nama">
              <input
                className={inputClass}
                value={tenant.name}
                onChange={(e) => setTenant({ ...tenant, name: e.target.value })}
              />
            </Field>
            <Field label="Email (Email Terdaftar lisensi)">
              <input
                className={inputClass}
                value={tenant.email}
                onChange={(e) => setTenant({ ...tenant, email: e.target.value })}
              />
            </Field>
            <Field label="Telepon">
              <input
                className={inputClass}
                value={tenant.phone}
                onChange={(e) => setTenant({ ...tenant, phone: e.target.value })}
              />
            </Field>
            <Field label="Status">
              <select
                className={inputClass}
                value={tenant.status}
                onChange={(e) => setTenant({ ...tenant, status: e.target.value })}
              >
                <option value="active">active</option>
                <option value="suspended">suspended</option>
                <option value="pending">pending</option>
              </select>
            </Field>
            <Field label="Paket">
              <select
                className={inputClass}
                value={tenant.plan.id}
                onChange={(e) => {
                  const plan = plans.find((p) => p.id === e.target.value);
                  if (plan) setTenant({ ...tenant, plan });
                }}
              >
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} ({formatIdr(plan.priceMonth)})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="IP RADIUS publik">
              <input
                className={inputClass}
                value={tenant.radiusPublicIp}
                onChange={(e) => setTenant({ ...tenant, radiusPublicIp: e.target.value })}
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="URL instance billing">
                <input
                  className={inputClass}
                  value={tenant.billingUrl}
                  onChange={(e) => setTenant({ ...tenant, billingUrl: e.target.value })}
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Catatan">
                <input
                  className={inputClass}
                  value={tenant.notes}
                  onChange={(e) => setTenant({ ...tenant, notes: e.target.value })}
                />
              </Field>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => void save()}>Simpan</Button>
            <Button variant="danger" onClick={() => void removeTenant()}>
              Hapus tenant
            </Button>
          </div>
        </Panel>

        <Panel title="VPN account">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">
              Kuota {tenant.vpnUsed}/{tenant.plan.vpnQuota}
            </p>
            <div className="flex gap-2">
              <select
                className={inputClass}
                value={serverId}
                onChange={(e) => setServerId(e.target.value)}
              >
                {servers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.region} {s.online ? "" : "(offline)"}
                  </option>
                ))}
              </select>
              <Button onClick={() => void provisionVpn()}>+ Provision VPN</Button>
            </div>
          </div>
          <DataTable
            headers={["Label", "User", "Server", "Inner IP", "Tipe", ""]}
            rows={vpnAccounts.map((row) => [
              row.label,
              row.username,
              row.serverHost,
              row.innerRadiusIp || "—",
              row.type.toUpperCase(),
              <StatusPill key={row.id} status={row.enabled && row.online ? "ok" : "warn"} />,
            ])}
          />
          {!vpnAccounts.length ? (
            <p className="mt-3 text-sm text-slate-500">Belum ada akun VPN untuk tenant ini.</p>
          ) : null}
        </Panel>
      </div>

      <Panel className="mt-4" title="Pengaturan Lisensi (panel operator)">
        <p className="mb-3 text-[12px] text-[var(--lte-muted)]">
          Data ini muncul di <strong>SaaS → Info Lisensi</strong> dan di operator{" "}
          <strong>Pengaturan → Info Lisensi</strong>, setara Mixradius /rad-licence/details.
        </p>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {billingBound ? (
            <span className="rounded-sm bg-[#00a65a] px-2 py-0.5 text-[11px] font-semibold text-white">
              Terhubung ke panel billing
            </span>
          ) : (
            <Button variant="secondary" onClick={() => void bindBillingPanel()}>
              Jadikan tenant lisensi panel billing
            </Button>
          )}
          <Link
            href="/saas/license"
            className="text-[12px] text-[var(--lte-blue)] hover:underline"
          >
            Pratinjau Mixradius (SaaS) →
          </Link>
          <Link
            href="/settings/license"
            className="text-[12px] text-[var(--lte-blue)] hover:underline"
            target="_blank"
          >
            Buka Info Lisensi operator →
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Tanggal aktivasi">
            <input
              type="datetime-local"
              className={inputClass}
              value={toDateTimeLocal(tenant.activatedAt)}
              onChange={(e) =>
                setTenant({
                  ...tenant,
                  activatedAt: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : null,
                })
              }
            />
          </Field>
          <Field label="Jatuh tempo">
            <input
              type="date"
              className={inputClass}
              value={toDateInput(tenant.expiresAt)}
              onChange={(e) =>
                setTenant({
                  ...tenant,
                  expiresAt: e.target.value
                    ? new Date(`${e.target.value}T00:00:00`).toISOString()
                    : null,
                })
              }
            />
          </Field>
          <Field label="Request ID">
            <input
              className={inputClass}
              value={tenant.requestId}
              onChange={(e) => setTenant({ ...tenant, requestId: e.target.value })}
              placeholder="NB2 | REQUEST-ID"
            />
          </Field>
          <Field label="Hardware ID">
            <input
              className={inputClass}
              value={tenant.hardwareId}
              onChange={(e) => setTenant({ ...tenant, hardwareId: e.target.value })}
              placeholder="XX-XX-XX-XX-XX-XX"
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Software Key">
              <input
                className={inputClass}
                value={tenant.softwareKey}
                onChange={(e) => setTenant({ ...tenant, softwareKey: e.target.value })}
                placeholder="@NEWBILL | KEY"
              />
            </Field>
          </div>
          <Field label="Session limit (override paket, kosong = ikut paket)">
            <input
              type="number"
              className={inputClass}
              value={tenant.sessionLimit ?? ""}
              onChange={(e) =>
                setTenant({
                  ...tenant,
                  sessionLimit: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              placeholder={String(tenant.plan.sessionLimit ?? 300)}
            />
          </Field>
          <div className="rounded-sm border border-[var(--lte-line)] bg-[#fafafa] px-3 py-2 text-[12px] text-[#555]">
            <p className="font-medium">Kuota dari paket</p>
            <p className="mt-1">
              Router {tenant.plan.routerLimit ?? "—"} · Pelanggan{" "}
              {tenant.plan.customerLimit ?? "—"} · Voucher {tenant.plan.voucherLimit ?? "—"} ·
              Session {tenant.plan.sessionLimit ?? "—"}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={() => void save()}>Simpan lisensi</Button>
        </div>
      </Panel>
    </div>
  );
}
