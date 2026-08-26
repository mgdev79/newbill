/** Cookie names shared by login routes and Edge middleware. Do not import Prisma here. */

export const SAAS_COOKIE = "nb_saas_admin";
export const TENANT_COOKIE = "nb_tenant";
export const OPERATOR_COOKIE = "nb_operator";

/** Cookie value for env bootstrap / break-glass operator login. */
export const OPERATOR_ENV_VALUE = "env";

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
  };
}

export function clearCookieOptions() {
  return { ...cookieOptions(), maxAge: 0 };
}

export function hasSaasAdminCookie(value: string | undefined) {
  return value === "1";
}

export function hasTenantCookie(value: string | undefined) {
  return Boolean(value?.trim());
}

export function hasOperatorCookie(value: string | undefined) {
  return Boolean(value?.trim());
}

export function jobTokenAuthorized(request: Request) {
  const token = process.env.FREERADIUS_JOB_TOKEN?.trim();
  if (!token) return false;
  const header = request.headers.get("authorization");
  const query = new URL(request.url).searchParams.get("token");
  return header === `Bearer ${token}` || query === token;
}
