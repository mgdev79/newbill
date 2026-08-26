import { prisma } from "@/lib/db";

export async function writeActivityLog(input: {
  kind: "login" | "activity" | "bg" | "whatsapp";
  actor?: string;
  message: string;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        kind: input.kind,
        actor: input.actor?.trim() || "system",
        message: input.message.trim(),
      },
    });
  } catch {
    // logging must not break the main flow
  }
}
