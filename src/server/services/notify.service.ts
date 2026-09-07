import "server-only";

import { isRateLimited } from "@/server/rate-limit";
import { save } from "@/server/repositories/notify.repo";

export type NotifyResult = { ok: true } | { ok: false; reason: "rate-limited" };

export async function notify(email: string, ip: string): Promise<NotifyResult> {
  if (isRateLimited(ip)) {
    return { ok: false, reason: "rate-limited" };
  }

  await save(email);
  return { ok: true };
}
