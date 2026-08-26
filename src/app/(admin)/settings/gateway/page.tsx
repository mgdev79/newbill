import { PaymentGatewayForm } from "@/components/payment-gateway-form";
import { getBillingTenant } from "@/lib/saas";

export default async function Page() {
  const tenant = await getBillingTenant();
  return <PaymentGatewayForm tenantCode={tenant?.code ?? ""} />;
}
