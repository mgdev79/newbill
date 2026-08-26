export type RosVersion = "v6" | "v7";
export type VpnType = "l2tp" | "sstp" | "ovpn" | "pptp";

export type RadiusScriptInput = {
  ros: RosVersion;
  radiusAddress: string;
  radiusSecret: string;
  radiusAuthPort: number;
  radiusAcctPort: number;
  radiusIncomingPort: number;
  apiUser: string;
  apiPassword: string;
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
};

function q(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

const IFACE = "newbill-vpn";

export function randomApiUser() {
  return `nbapi${Math.floor(1000 + Math.random() * 9000)}`;
}

export function randomSecret(length = 16) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

/** Perintah baku RouterOS: /user, /radius, /ppp aaa, /ip hotspot profile, /radius incoming. */
export function generateRadiusScript(input: RadiusScriptInput) {
  const address = input.radiusAddress.trim() || "0.0.0.0";
  const services = [
    input.enablePpp ? "ppp" : null,
    input.enableHotspot ? "hotspot" : null,
    "login",
  ]
    .filter(Boolean)
    .join(",");

  const hotspot =
    input.enableHotspot
      ? "/ip hotspot profile set [find] use-radius=yes;"
      : "";
  const ppp = input.enablePpp
    ? "/ppp aaa set use-radius=yes accounting=yes interim-update=5m;"
    : "";

  return [
    "/user group;",
    `:do { add name="newbill.api" policy=read,write,api,test,policy,sensitive,winbox } on-error={};`,
    "/user;",
    `:do { remove [find comment="newbill-api"] } on-error={};`,
    `/user add name=${q(input.apiUser)} group="newbill.api" password=${q(input.apiPassword)} comment="newbill-api";`,
    "/radius;",
    `:do { remove [find comment="newbill"] } on-error={};`,
    `/radius add address=${address} secret=${q(input.radiusSecret)} service=${services} timeout=2s authentication-port=${input.radiusAuthPort} accounting-port=${input.radiusAcctPort} comment="newbill";`,
    hotspot,
    ppp,
    `/user aaa set use-radius=yes;`,
    `/radius incoming set accept=yes port=${input.radiusIncomingPort};`,
  ]
    .filter(Boolean)
    .join(" ");
}

function vpnInterfaceAdd(input: VpnScriptInput) {
  const auth = `name=${IFACE} connect-to=${q(input.serverHost)} user=${q(input.username)} password=${q(input.password)} disabled=no comment="newbill"`;
  switch (input.type) {
    case "sstp":
      return `/interface sstp-client add ${auth} authentication=mschap2,mschap1;`;
    case "ovpn":
      return `/interface ovpn-client add ${auth};`;
    case "pptp":
      return `/interface pptp-client add ${auth};`;
    default:
      return `/interface l2tp-client add ${auth} use-ipsec=yes;`;
  }
}

/** Perintah baku RouterOS: interface *-client + /ip route (+ /routing table di v7). */
export function generateVpnScript(input: VpnScriptInput) {
  const host = input.serverHost.trim();
  const inner = input.innerRadiusIp.trim();
  if (!host || !input.username) {
    return ":put \"Pilih akun VPN, tipe, dan server dulu.\"";
  }

  const lines = [
    `/interface sstp-client; :do { remove [find name=${q(IFACE)}] } on-error={};`,
    `/interface ovpn-client; :do { remove [find name=${q(IFACE)}] } on-error={};`,
    `/interface l2tp-client; :do { remove [find name=${q(IFACE)}] } on-error={};`,
    `/interface pptp-client; :do { remove [find name=${q(IFACE)}] } on-error={};`,
    `/ip route; :do { remove [find comment="newbill-vpn"] } on-error={};`,
    `/routing rule; :do { remove [find comment="newbill-vpn"] } on-error={};`,
    vpnInterfaceAdd(input),
  ];

  if (inner && input.ros === "v7") {
    lines.push(
      `/routing table; :do { add fib name=${IFACE} } on-error={};`,
      `/routing rule add dst-address=${inner}/32 action=lookup table=${IFACE} comment="newbill-vpn";`,
      `/ip route add dst-address=${inner}/32 gateway=${IFACE} routing-table=${IFACE} comment="newbill-vpn";`,
    );
  } else if (inner) {
    lines.push(`/ip route add dst-address=${inner} gateway=${IFACE} comment="newbill-vpn";`);
  }

  return lines.join(" ");
}

export const vpnTypeLabel: Record<VpnType, string> = {
  l2tp: "L2TP (UDP/1701)",
  sstp: "SSTP (TCP/443)",
  ovpn: "OpenVPN (TCP/1194)",
  pptp: "PPTP (TCP/1723)",
};
