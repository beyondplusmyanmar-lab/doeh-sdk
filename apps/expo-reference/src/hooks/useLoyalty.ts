import { useMutation, useQuery } from "@tanstack/react-query";
import type { AccountResponse, EarnInput } from "@beyondplusmm/doehpos-sdk";
import { useDoehClient } from "./useDoehClient";

/**
 * Award loyalty points. `earn` auto-provisions the member account server-side,
 * so there is no separate "create member" step. Member ids must match
 * [A-Za-z0-9_]+ (no hyphens) — the SDK validates this client-side.
 */
export function useEarnPoints() {
  const client = useDoehClient();
  return useMutation<AccountResponse, Error, { memberId: string; input: EarnInput }>({
    mutationFn: async ({ memberId, input }) => {
      if (!client) throw new Error("No API key configured — set one in Settings.");
      return client.loyalty.earn(memberId, input);
    },
  });
}

/** Read a member's balance back by id. */
export function useMember(memberId: string | undefined) {
  const client = useDoehClient();
  return useQuery<AccountResponse>({
    queryKey: ["member", memberId],
    enabled: Boolean(client && memberId),
    queryFn: async () => client!.loyalty.getMember(memberId!),
    retry: false,
  });
}
