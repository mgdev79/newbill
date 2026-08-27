/** Domain publik panel tenant. Subdomain = kode tenant, selalu juraganlapak.com. */
export const TENANT_ROOT_DOMAIN = "juraganlapak.com";

export function tenantSubdomain(code: string) {
  return code.trim().toLowerCase();
}

export function tenantPublicOrigin(code: string) {
  const sub = tenantSubdomain(code);
  return sub ? `https://${sub}.${TENANT_ROOT_DOMAIN}` : `https://${TENANT_ROOT_DOMAIN}`;
}

/** Path Mixradius-compatible yang dipasang di dashboard provider. */
export function gatewayCheckoutPath(provider: "duitku" | "xendit" | "midtrans" | "nicepay") {
  return `/billing/${provider}-checkout.php`;
}

export function gatewayCallbackUrl(code: string, provider: "duitku" | "xendit" | "midtrans" | "nicepay") {
  return `${tenantPublicOrigin(code)}${gatewayCheckoutPath(provider)}`;
}

/** Origin platform (bukan subdomain tenant). Dipakai callback signup SaaS. */
export function platformPublicOrigin() {
  const fromEnv = (process.env.NEXT_PUBLIC_PLATFORM_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return `https://${TENANT_ROOT_DOMAIN}`;
}

export function platformGatewayCheckoutPath(provider: "duitku" | "xendit" | "midtrans" | "nicepay") {
  return `/platform/billing/${provider}-checkout.php`;
}

export function platformGatewayCallbackUrl(provider: "duitku" | "xendit" | "midtrans" | "nicepay") {
  return `${platformPublicOrigin()}${platformGatewayCheckoutPath(provider)}`;
}

export function platformSignupReturnUrl() {
  return `${platformPublicOrigin()}/signup/thanks`;
}
