import { NextResponse, type NextRequest } from "next/server";
import {
  OPERATOR_COOKIE,
  SAAS_COOKIE,
  TENANT_COOKIE,
  hasOperatorCookie,
  hasSaasAdminCookie,
  hasTenantCookie,
  jobTokenAuthorized,
} from "@/lib/auth-cookies";
import {
  TENANT_ROOT_DOMAIN,
  TENANT_SUBDOMAIN_HEADER,
  isPlatformHost,
  parseTenantSubdomainFromHost,
  platformPublicOrigin,
} from "@/lib/tenant-host";

function isApiPath(pathname: string) {
  return pathname.startsWith("/api/");
}

function deny(request: NextRequest, loginPath: string) {
  if (isApiPath(request.nextUrl.pathname)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = loginPath;
  url.search = "";
  return NextResponse.redirect(url);
}

function isPublicPath(pathname: string) {
  if (pathname === "/gate" || pathname.startsWith("/gate/")) return true;
  if (pathname === "/e-voucher" || pathname.startsWith("/e-voucher/")) return true;
  if (pathname === "/login") return true;
  if (pathname === "/signup" || pathname.startsWith("/signup/")) return true;
  if (pathname === "/saas/login") return true;
  if (pathname === "/client/login") return true;
  if (pathname === "/tenant-required") return true;
  if (pathname === "/api/v1/login") return true;
  if (pathname === "/api/v1/signup" || pathname.startsWith("/api/v1/signup/")) return true;
  if (pathname === "/api/v1/saas/login") return true;
  if (pathname === "/api/v1/client/login") return true;
  if (pathname.startsWith("/api/v1/member/")) return true;
  if (pathname.startsWith("/billing/")) return true;
  if (pathname.startsWith("/platform/billing/")) return true;
  if (/^\/api\/v1\/payments\/[^/]+\/callback\/?$/.test(pathname)) return true;
  if (/^\/api\/v1\/platform\/payments\/[^/]+\/callback\/?$/.test(pathname)) return true;
  return false;
}

function isPlatformOnlyPath(pathname: string) {
  if (pathname === "/saas" || pathname.startsWith("/saas/")) return true;
  if (pathname === "/client" || pathname.startsWith("/client/")) return true;
  if (pathname === "/signup" || pathname.startsWith("/signup/")) return true;
  if (pathname.startsWith("/api/v1/saas/")) return true;
  if (pathname.startsWith("/api/v1/client/")) return true;
  if (pathname.startsWith("/api/v1/signup")) return true;
  if (pathname.startsWith("/api/v1/platform/")) return true;
  if (pathname.startsWith("/platform/billing/")) return true;
  return false;
}

function isOperatorPath(pathname: string) {
  if (isPlatformOnlyPath(pathname) || isPublicPath(pathname)) return false;
  return true;
}

function nextWithTenant(request: NextRequest, tenantSub: string | null) {
  if (!tenantSub) return NextResponse.next();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(TENANT_SUBDOMAIN_HEADER, tenantSub);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

function redirectToPlatform(request: NextRequest, pathname: string) {
  const url = new URL(pathname + request.nextUrl.search, platformPublicOrigin());
  return NextResponse.redirect(url);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host");
  const tenantSub = parseTenantSubdomainFromHost(host);
  const onPlatformHost = isPlatformHost(host);

  if (tenantSub && isPlatformOnlyPath(pathname)) {
    return redirectToPlatform(request, pathname);
  }

  if (onPlatformHost && isOperatorPath(pathname) && !isPublicPath(pathname)) {
    if (isApiPath(pathname)) {
      return NextResponse.json(
        {
          error: `Panel operator membutuhkan subdomain tenant (mis. tenant-a.${TENANT_ROOT_DOMAIN}).`,
        },
        { status: 400 },
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = "/tenant-required";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (isPublicPath(pathname)) {
    return nextWithTenant(request, tenantSub);
  }

  const saasOk = hasSaasAdminCookie(request.cookies.get(SAAS_COOKIE)?.value);
  const tenantOk = hasTenantCookie(request.cookies.get(TENANT_COOKIE)?.value);
  const operatorOk = hasOperatorCookie(request.cookies.get(OPERATOR_COOKIE)?.value);

  if (pathname === "/saas" || pathname.startsWith("/saas/")) {
    if (!saasOk) return deny(request, "/saas/login");
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/v1/saas/")) {
    if (!saasOk) return deny(request, "/saas/login");
    return NextResponse.next();
  }

  if (pathname === "/client" || pathname.startsWith("/client/")) {
    if (!tenantOk) return deny(request, "/client/login");
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/v1/client/")) {
    if (!tenantOk) return deny(request, "/client/login");
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/v1/license")) {
    if (saasOk || operatorOk) return nextWithTenant(request, tenantSub);
    return deny(request, "/login");
  }

  if (pathname.startsWith("/api/v1/jobs/")) {
    if (operatorOk || jobTokenAuthorized(request)) return nextWithTenant(request, tenantSub);
    return deny(request, "/login");
  }

  if (!operatorOk) {
    return deny(request, "/login");
  }

  return nextWithTenant(request, tenantSub);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
