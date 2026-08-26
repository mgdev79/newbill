import { prisma } from "@/lib/db";
import { getBillingTenant } from "@/lib/saas";

export {
  formatLongDate,
  formatRp,
  makeInvoiceNumber,
  makeMemberId,
  splitInclusiveTax,
} from "@/lib/money";

export async function getCompanyProfile() {
  const [tenant, nameSet, addrSet, phoneSet] = await Promise.all([
    getBillingTenant(),
    prisma.appSetting.findUnique({ where: { key: "company_name" } }),
    prisma.appSetting.findUnique({ where: { key: "company_address" } }),
    prisma.appSetting.findUnique({ where: { key: "company_phone" } }),
  ]);

  return {
    name: nameSet?.value || tenant?.name || "Newbill ISP",
    address:
      addrSet?.value ||
      tenant?.notes ||
      "Alamat perusahaan belum diatur",
    phone: phoneSet?.value || tenant?.phone || "",
  };
}
