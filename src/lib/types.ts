export type StaffRole = "admin" | "manager" | "operator";
export type AccountStatus = "pending" | "active" | "disabled" | "isolated";
export type PayMode = "prepaid" | "postpaid";
export type ServiceType = "pppoe" | "pptp" | "l2tp" | "ovpn" | "hotspot";
export type InvoiceStatus = "unpaid" | "paid" | "void";
export type TicketStatus = "open" | "closed";

export type Nas = {
  id: string;
  name: string;
  ip: string;
  apiPort: number;
  timezone: string;
  healthy: boolean;
  description: string;
};

export type Bandwidth = {
  id: string;
  name: string;
  minUp: string;
  maxUp: string;
  minDown: string;
  maxDown: string;
  owner: string;
};

export type ProfileGroup = {
  id: string;
  name: string;
  type: "ppp" | "hotspot";
  nas: string;
  pool: string;
  owner: string;
};

export type Plan = {
  id: string;
  name: string;
  type: "ppp" | "hotspot";
  priceBase: number;
  priceSell: number;
  vatPct: number;
  validity: string;
  bandwidth: string;
  group: string;
  sharedUsers: number;
};

export type Customer = {
  id: string;
  customerCode: string;
  name: string;
  username: string;
  phone: string;
  email: string;
  address: string;
  serviceType: ServiceType;
  plan: string;
  planId?: string;
  ip: string;
  dueAt: string;
  owner: string;
  status: AccountStatus;
  payMode: PayMode;
  renewedAt: string | null;
  nas: string;
  nasId?: string;
  odp: string;
  bindOnLogin: boolean;
  mac: string;
  kind: "ppp" | "hotspot";
};

export type Invoice = {
  id: string;
  number: string;
  customerCode?: string;
  name?: string;
  serviceType?: string;
  plan?: string;
  planName?: string;
  amount: number;
  subTotal?: number;
  taxAmount?: number;
  deviceFee?: number;
  dueAt: string;
  owner?: string;
  status: InvoiceStatus;
  method: string;
};

export type SessionRow = {
  id: string;
  username: string;
  name: string;
  nas: string;
  ip: string;
  mac: string;
  uptime: string;
  rx: string;
  tx: string;
  kind: "ppp" | "hotspot";
};

export type Voucher = {
  id: string;
  code: string;
  plan: string;
  owner: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
  enabled: boolean;
  kind: "ppp" | "hotspot";
};

export type Odp = {
  id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  capacity: number;
  used: number;
};

export type Ticket = {
  id: string;
  subject: string;
  customer: string;
  status: TicketStatus;
  createdAt: string;
};

export type Staff = {
  id: string;
  username: string;
  role: StaffRole;
  topup: boolean;
  balance: number;
};

export type LogRow = {
  id: string;
  at: string;
  actor: string;
  message: string;
};
