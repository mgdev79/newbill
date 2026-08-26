import type {
  Bandwidth,
  Customer,
  Invoice,
  LogRow,
  Nas,
  Odp,
  Plan,
  ProfileGroup,
  SessionRow,
  Staff,
  Ticket,
  Voucher,
} from "@/lib/types";

export const company = {
  name: "Newbill",
  tenant: "Ariyana ID",
  staff: "admin",
};

export const dashboardKpis = {
  incomeToday: 0,
  unpaidCount: 24,
  pppOnline: 2,
  hotspotOnline: 0,
};

export const hostStats = {
  uptime: "867 hari 8 jam",
  ramTotalMb: 32668,
  ramFreeMb: 5089,
  diskFreeGb: 95.54,
};

export const summaryCounts = {
  hotspotUsers: 2,
  pppoeUsers: 38,
  vpnUsers: 0,
  vouchers: 115,
  vcCreatedToday: 0,
  vcLoginToday: 0,
  expVoucher: 0,
  expCustomer: 0,
};

export const serviceHealth = [
  { name: "Core Radius", status: "ok" as const },
  { name: "MikroTik", status: "ok" as const },
  { name: "Session", status: "ok" as const },
  { name: "Pelanggan", status: "ok" as const },
  { name: "Voucher", status: "idle" as const },
  { name: "Jatuh tempo", status: "warn" as const, detail: "24 invoice terbuka" },
];

export const nasList: Nas[] = [
  {
    id: "nas-1",
    name: "CORE-PPPOE",
    ip: "10.10.10.1",
    apiPort: 8728,
    timezone: "Asia/Jakarta",
    healthy: true,
    description: "Router utama PPPoE",
  },
  {
    id: "nas-2",
    name: "HOTSPOT-CABANG",
    ip: "10.10.20.1",
    apiPort: 8728,
    timezone: "Asia/Jakarta",
    healthy: false,
    description: "Hotspot cafe cabang",
  },
];

export const bandwidths: Bandwidth[] = [
  { id: "bw-1", name: "10M", minUp: "2M", maxUp: "10M", minDown: "2M", maxDown: "10M", owner: "admin" },
  { id: "bw-2", name: "20M", minUp: "5M", maxUp: "20M", minDown: "5M", maxDown: "20M", owner: "admin" },
  { id: "bw-3", name: "50M", minUp: "10M", maxUp: "50M", minDown: "10M", maxDown: "50M", owner: "admin" },
];

export const profileGroups: ProfileGroup[] = [
  { id: "g-1", name: "PPPOE-HOME", type: "ppp", nas: "CORE-PPPOE", pool: "10.20.0.10-10.20.0.250", owner: "admin" },
  { id: "g-2", name: "PPPOE-BIZ", type: "ppp", nas: "CORE-PPPOE", pool: "10.30.0.10-10.30.0.80", owner: "admin" },
  { id: "g-3", name: "HS-GUEST", type: "hotspot", nas: "HOTSPOT-CABANG", pool: "192.168.50.10-192.168.50.200", owner: "admin" },
];

export const plans: Plan[] = [
  { id: "plan-1", name: "Rumah 10Mbps", type: "ppp", priceBase: 140000, priceSell: 150000, vatPct: 0, validity: "30 hari", bandwidth: "10M", group: "PPPOE-HOME", sharedUsers: 1 },
  { id: "plan-2", name: "Rumah 20Mbps", type: "ppp", priceBase: 185000, priceSell: 200000, vatPct: 0, validity: "30 hari", bandwidth: "20M", group: "PPPOE-HOME", sharedUsers: 1 },
  { id: "plan-3", name: "Usaha 50Mbps", type: "ppp", priceBase: 320000, priceSell: 350000, vatPct: 11, validity: "30 hari", bandwidth: "50M", group: "PPPOE-BIZ", sharedUsers: 1 },
  { id: "plan-4", name: "Hotspot 1 Hari", type: "hotspot", priceBase: 5000, priceSell: 5000, vatPct: 0, validity: "1 hari", bandwidth: "10M", group: "HS-GUEST", sharedUsers: 1 },
  { id: "plan-5", name: "Hotspot 7 Hari", type: "hotspot", priceBase: 25000, priceSell: 25000, vatPct: 0, validity: "7 hari", bandwidth: "10M", group: "HS-GUEST", sharedUsers: 1 },
];

export const customers: Customer[] = [
  {
    id: "c-1", customerCode: "8829103341", name: "Budi Santoso", username: "budi.s",
    phone: "081234000111", email: "budi@example.com", address: "Jl. Melati 12",
    serviceType: "pppoe", plan: "Rumah 20Mbps", ip: "10.20.0.14", dueAt: "2026-09-05",
    owner: "admin", status: "active", payMode: "prepaid", renewedAt: "2026-08-05",
    nas: "CORE-PPPOE", odp: "ODP-A1", bindOnLogin: true, mac: "4C:5E:0C:11:22:33", kind: "ppp",
  },
  {
    id: "c-2", customerCode: "8829103342", name: "Siti Aminah", username: "siti.a",
    phone: "081234000222", email: "siti@example.com", address: "Jl. Mawar 4",
    serviceType: "pppoe", plan: "Rumah 10Mbps", ip: "10.20.0.22", dueAt: "2026-08-28",
    owner: "admin", status: "isolated", payMode: "prepaid", renewedAt: "2026-07-28",
    nas: "CORE-PPPOE", odp: "ODP-A2", bindOnLogin: false, mac: "—", kind: "ppp",
  },
  {
    id: "c-3", customerCode: "8829103343", name: "Agus Wijaya", username: "agus.w",
    phone: "081234000333", email: "agus@example.com", address: "Jl. Kenanga 9",
    serviceType: "pppoe", plan: "Usaha 50Mbps", ip: "10.20.0.8", dueAt: "2026-09-12",
    owner: "admin", status: "active", payMode: "postpaid", renewedAt: "2026-08-12",
    nas: "CORE-PPPOE", odp: "ODP-B1", bindOnLogin: true, mac: "A4:CF:12:44:55:66", kind: "ppp",
  },
  {
    id: "c-4", customerCode: "8829103344", name: "Dewi Lestari", username: "dewi.l",
    phone: "081234000444", email: "dewi@example.com", address: "Jl. Anggrek 2",
    serviceType: "pppoe", plan: "Rumah 10Mbps", ip: "10.20.0.41", dueAt: "2026-08-20",
    owner: "reseller-1", status: "disabled", payMode: "prepaid", renewedAt: null,
    nas: "CORE-PPPOE", odp: "ODP-A1", bindOnLogin: false, mac: "—", kind: "ppp",
  },
  {
    id: "c-5", customerCode: "8829103345", name: "Rudi Hartono", username: "rudi.h",
    phone: "081234000555", email: "rudi@example.com", address: "Jl. Dahlia 7",
    serviceType: "pppoe", plan: "Rumah 20Mbps", ip: "10.20.0.55", dueAt: "2026-09-01",
    owner: "admin", status: "pending", payMode: "prepaid", renewedAt: null,
    nas: "CORE-PPPOE", odp: "ODP-C1", bindOnLogin: false, mac: "—", kind: "ppp",
  },
  {
    id: "c-6", customerCode: "HS-10021", name: "Cafe Tamu 1", username: "cafe1",
    phone: "081200000001", email: "cafe@example.com", address: "Hotspot cabang",
    serviceType: "hotspot", plan: "Hotspot 7 Hari", ip: "192.168.50.21", dueAt: "2026-09-02",
    owner: "admin", status: "active", payMode: "prepaid", renewedAt: "2026-08-26",
    nas: "HOTSPOT-CABANG", odp: "—", bindOnLogin: true, mac: "B8:27:EB:00:11:22", kind: "hotspot",
  },
  {
    id: "c-7", customerCode: "HS-10022", name: "Cafe Tamu 2", username: "cafe2",
    phone: "081200000002", email: "cafe2@example.com", address: "Hotspot cabang",
    serviceType: "hotspot", plan: "Hotspot 1 Hari", ip: "192.168.50.22", dueAt: "2026-08-27",
    owner: "admin", status: "isolated", payMode: "prepaid", renewedAt: null,
    nas: "HOTSPOT-CABANG", odp: "—", bindOnLogin: false, mac: "—", kind: "hotspot",
  },
];

export const invoices: Invoice[] = [
  { id: "inv-1", number: "INV-2026-0812", customerCode: "8829103342", name: "Siti Aminah", serviceType: "PPPoE", plan: "Rumah 10Mbps", amount: 150000, dueAt: "2026-08-28", owner: "admin", status: "unpaid", method: "transfer" },
  { id: "inv-2", number: "INV-2026-0818", customerCode: "8829103344", name: "Dewi Lestari", serviceType: "PPPoE", plan: "Rumah 10Mbps", amount: 150000, dueAt: "2026-08-20", owner: "reseller-1", status: "unpaid", method: "cash" },
  { id: "inv-3", number: "INV-2026-0805", customerCode: "8829103341", name: "Budi Santoso", serviceType: "PPPoE", plan: "Rumah 20Mbps", amount: 200000, dueAt: "2026-09-05", owner: "admin", status: "paid", method: "duitku" },
  { id: "inv-4", number: "INV-2026-0820", customerCode: "HS-10022", name: "Cafe Tamu 2", serviceType: "Hotspot", plan: "Hotspot 1 Hari", amount: 5000, dueAt: "2026-08-27", owner: "admin", status: "unpaid", method: "cash" },
];

export const sessions: SessionRow[] = [
  { id: "s-1", username: "budi.s", name: "Budi Santoso", nas: "CORE-PPPOE", ip: "10.20.0.14", mac: "4C:5E:0C:11:22:33", uptime: "4j 12m", rx: "1.2 GB", tx: "380 MB", kind: "ppp" },
  { id: "s-2", username: "agus.w", name: "Agus Wijaya", nas: "CORE-PPPOE", ip: "10.20.0.8", mac: "A4:CF:12:44:55:66", uptime: "1j 03m", rx: "420 MB", tx: "88 MB", kind: "ppp" },
];

export const vouchers: Voucher[] = [
  { id: "v-1", code: "ARIY-8K2P", plan: "Hotspot 1 Hari", owner: "admin", createdAt: "2026-08-20", expiresAt: "2026-09-20", used: false, enabled: true, kind: "hotspot" },
  { id: "v-2", code: "ARIY-9L3Q", plan: "Hotspot 1 Hari", owner: "reseller-1", createdAt: "2026-08-21", expiresAt: "2026-09-21", used: true, enabled: true, kind: "hotspot" },
  { id: "v-3", code: "PPP-44XA", plan: "Rumah 10Mbps", owner: "admin", createdAt: "2026-08-10", expiresAt: "2026-09-10", used: false, enabled: false, kind: "ppp" },
];

export const odpList: Odp[] = [
  { id: "odp-1", name: "ODP-A1", area: "Blok Melati", lat: -6.2, lng: 106.8, capacity: 16, used: 9 },
  { id: "odp-2", name: "ODP-A2", area: "Blok Mawar", lat: -6.205, lng: 106.81, capacity: 8, used: 8 },
  { id: "odp-3", name: "ODP-B1", area: "Blok Kenanga", lat: -6.21, lng: 106.82, capacity: 16, used: 4 },
];

export const tickets: Ticket[] = [
  { id: "t-1", subject: "Internet putus sejak pagi", customer: "Siti Aminah", status: "open", createdAt: "2026-08-26" },
  { id: "t-2", subject: "Minta naik paket 20M", customer: "Budi Santoso", status: "open", createdAt: "2026-08-25" },
  { id: "t-3", subject: "Ganti password PPPoE", customer: "Agus Wijaya", status: "closed", createdAt: "2026-08-18" },
];

export const staffList: Staff[] = [
  { id: "u-1", username: "admin", role: "admin", topup: false, balance: 0 },
  { id: "u-2", username: "manager1", role: "manager", topup: false, balance: 0 },
  { id: "u-3", username: "reseller-1", role: "operator", topup: true, balance: 450000 },
];

export const payouts = [
  { id: "p-1", at: "2026-08-12", category: "operasional", note: "Listrik POP", amount: 850000 },
  { id: "p-2", at: "2026-08-20", category: "lainnya", note: "Kabel drop", amount: 210000 },
];

export const topups = [
  { id: "tp-1", at: "2026-08-08", reseller: "reseller-1", amount: 500000, status: "paid" },
  { id: "tp-2", at: "2026-08-22", reseller: "reseller-1", amount: 250000, status: "pending" },
];

export const duitkuTrx = [
  { id: "dk-1", ref: "DK-8821", customer: "Budi Santoso", amount: 200000, channel: "QRIS", status: "paid", at: "2026-08-05" },
  { id: "dk-2", ref: "DK-8830", customer: "Siti Aminah", amount: 150000, channel: "VA BCA", status: "pending", at: "2026-08-26" },
];

export const neighbors = [
  { id: "n-1", identity: "AP-RT01", address: "10.10.10.12", mac: "4C:5E:0C:AA:BB:01", board: "hAP ac2" },
  { id: "n-2", identity: "AP-RT02", address: "10.10.10.18", mac: "4C:5E:0C:AA:BB:02", board: "hAP lite" },
];

export const calledStations = [
  { id: "cs-1", type: "ppp", nas: "CORE-PPPOE", name: "pppoe-out1" },
  { id: "cs-2", type: "hotspot", nas: "HOTSPOT-CABANG", name: "hotspot1" },
];

export const hotspotDomains = [
  { id: "hd-1", domain: "wifi.ariyana.id" },
  { id: "hd-2", domain: "login.hotspot.local" },
];

export const voucherTemplates = [
  { id: "vt-1", name: "thermal-58", kind: "hotspot" },
  { id: "vt-2", name: "a4-grid", kind: "hotspot" },
];

export const logsLogin: LogRow[] = [
  { id: "l-1", at: "2026-08-26 08:01", actor: "admin", message: "Login berhasil dari 103.x.x.x" },
  { id: "l-2", at: "2026-08-25 21:14", actor: "reseller-1", message: "Login berhasil" },
];

export const logsActivity: LogRow[] = [
  { id: "a-1", at: "2026-08-26 09:12", actor: "admin", message: "Perpanjang langganan Budi Santoso" },
  { id: "a-2", at: "2026-08-25 16:40", actor: "reseller-1", message: "Generate 20 voucher Hotspot 1 Hari" },
];

export const logsRadius: LogRow[] = [
  { id: "r-1", at: "2026-08-26 12:02", actor: "budi.s", message: "Access-Accept CORE-PPPOE" },
  { id: "r-2", at: "2026-08-26 11:58", actor: "siti.a", message: "Access-Reject isolir profile" },
];

export const logsWhatsapp: LogRow[] = [
  { id: "w-1", at: "2026-08-26 07:00", actor: "system", message: "Reminder jatuh tempo Siti Aminah" },
];

export const logsBg: LogRow[] = [
  { id: "b-1", at: "2026-08-26 06:00", actor: "job", message: "due-isolir: 1 pelanggan dipindah isolir" },
];

export const monthlyProfit = [
  { month: "Jan", income: 6200000, payout: 2100000 },
  { month: "Feb", income: 6400000, payout: 1800000 },
  { month: "Mar", income: 7100000, payout: 2400000 },
  { month: "Apr", income: 6900000, payout: 1900000 },
  { month: "Mei", income: 7300000, payout: 2200000 },
  { month: "Jun", income: 7500000, payout: 2000000 },
  { month: "Jul", income: 7800000, payout: 2600000 },
  { month: "Agu", income: 4200000, payout: 1060000 },
];

export const customerPageSummary = {
  registeredThisMonth: 4,
  renewedThisMonth: 11,
  isolated: 1,
  disabled: 1,
};

export function getCustomer(id: string) {
  return customers.find((row) => row.id === id);
}

export function pppCustomers() {
  return customers.filter((row) => row.kind === "ppp");
}

export function hotspotCustomers() {
  return customers.filter((row) => row.kind === "hotspot");
}
