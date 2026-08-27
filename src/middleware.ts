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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) {
    return NextResponse.next();
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
    if (saasOk || operatorOk) return NextResponse.next();
    return deny(request, "/login");
  }

  if (pathname.startsWith("/api/v1/jobs/")) {
    if (operatorOk || jobTokenAuthorized(request)) return NextResponse.next();
    return deny(request, "/login");
  }

  if (!operatorOk) {
    return deny(request, "/login");
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
