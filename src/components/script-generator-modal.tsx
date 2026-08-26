"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/modal";
import { Button, Field, inputClass, textareaClass } from "@/components/ui";
import {
  generateRadiusScript,
  generateVpnScript,
  vpnTypeLabel,
  type RosVersion,
  type VpnType,
} from "@/lib/nas-script";

type VpnRow = {
  id: string;
  label: string;
  username: string;
  password: string;
  serverHost: string;
  type: string;
  innerRadiusIp: string;
  note?: string;
};

type NasListener = {
  id: string;
  name: string;
  ip: string;
  radiusSecret: string;
  radiusAuthPort: number;
  radiusAcctPort: number;
  radiusIncomingPort: number;
  enablePpp: boolean;
  enableHotspot: boolean;
  apiUser: string;
  apiPassword: string;
};

type Creds = {
  apiUser: string;
  apiPassword: string;
  radiusSecret: string;
  radiusAddress: string;
  radiusIncomingPort: number;
  nasListeners: NasListener[];
  vpnAccounts: VpnRow[];
};

export function ScriptGeneratorModal({
  open,
  onClose,
  radiusAddressOverride,
  nasId,
}: {
  open: boolean;
  onClose: () => void;
  radiusAddressOverride?: string;
  nasId?: string;
}) {
  const [tab, setTab] = useState<"vpn" | "radius">("vpn");
  const [ros, setRos] = useState<RosVersion>("v6");
  const [creds, setCreds] = useState<Creds | null>(null);
  const [vpnId, setVpnId] = useState("");
  const [selectedNasId, setSelectedNasId] = useState(nasId ?? "");
  const [vpnType, setVpnType] = useState<VpnType>("l2tp");
  const [copied, setCopied] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newVpn, setNewVpn] = useState({
    label: "",
    username: "",
    password: "",
    serverHost: "",
    type: "l2tp" as VpnType,
    innerRadiusIp: "",
  });

  async function load() {
    const response = await fetch("/api/v1/script-generator");
    const data = (await response.json()) as Creds;
    const listeners = data.nasListeners ?? [];
    setCreds({ ...data, nasListeners: listeners });
    if (!vpnId && data.vpnAccounts[0]) {
      const first = data.vpnAccounts[0];
      setVpnId(first.id);
      setVpnType((first.type as VpnType) || "l2tp");
    }
    const preferred = nasId || selectedNasId || listeners[0]?.id || "";
    if (preferred) setSelectedNasId(preferred);
  }

  useEffect(() => {
    if (open) void load();
  }, [open]);

  const nas = creds?.nasListeners.find((row) => row.id === selectedNasId);
  const account = creds?.vpnAccounts.find((row) => row.id === vpnId);
  const radiusAddress =
    (radiusAddressOverride && radiusAddressOverride.trim()) ||
    creds?.radiusAddress ||
    "";

  const vpnScript = useMemo(() => {
    if (!account) return ":put \"Pilih atau tambah akun VPN dulu.\"";
    return generateVpnScript({
      ros,
      type: vpnType,
      serverHost: account.serverHost,
      username: account.username,
      password: account.password,
      innerRadiusIp: account.innerRadiusIp,
    });
  }, [account, ros, vpnType]);

  const radiusScript = useMemo(() => {
    if (!nas) {
      return ':put "Pilih NAS dulu. Port auth/acct diambil dari MySQL FreeRADIUS."';
    }
    if (!nas.radiusAuthPort || !nas.radiusAcctPort) {
      return `:put "NAS ${nas.name} belum punya port RADIUS. Simpan router saat FREERADIUS_DB_URL terhubung."`;
    }
    return generateRadiusScript({
      ros,
      radiusAddress,
      radiusSecret: nas.radiusSecret || creds?.radiusSecret || "testing123",
      radiusAuthPort: nas.radiusAuthPort,
      radiusAcctPort: nas.radiusAcctPort,
      radiusIncomingPort: nas.radiusIncomingPort || creds?.radiusIncomingPort || 3799,
      apiUser: nas.apiUser || creds?.apiUser || "newbill",
      apiPassword: nas.apiPassword || creds?.apiPassword || "",
      enablePpp: nas.enablePpp,
      enableHotspot: nas.enableHotspot,
    });
  }, [creds, nas, radiusAddress, ros]);

  const script = tab === "vpn" ? vpnScript : radiusScript;

  async function copyScript() {
    await navigator.clipboard.writeText(script);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  async function regenerate() {
    const response = await fetch("/api/v1/script-generator", { method: "POST" });
    const data = (await response.json()) as Pick<Creds, "apiUser" | "apiPassword" | "radiusSecret">;
    setCreds((current) => (current ? { ...current, ...data } : current));
  }

  async function saveVpn() {
    const response = await fetch("/api/v1/vpn-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newVpn),
    });
    if (!response.ok) return;
    const data = (await response.json()) as { row: VpnRow };
    setAdding(false);
    setNewVpn({
      label: "",
      username: "",
      password: "",
      serverHost: "",
      type: "l2tp",
      innerRadiusIp: "",
    });
    await load();
    setVpnId(data.row.id);
    setVpnType((data.row.type as VpnType) || "l2tp");
  }

  return (
    <Modal title="</> Script Generator" open={open} onClose={onClose} size="xl">
      <div className="mb-4 flex gap-2">
        <Button variant={tab === "vpn" ? "primary" : "secondary"} onClick={() => setTab("vpn")}>
          + VPN Script
        </Button>
        <Button
          variant={tab === "radius" ? "primary" : "secondary"}
          onClick={() => setTab("radius")}
        >
          + Radius Script
        </Button>
      </div>

      {tab === "vpn" ? (
        <div className="grid gap-3">
          <Field label="! RouterOS Version">
            <select
              className={inputClass}
              value={ros}
              onChange={(event) => setRos(event.target.value as RosVersion)}
            >
              <option value="v6">MikroTik : ROS v6.x</option>
              <option value="v7">MikroTik : ROS v7.x</option>
            </select>
          </Field>
          <Field label="! VPN Account">
            <select
              className={inputClass}
              value={vpnId}
              onChange={(event) => {
                const id = event.target.value;
                setVpnId(id);
                const row = creds?.vpnAccounts.find((item) => item.id === id);
                if (row) setVpnType((row.type as VpnType) || "l2tp");
              }}
            >
              <option value="">- Select VPN Account -</option>
              {creds?.vpnAccounts.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.label} : {row.username}
                </option>
              ))}
            </select>
          </Field>
          <Field label="! VPN Type">
            <select
              className={inputClass}
              value={vpnType}
              onChange={(event) => setVpnType(event.target.value as VpnType)}
            >
              {(Object.keys(vpnTypeLabel) as VpnType[]).map((key) => (
                <option key={key} value={key}>
                  {vpnTypeLabel[key]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="! VPN Server">
            <input
              className={inputClass}
              readOnly
              value={account ? `${account.serverHost}${account.note ? ` (${account.note})` : ""}` : "- Select VPN Server -"}
            />
          </Field>
          <button
            type="button"
            className="text-left text-xs text-teal-800 hover:underline"
            onClick={() => setAdding((value) => !value)}
          >
            {adding ? "Tutup form akun" : "+ Tambah akun VPN"}
          </button>
          {adding ? (
            <div className="grid gap-2 rounded-md border border-slate-200 p-3 md:grid-cols-2">
              <Field label="Label">
                <input
                  className={inputClass}
                  value={newVpn.label}
                  onChange={(event) => setNewVpn({ ...newVpn, label: event.target.value })}
                />
              </Field>
              <Field label="Username">
                <input
                  className={inputClass}
                  value={newVpn.username}
                  onChange={(event) => setNewVpn({ ...newVpn, username: event.target.value })}
                />
              </Field>
              <Field label="Password">
                <input
                  type="password"
                  className={inputClass}
                  value={newVpn.password}
                  onChange={(event) => setNewVpn({ ...newVpn, password: event.target.value })}
                />
              </Field>
              <Field label="Server">
                <input
                  className={inputClass}
                  value={newVpn.serverHost}
                  onChange={(event) => setNewVpn({ ...newVpn, serverHost: event.target.value })}
                  placeholder="vpn.contoh.net"
                />
              </Field>
              <Field label="Tipe">
                <select
                  className={inputClass}
                  value={newVpn.type}
                  onChange={(event) =>
                    setNewVpn({ ...newVpn, type: event.target.value as VpnType })
                  }
                >
                  {(Object.keys(vpnTypeLabel) as VpnType[]).map((key) => (
                    <option key={key} value={key}>
                      {vpnTypeLabel[key]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="IP inner RADIUS">
                <input
                  className={inputClass}
                  value={newVpn.innerRadiusIp}
                  onChange={(event) =>
                    setNewVpn({ ...newVpn, innerRadiusIp: event.target.value })
                  }
                  placeholder="IP Newbill di sisi VPN"
                />
              </Field>
              <div className="md:col-span-2">
                <Button onClick={() => void saveVpn()}>Simpan akun</Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          <Field label="NAS (port UDP unik dari FreeRADIUS)">
            <select
              className={inputClass}
              value={selectedNasId}
              onChange={(event) => setSelectedNasId(event.target.value)}
            >
              <option value="">- Pilih router -</option>
              {(creds?.nasListeners ?? []).map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name} · {row.ip} · auth {row.radiusAuthPort || "—"} / acct{" "}
                  {row.radiusAcctPort || "—"}
                </option>
              ))}
            </select>
          </Field>
          <p>
            Username API = <strong>{nas?.apiUser ?? creds?.apiUser ?? "…"}</strong>
          </p>
          <p>
            Secret RADIUS = <strong>{nas?.radiusSecret || creds?.radiusSecret || "…"}</strong>
          </p>
          <p className="text-xs text-slate-500">
            Auth {nas?.radiusAuthPort || "—"} · Acct {nas?.radiusAcctPort || "—"} · CoA{" "}
            {nas?.radiusIncomingPort || creds?.radiusIncomingPort || 3799}
          </p>
          <p className="text-xs text-slate-500">
            Address RADIUS di skrip: {radiusAddress || "(isi RADIUS_PUBLIC_IP atau form tambah router)"}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide text-slate-800 uppercase underline">
          Copy paste script berikut di terminal MikroTik
        </p>
        <div className="flex gap-2">
          {tab === "radius" ? (
            <Button variant="secondary" onClick={() => void regenerate()}>
              + Re-generate
            </Button>
          ) : null}
          <Button onClick={() => void copyScript()}>{copied ? "Tersalin" : "Copy script"}</Button>
        </div>
      </div>
      <textarea
        readOnly
        value={script}
        className={`${textareaClass} mt-2 min-h-[160px]`}
        spellCheck={false}
      />
      {tab === "radius" ? (
        <p className="mt-3 text-xs text-slate-600">
          <strong>Penting:</strong> jika NAS menyambung lewat VPN, ganti address RADIUS di MikroTik ke IP
          inner akun VPN, bukan IP publik Newbill.
        </p>
      ) : null}
    </Modal>
  );
}

export function ScriptGeneratorButton({
  radiusAddressOverride,
  nasId,
}: {
  radiusAddressOverride?: string;
  nasId?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>&lt;/&gt; Script Generator</Button>
      <ScriptGeneratorModal
        open={open}
        onClose={() => setOpen(false)}
        radiusAddressOverride={radiusAddressOverride}
        nasId={nasId}
      />
    </>
  );
}
