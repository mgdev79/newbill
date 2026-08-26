import { CustomerReceipt } from "@/components/customer-receipt";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CustomerReceipt customerId={id} kind="ppp" />;
}
