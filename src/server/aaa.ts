import { prisma } from "@/lib/db";

export type RadiusRequest = {
  username: string;
  password?: string;
  nasIp?: string;
  callingStationId?: string;
  calledStationId?: string;
};

export type RadiusReply = {
  "Mikrotik-Rate-Limit"?: string;
  "Framed-IP-Address"?: string;
  "Framed-Pool"?: string;
  "Mikrotik-Group"?: string;
  "Session-Timeout"?: string;
};

export type AuthorizeResult =
  | { accept: true; reply: RadiusReply; username: string; kind: string }
  | { accept: false; reason: string; username: string };

function normalizeMac(value?: string) {
  return (value ?? "").replace(/[^a-fA-F0-9]/g, "").toLowerCase();
}

async function log(username: string, result: string, message: string, nasIp?: string) {
  await prisma.radiusLog.create({
    data: { username, result, message, nasIp: nasIp ?? "" },
  });
}

export async function authorize(input: RadiusRequest): Promise<AuthorizeResult> {
  const username = input.username.trim();
  const customer = await prisma.customer.findUnique({
    where: { username },
    include: { plan: { include: { bandwidth: true, group: true } } },
  });

  if (customer) {
    if (input.password !== undefined && input.password !== customer.password) {
      await log(username, "reject", "Password salah", input.nasIp);
      return { accept: false, reason: "bad password", username };
    }
    if (customer.status === "pending" || customer.status === "disabled") {
      await log(username, "reject", `Status ${customer.status}`, input.nasIp);
      return { accept: false, reason: `status ${customer.status}`, username };
    }

    const isolated =
      customer.status === "isolated" || customer.dueAt.getTime() < Date.now();

    if (customer.bindOnLogin) {
      const mac = normalizeMac(input.callingStationId);
      if (!customer.boundMac && mac) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: { boundMac: mac },
        });
      } else if (customer.boundMac && mac && customer.boundMac !== mac) {
        await log(username, "reject", "MAC tidak cocok", input.nasIp);
        return { accept: false, reason: "mac mismatch", username };
      }
    }

    const online = await prisma.radAcct.count({
      where: { username, stoppedAt: null },
    });
    if (online >= customer.plan.sharedUsers) {
      await log(username, "reject", "Shared users terlampaui", input.nasIp);
      return { accept: false, reason: "simultaneous use", username };
    }

    const bw = customer.plan.bandwidth;
    const reply: RadiusReply = isolated
      ? { "Mikrotik-Rate-Limit": "64k/64k", "Mikrotik-Group": "isolir" }
      : {
          "Mikrotik-Rate-Limit": `${bw.maxUp}/${bw.maxDown}`,
          "Mikrotik-Group": customer.plan.group.name,
          "Framed-Pool": customer.plan.group.pool,
        };
    if (customer.ip) reply["Framed-IP-Address"] = customer.ip;

    await log(username, "accept", isolated ? "Accept isolir" : "Access-Accept", input.nasIp);
    return { accept: true, reply, username, kind: customer.kind };
  }

  const voucher = await prisma.voucher.findUnique({
    where: { code: username },
    include: { plan: { include: { bandwidth: true, group: true } } },
  });

  if (!voucher) {
    await log(username, "reject", "User tidak ditemukan", input.nasIp);
    return { accept: false, reason: "unknown user", username };
  }

  if (input.password !== undefined && input.password !== voucher.password) {
    await log(username, "reject", "Password voucher salah", input.nasIp);
    return { accept: false, reason: "bad password", username };
  }
  if (!voucher.enabled) {
    await log(username, "reject", "Voucher disabled", input.nasIp);
    return { accept: false, reason: "disabled", username };
  }
  if (voucher.expiresAt.getTime() < Date.now()) {
    await log(username, "reject", "Voucher expired", input.nasIp);
    return { accept: false, reason: "expired", username };
  }

  await prisma.voucher.update({ where: { id: voucher.id }, data: { used: true } });
  const bw = voucher.plan.bandwidth;
  await log(username, "accept", "Voucher Accept", input.nasIp);
  return {
    accept: true,
    username,
    kind: voucher.kind,
    reply: {
      "Mikrotik-Rate-Limit": `${bw.maxUp}/${bw.maxDown}`,
      "Mikrotik-Group": voucher.plan.group.name,
      "Framed-Pool": voucher.plan.group.pool,
    },
  };
}

export async function accounting(input: {
  statusType: "Start" | "Interim-Update" | "Stop";
  sessionId: string;
  username: string;
  nasIp?: string;
  framedIp?: string;
  callingStationId?: string;
  inputOctets?: number;
  outputOctets?: number;
  sessionTime?: number;
}) {
  const customer = await prisma.customer.findUnique({
    where: { username: input.username },
  });
  const voucher = customer
    ? null
    : await prisma.voucher.findUnique({ where: { code: input.username } });
  const nas = input.nasIp
    ? await prisma.nas.findFirst({ where: { ip: input.nasIp } })
    : null;

  if (input.statusType === "Start") {
    await prisma.radAcct.upsert({
      where: { sessionId: input.sessionId },
      create: {
        sessionId: input.sessionId,
        username: input.username,
        kind: customer?.kind ?? voucher?.kind ?? "ppp",
        nasIp: input.nasIp ?? "",
        framedIp: input.framedIp ?? "",
        callingStationId: input.callingStationId ?? "",
        nasId: nas?.id,
        customerId: customer?.id,
        voucherId: voucher?.id,
      },
      update: { stoppedAt: null, framedIp: input.framedIp ?? "" },
    });
    return { ok: true };
  }

  await prisma.radAcct.updateMany({
    where: { sessionId: input.sessionId },
    data: {
      framedIp: input.framedIp,
      inputOctets: BigInt(input.inputOctets ?? 0),
      outputOctets: BigInt(input.outputOctets ?? 0),
      sessionTime: input.sessionTime ?? 0,
      ...(input.statusType === "Stop" ? { stoppedAt: new Date() } : {}),
    },
  });
  return { ok: true };
}

export async function disconnectSession(sessionId: string) {
  await prisma.radAcct.updateMany({
    where: { sessionId, stoppedAt: null },
    data: { stoppedAt: new Date() },
  });
}
