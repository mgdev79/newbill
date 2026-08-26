import { startIsolirScheduler } from "./server/isolir-job";
import { startNasPingScheduler } from "./server/nas-ping-job";

/** Node.js-only. Jangan di-import dari middleware atau graph Edge. */
export function startBackgroundSchedulers() {
  startIsolirScheduler();
  startNasPingScheduler();
}
