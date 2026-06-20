import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { OrderCreate } from "@beyondplusmm/doehpos-sdk";
import { useOfflineQueue } from "./useOfflineQueue";

/**
 * Every create goes THROUGH the offline queue: enqueue (mints + persists one
 * idempotency key) then flush (sends, reusing that key). This single path makes
 * the online and offline cases identical and the retry safe by construction.
 */
export type CreateOutcome =
  | { status: "created"; orderId: string; idempotent: boolean }
  | { status: "queued"; localId: string; reason: string }
  | { status: "failed"; code: string; message: string };

export function useCreateOrder() {
  const queue = useOfflineQueue();
  const qc = useQueryClient();

  return useMutation<CreateOutcome, Error, OrderCreate>({
    mutationFn: async (payload) => {
      if (!queue) throw new Error("No API key configured — set one in Settings.");
      const mutation = await queue.enqueue(payload);
      const result = await queue.flush();

      const ok = result.succeeded.find((s) => s.mutation.id === mutation.id);
      if (ok) {
        return {
          status: "created",
          orderId: ok.response.order.id,
          idempotent: Boolean(ok.response.idempotent),
        };
      }
      const dead = result.deadLettered.find((d) => d.mutation.id === mutation.id);
      if (dead) {
        return { status: "failed", code: dead.error.code, message: dead.error.message };
      }
      const still = result.remaining.find((r) => r.id === mutation.id);
      return { status: "queued", localId: mutation.id, reason: still?.lastError ?? "offline" };
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["pendingCount"] }),
  });
}
