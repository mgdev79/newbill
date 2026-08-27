import { getTenantCompanyProfile } from "@/lib/saas";

export {
  formatLongDate,
  formatRp,
  makeInvoiceNumber,
  makeMemberId,
  splitInclusiveTax,
} from "@/lib/money";

export async function getCompanyProfile() {
  return getTenantCompanyProfile();
}
