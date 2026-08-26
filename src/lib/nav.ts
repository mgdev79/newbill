import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Building2,
  CreditCard,
  LayoutDashboard,
  MapPin,
  Package,
  Radio,
  Receipt,
  Router,
  ScrollText,
  Server,
  Settings,
  Ticket,
  Users,
  Wallet,
  Wrench,
  Wifi,
} from "lucide-react";

export type NavLeaf = { href: string; label: string };

export type NavGroup = {
  label: string;
  icon: LucideIcon;
  href?: string;
  items?: NavLeaf[];
};

/**
 * Urutan menu mengikuti pola panel Radius Manager (AdminLTE):
 * Sesi → Dashboard → Pengaturan → NAS → ODP → Profil → Pelanggan → …
 */
export const navGroups: NavGroup[] = [
  {
    label: "Sesi user",
    icon: Activity,
    items: [
      { href: "/sessions/hotspot", label: "Hotspot" },
      { href: "/sessions/ppp", label: "PPP" },
    ],
  },
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  {
    label: "Pengaturan",
    icon: Settings,
    items: [
      { href: "/settings", label: "Umum" },
      { href: "/settings/localisation", label: "Lokalisasi" },
      { href: "/settings/users", label: "Manajemen user" },
      { href: "/settings/invoice-logo", label: "Logo invoice" },
      { href: "/settings/whatsapp", label: "WhatsApp API" },
      { href: "/settings/email", label: "Email" },
      { href: "/settings/sms", label: "SMS" },
      { href: "/settings/maps", label: "Google Map" },
      { href: "/settings/gateway", label: "Payment gateway" },
      { href: "/settings/voucher-template", label: "Template voucher" },
      { href: "/settings/hotspot-domain", label: "Domain hotspot" },
      { href: "/settings/called-station", label: "Called station" },
      { href: "/settings/api", label: "API client area" },
      { href: "/settings/license", label: "Info Lisensi" },
    ],
  },
  {
    label: "Router [NAS]",
    icon: Router,
    items: [
      { href: "/nas", label: "Daftar router" },
      { href: "/nas/add", label: "Tambah router" },
    ],
  },
  {
    label: "ODP | POP",
    icon: MapPin,
    items: [
      { href: "/odp", label: "Kelola" },
      { href: "/odp/map", label: "Peta" },
    ],
  },
  {
    label: "Profil paket",
    icon: Radio,
    items: [
      { href: "/plans/bandwidth", label: "Bandwidth" },
      { href: "/plans/groups", label: "Grup profil" },
      { href: "/plans/hotspot", label: "Profil hotspot" },
      { href: "/plans/ppp", label: "Profil PPP" },
    ],
  },
  {
    label: "Pelanggan",
    icon: Users,
    items: [
      { href: "/customers/hotspot", label: "User hotspot" },
      { href: "/customers/ppp", label: "User PPP" },
      { href: "/customers/map", label: "Peta pelanggan" },
    ],
  },
  {
    label: "Kartu Voucher",
    icon: Wifi,
    items: [
      { href: "/vouchers/hotspot", label: "Voucher Hotspot" },
      { href: "/vouchers/ppp", label: "Voucher PPP" },
      { href: "/vouchers/evoucher", label: "Data e-Voucher" },
    ],
  },
  {
    label: "Tagihan",
    icon: Receipt,
    items: [
      { href: "/invoices", label: "Semua tagihan" },
      { href: "/invoices/period", label: "Tagihan periode" },
    ],
  },
  {
    label: "Keuangan",
    icon: Wallet,
    items: [
      { href: "/finance/topup", label: "Topup reseller" },
      { href: "/finance/daily", label: "Income harian" },
      { href: "/finance/period", label: "Income periode" },
      { href: "/finance/payout", label: "Pengeluaran" },
      { href: "/finance/profit", label: "Laba rugi" },
      { href: "/finance/bhp", label: "BHP | USO" },
    ],
  },
  { label: "Pembayaran online", icon: CreditCard, href: "/payments/duitku" },
  {
    label: "Tiket",
    icon: Ticket,
    items: [
      { href: "/tickets", label: "Semua" },
      { href: "/tickets/open", label: "Aktif" },
      { href: "/tickets/closed", label: "Ditutup" },
    ],
  },
  {
    label: "Tool sistem",
    icon: Wrench,
    items: [
      { href: "/tools/usage", label: "Cek pemakaian" },
      { href: "/tools/radius", label: "Tes RADIUS" },
      { href: "/tools/import", label: "Impor user" },
      { href: "/tools/export", label: "Ekspor user" },
      { href: "/tools/backup", label: "Backup / restore" },
    ],
  },
  {
    label: "Log",
    icon: ScrollText,
    items: [
      { href: "/logs/login", label: "Log login" },
      { href: "/logs/activity", label: "Log aktivitas" },
      { href: "/logs/bg", label: "Log background" },
      { href: "/logs/radius", label: "Log RADIUS" },
      { href: "/logs/whatsapp", label: "Log WA blast" },
    ],
  },
  { label: "Neighbor", icon: Radio, href: "/neighbors" },
];

/** Panel admin SaaS (platform) — shell terpisah */
export const saasNavGroups: NavGroup[] = [
  { label: "Ringkasan", icon: LayoutDashboard, href: "/saas" },
  { label: "Tenant", icon: Building2, href: "/saas/tenants" },
  { label: "VPN server", icon: Server, href: "/saas/vpn-servers" },
  { label: "Paket SaaS", icon: Package, href: "/saas/plans" },
];

export function pathMatches(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/saas") return pathname === "/saas";
  if (pathname === href) return true;
  if (href === "/nas") {
    return pathname.startsWith("/nas/") && !pathname.startsWith("/nas/add");
  }
  return pathname.startsWith(`${href}/`);
}
