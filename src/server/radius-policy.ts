export type RadiusReply = {
  "Mikrotik-Rate-Limit"?: string;
  "Mikrotik-Group"?: string;
  "Framed-Pool"?: string;
  "Framed-IP-Address"?: string;
};

export type CustomerPolicyInput = {
  username: string;
  password: string;
  status: string;
  dueAt: Date;
  ip: string;
  kind: string;
  plan: {
    bandwidth: { maxUp: string; maxDown: string };
    group: { name: string; pool: string };
  };
};

export type VoucherPolicyInput = {
  code: string;
  password: string;
  enabled: boolean;
  used: boolean;
  expiresAt: Date;
  kind: string;
  plan: {
    bandwidth: { maxUp: string; maxDown: string };
    group: { name: string; pool: string };
  };
};

export type RadiusPolicy =
  | { allow: false; reason: string; username: string }
  | {
      allow: true;
      username: string;
      password: string;
      kind: string;
      isolated: boolean;
      reply: RadiusReply;
    };

export function customerRadiusPolicy(customer: CustomerPolicyInput): RadiusPolicy {
  const username = customer.username.trim();
  if (customer.status === "pending" || customer.status === "disabled") {
    return { allow: false, reason: `status ${customer.status}`, username };
  }

  const isolated =
    customer.status === "isolated" || customer.dueAt.getTime() < Date.now();

  const bw = customer.plan.bandwidth;
  const reply: RadiusReply = isolated
    ? { "Mikrotik-Rate-Limit": "64k/64k", "Mikrotik-Group": "isolir" }
    : {
        "Mikrotik-Rate-Limit": `${bw.maxUp}/${bw.maxDown}`,
        "Mikrotik-Group": customer.plan.group.name,
        "Framed-Pool": customer.plan.group.pool,
      };
  if (customer.ip) reply["Framed-IP-Address"] = customer.ip;

  return {
    allow: true,
    username,
    password: customer.password,
    kind: customer.kind,
    isolated,
    reply,
  };
}

export function voucherRadiusPolicy(voucher: VoucherPolicyInput): RadiusPolicy {
  const username = voucher.code.trim();
  if (!voucher.enabled) {
    return { allow: false, reason: "disabled", username };
  }
  if (voucher.used) {
    return { allow: false, reason: "used", username };
  }
  if (voucher.expiresAt.getTime() < Date.now()) {
    return { allow: false, reason: "expired", username };
  }

  const bw = voucher.plan.bandwidth;
  return {
    allow: true,
    username,
    password: voucher.password,
    kind: voucher.kind,
    isolated: false,
    reply: {
      "Mikrotik-Rate-Limit": `${bw.maxUp}/${bw.maxDown}`,
      "Mikrotik-Group": voucher.plan.group.name,
      "Framed-Pool": voucher.plan.group.pool,
    },
  };
}

export function replyEntries(reply: RadiusReply) {
  return Object.entries(reply).filter((entry): entry is [string, string] => Boolean(entry[1]));
}
