/**
 * Newbill tidak memakai 1812/1813 global. FreeRADIUS listen satu pasangan UDP
 * per NAS: auth genap mulai 7100, accounting = auth + 1 (7100/7101, 7102/7103, …).
 * STEP 2 menjamin acct NAS A tidak bertabrakan dengan auth NAS B.
 *
 * 3799 adalah port CoA/Disconnect di sisi MikroTik (RFC 5176), bukan port auth.
 * Newbill mengirim Disconnect-Request ke NAS:3799 (lihat radius-coa.ts).
 */
export const RADIUS_PORT_BASE = 7100;
export const RADIUS_PORT_STEP = 2;
export const RADIUS_INCOMING_PORT = 3799;

export function nextAuthPort(usedAuthPorts: Iterable<number | null | undefined>): number {
  const used = new Set<number>();
  for (const port of usedAuthPorts) {
    if (typeof port === "number" && Number.isFinite(port) && port > 0) {
      used.add(port);
    }
  }
  for (let port = RADIUS_PORT_BASE; port < 65000; port += RADIUS_PORT_STEP) {
    if (!used.has(port) && !used.has(port + 1)) {
      return port;
    }
  }
  throw new Error("Tidak ada port RADIUS bebas (basis 7100).");
}

export function acctPortFor(authPort: number) {
  return authPort + 1;
}
