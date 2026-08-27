import { notFound, redirect } from "next/navigation";
import { platformPrisma } from "@/lib/platform-db";
import { getTenantSubdomainHeader } from "@/lib/tenant-context";
import { AdminShell } from "./admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sub = await getTenantSubdomainHeader();
  if (!sub) {
    redirect("/tenant-required");
  }

  const tenant = await platformPrisma.tenant.findUnique({
    where: { code: sub },
    select: { id: true, status: true },
  });
  if (!tenant) {
    notFound();
  }

  return <AdminShell>{children}</AdminShell>;
}
