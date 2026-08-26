/**
 * Next compiles this file for Node *and* Edge whenever middleware.ts exists.
 * Scheduler code (Prisma, mysql2, ssh2, net) must stay out of the Edge graph:
 * webpack still resolves `import("./x")` at build time even behind NEXT_RUNTIME.
 * next.config.ts stubs `./instrumentation.node` for the Edge compiler.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startBackgroundSchedulers } = await import("./instrumentation.node");
  startBackgroundSchedulers();
}
