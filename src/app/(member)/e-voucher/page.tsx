import type { Metadata } from "next";
import { MemberEvoucherPortal } from "@/components/member-evoucher-portal";

export const metadata: Metadata = {
  title: "e-Voucher — Newbill",
  description: "Beli dan cek e-Voucher hotspot",
};

export default function Page() {
  return <MemberEvoucherPortal />;
}
