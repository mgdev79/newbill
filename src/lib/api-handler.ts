import { NextResponse } from "next/server";
import { MissingTenantContextError, TenantNotFoundError } from "@/lib/tenant-context";

/** Tangkap error konteks tenant di Route Handlers supaya tidak jatuh ke HTTP 500 generic. */
export function withApiErrorHandling<T extends (...args: never[]) => Response | Promise<Response>>(
  handler: T,
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof TenantNotFoundError) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error instanceof MissingTenantContextError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
  }) as T;
}
