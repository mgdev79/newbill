import { platformPrisma } from "@/lib/platform-db";
import { runWithTenant } from "@/lib/tenant-context";

export async function forEachActiveTenant<T>(
  fn: (code: string) => Promise<T>,
): Promise<T[]> {
  const tenants = await platformPrisma.tenant.findMany({
    where: { status: "active" },
    select: { code: true },
    orderBy: { code: "asc" },
  });
  const results: T[] = [];
  for (const { code } of tenants) {
    results.push(await runWithTenant(code, () => fn(code)));
  }
  return results;
}
