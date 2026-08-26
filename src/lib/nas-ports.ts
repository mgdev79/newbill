/** Alokasi port UDP unik per NAS di FreeRADIUS (auth genap, acct = auth + 1). */
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
