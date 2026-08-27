import { withApiErrorHandling } from "../src/lib/api-handler";
import {
  MissingTenantContextError,
  TenantNotFoundError,
} from "../src/lib/tenant-context";

async function test(name: string, fn: () => Promise<Response>) {
  const res = await fn();
  const body = await res.json();
  console.log(`${name}: ${res.status}`, body);
}

await test(
  "TenantNotFoundError",
  withApiErrorHandling(async () => {
    throw new TenantNotFoundError("notexist");
  }),
);

await test(
  "MissingTenantContextError",
  withApiErrorHandling(async () => {
    throw new MissingTenantContextError();
  }),
);

try {
  await withApiErrorHandling(async () => {
    throw new Error("boom");
  })();
  console.log("Other error: FAIL (should rethrow)");
} catch (error) {
  console.log("Other error: rethrown", (error as Error).message);
}
