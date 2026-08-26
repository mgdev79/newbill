export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startIsolirScheduler } = await import("./server/isolir-job");
  const { startNasPingScheduler } = await import("./server/nas-ping-job");
  startIsolirScheduler();
  startNasPingScheduler();
}
