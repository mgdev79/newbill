import { getDb } from "@/lib/db";

export async function writeActivityLog(input: {
  kind: "login" | "activity" | "bg" | "whatsapp";
  actor?: string;
  message: string;
}) {
  const prisma = await getDb();
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
