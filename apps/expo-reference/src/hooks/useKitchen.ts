import { useMutation, useQuery } from "@tanstack/react-query";
import type { TicketCreate, TicketResponse } from "@beyondplusmm/doehpos-sdk";
import { useDoehClient } from "./useDoehClient";

/**
 * Kitchen ticket create. Unlike delivery, kitchen does not go through the
 * offline queue (that queue is delivery-specific); this is a direct call that
 * demonstrates the `client.kitchen` surface and its typed errors. The SDK still
 * mints a per-call idempotency key, so the button-lock is the dedupe guard.
 */
export function useCreateTicket() {
  const client = useDoehClient();
  return useMutation<TicketResponse, Error, TicketCreate>({
    mutationFn: async (input) => {
      if (!client) throw new Error("No API key configured — set one in Settings.");
      return client.kitchen.createTicket(input);
    },
  });
}

/** Read a kitchen ticket back by id. */
export function useTicket(id: string | undefined) {
  const client = useDoehClient();
  return useQuery<TicketResponse>({
    queryKey: ["ticket", id],
    enabled: Boolean(client && id),
    queryFn: async () => client!.kitchen.getTicket(id!),
    retry: false,
  });
}
