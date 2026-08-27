/** Domain publik panel tenant. Subdomain = kode tenant, selalu juraganlapak.com. */
export const TENANT_ROOT_DOMAIN = "juraganlapak.com";

export const TENANT_SUBDOMAIN_HEADER = "x-tenant-subdomain";
export const TENANT_CODE_HEADER = "x-tenant-code";

export function tenantSubdomain(code: string) {
  return code.trim().toLowerCase();
}

/** Ambil subdomain tenant dari Host (Edge-safe, tanpa query DB). */
export function parseTenantSubdomainFromHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0]?.trim().toLowerCase() ?? "";
  if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") {
    return null;
  }

  if (hostname.endsWith(".localhost")) {
    const sub = hostname.slice(0, -".localhost".length);
    if (sub && sub !== "www") return tenantSubdomain(sub);
    return null;
  }

  if (hostname === TENANT_ROOT_DOMAIN || hostname === `www.${TENANT_ROOT_DOMAIN}`) {
    return null;
  }

  const suffix = `.${TENANT_ROOT_DOMAIN}`;
  if (hostname.endsWith(suffix)) {
    const sub = hostname.slice(0, -suffix.length);
    if (sub && sub !== "www") return tenantSubdomain(sub);
  }

  return null;
}

export function isPlatformHost(host: string | null | undefined) {
  return parseTenantSubdomainFromHost(host) === null;
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
