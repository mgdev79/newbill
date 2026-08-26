export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startIsolirScheduler } = await import("./server/isolir-job");
  startIsolirScheduler();
}
