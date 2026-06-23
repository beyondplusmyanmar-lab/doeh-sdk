import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AccountResponse, PointsInput } from "@beyondplusmm/doehpos-sdk";
import { useDoehClient } from "./useDoehClient";

type PointsVars = { memberId: string; input: PointsInput };

/**
 * Award loyalty points. `earn` auto-provisions the member account server-side,
 * so there is no separate "create member" step. Member ids must match
 * [A-Za-z0-9_]+ (no hyphens) — the SDK validates this client-side. On success
 * the member's balance query is invalidated so the read-back refreshes.
 */
export function useEarnPoints() {
  const client = useDoehClient();
  const qc = useQueryClient();
  return useMutation<AccountResponse, Error, PointsVars>({
    mutationFn: async ({ memberId, input }) => {
      if (!client) throw new Error("No API key configured — set one in Settings.");
      return client.loyalty.earn(memberId, input);
    },
    onSuccess: (_data, { memberId }) => qc.invalidateQueries({ queryKey: ["member", memberId] }),
  });
}

/**
 * Spend loyalty points. Idempotent with a key (a retried redeem never
 * double-spends). Redeeming more than the balance throws `InsufficientPointsError`
 * (409) — the screen surfaces that as "Insufficient points", not a generic error.
 */
export function useRedeemPoints() {
  const client = useDoehClient();
  const qc = useQueryClient();
  return useMutation<AccountResponse, Error, PointsVars>({
    mutationFn: async ({ memberId, input }) => {
      if (!client) throw new Error("No API key configured — set one in Settings.");
      return client.loyalty.redeem(memberId, input);
    },
    onSuccess: (_data, { memberId }) => qc.invalidateQueries({ queryKey: ["member", memberId] }),
  });
}

/** Read a member's balance + recent ledger back by id. */
export function useMember(memberId: string | undefined) {
  const client = useDoehClient();
  return useQuery<AccountResponse>({
    queryKey: ["member", memberId],
    enabled: Boolean(client && memberId),
    queryFn: async () => client!.loyalty.getMember(memberId!),
    retry: false,
  });
}
