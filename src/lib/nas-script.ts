export type RosVersion = "v6" | "v7";
export type VpnType = "l2tp" | "sstp" | "ovpn" | "pptp";

export type RadiusScriptInput = {
  ros: RosVersion;
  radiusAddress: string;
  radiusSecret: string;
  radiusAuthPort: number;
  radiusAcctPort: number;
  radiusIncomingPort: number;
  enablePpp: boolean;
  enableHotspot: boolean;
};

export type VpnScriptInput = {
  ros: RosVersion;
  type: VpnType;
  serverHost: string;
  username: string;
  password: string;
  innerRadiusIp: string;
  /** IP tunnel klien (komentar IPADDR di Mixradius). */
  clientIp?: string;
};

export const VPN_IFACE = "NEWBILL-VPN";
export const VPN_ROUTE_COMMENT = "static route newbill-vpn";
export const RADIUS_GROUP = "newbill.group";
export const RADIUS_ADDED_COMMENT = "added by newbill";
export const RADIUS_USER_COMMENT = "user for newbill authentication";
export const RADIUS_GROUP_COMMENT = "group for newbill authentication";

function q(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function joinCommands(parts: string[]) {
  return parts
    .filter(Boolean)
    .map((part) => (part.endsWith(";") ? part : `${part};`))
    .join("");
}

export function randomApiUser() {
  return `nbapi${Math.floor(1000 + Math.random() * 9000)}`;
}

export function radiusScriptUser(authPort: number) {
  return `RadiusAuth${authPort}`;
}

export function randomSecret(length = 16) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function extractIpv4(value: string) {
  const match = value.match(/(?:IPADDR\s*:\s*)?(\d{1,3}(?:\.\d{1,3}){3})/i);
  return match?.[1] ?? "";
}

function vpnClientAdd(input: VpnScriptInput) {
  const clientIp = extractIpv4(input.clientIp ?? "");
  const comment = clientIp ? `IPADDR : ${clientIp}` : "newbill";
  const common = `disabled=no connect-to=${q(input.serverHost)} name=${q(VPN_IFACE)} user=${q(input.username)} password=${q(input.password)} comment=${q(comment)}`;
  switch (input.type) {
    case "sstp":
      return `/interface sstp-client add ${common}`;
    case "ovpn":
      return `/interface ovpn-client add ${common}`;
    case "pptp":
      return `/interface pptp-client add ${common}`;
    default:
      return `/interface l2tp-client add ${common}`;
  }
}

function vpnCleanup() {
  return [
    `/interface sstp-client remove [find name=${q(VPN_IFACE)}]`,
    `/interface ovpn-client remove [find name=${q(VPN_IFACE)}]`,
    `/interface l2tp-client remove [find name=${q(VPN_IFACE)}]`,
    `/interface pptp-client remove [find name=${q(VPN_IFACE)}]`,
  ];
}

/**
 * VPN client + static route ke IP RADIUS di sisi tunnel.
 * v7: /routing table fib + /routing rule lookup-only-in-table (pola Mixradius ROS v7).
 * v6: /ip route rule + routing-mark (ekuivalen ROS 6, tanpa /routing table).
 */
export function generateVpnScript(input: VpnScriptInput) {
  const host = input.serverHost.trim();
  if (!host || !input.username) {
    return ':put "Pilih akun VPN, tipe, dan server dulu."';
  }

  const inner = extractIpv4(input.innerRadiusIp) || input.innerRadiusIp.trim();
  const parts = [...vpnCleanup()];

  if (input.ros === "v7") {
    parts.push(
      `/routing table remove [find name=${q(VPN_IFACE)}]`,
      `/routing rule remove [find comment=${q(VPN_ROUTE_COMMENT)}]`,
      `/ip route remove [find comment=${q(VPN_ROUTE_COMMENT)}]`,
    );
  } else {
    parts.push(
      `/ip route rule remove [find comment=${q(VPN_ROUTE_COMMENT)}]`,
      `/ip route remove [find comment=${q(VPN_ROUTE_COMMENT)}]`,
    );
  }

  parts.push(vpnClientAdd(input));

  if (inner) {
    if (input.ros === "v7") {
      parts.push(
        `/routing table add name=${q(VPN_IFACE)} fib`,
        `/routing rule add dst-address=${q(inner)} action=lookup-only-in-table table=${q(VPN_IFACE)} comment=${q(VPN_ROUTE_COMMENT)}`,
        `/ip route add disabled=no gateway=${q(VPN_IFACE)} dst-address=${q(inner)} routing-table=${q(VPN_IFACE)} comment=${q(VPN_ROUTE_COMMENT)}`,
      );
    } else {
      parts.push(
        `/ip route rule add dst-address=${q(inner)} action=lookup-only-in-table table=${q(VPN_IFACE)} comment=${q(VPN_ROUTE_COMMENT)}`,
        `/ip route add disabled=no gateway=${q(VPN_IFACE)} dst-address=${q(inner)} routing-mark=${q(VPN_IFACE)} comment=${q(VPN_ROUTE_COMMENT)}`,
      );
    }
  }

  return joinCommands(parts);
}

/**
 * RADIUS + user API MikroTik. Perintah /radius, /ppp aaa, /ip hotspot profile
 * sama di ROS v6 dan v7 (perbedaan v6/v7 hanya di skrip VPN).
 */
export function generateRadiusScript(input: RadiusScriptInput) {
  const address = input.radiusAddress.trim() || "0.0.0.0";
  const secret = input.radiusSecret;
  const apiUser = radiusScriptUser(input.radiusAuthPort);

  const parts = [
    `/radius remove [find comment=${q(RADIUS_ADDED_COMMENT)}]`,
    `/radius remove [find comment="newbill"]`,
    `/user remove [find comment=${q(RADIUS_USER_COMMENT)}]`,
    `/user remove [find comment="newbill-api"]`,
    `/user group remove [find comment=${q(RADIUS_GROUP_COMMENT)}]`,
    `/user group add name=${q(RADIUS_GROUP)} policy=read,write,api,test,policy,sensitive comment=${q(RADIUS_GROUP_COMMENT)}`,
    `/user add name=${q(apiUser)} group=${q(RADIUS_GROUP)} password=${q(secret)} comment=${q(RADIUS_USER_COMMENT)}`,
    `/radius add authentication-port=${input.radiusAuthPort} accounting-port=${input.radiusAcctPort} timeout=2s comment=${q(RADIUS_ADDED_COMMENT)} service=ppp,hotspot,login address=${address} secret=${q(secret)}`,
    `/ip hotspot profile set use-radius=yes radius-accounting=yes radius-interim-update="00:10:00" nas-port-type="wireless-802.11" [find name!=""]`,
    `/ppp aaa set use-radius=yes accounting=yes interim-update="00:10:00"`,
    `/radius incoming set accept=yes port=${input.radiusIncomingPort}`,
  ];

  return joinCommands(parts);
}

export const vpnTypeLabel: Record<VpnType, string> = {
  l2tp: "L2TP (UDP/1701)",
  sstp: "SSTP (TCP/443)",
  ovpn: "OpenVPN (TCP/1194)",
  pptp: "PPTP (TCP/1723)",
};
