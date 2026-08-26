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
