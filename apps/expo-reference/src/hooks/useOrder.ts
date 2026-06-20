import { useQuery } from "@tanstack/react-query";
import {
  DoehTransportError,
  OrderNotFoundError,
  RateLimitedError,
  type Order,
} from "@doeh/sdk";
import { useDoehClient } from "./useDoehClient";

/** Read one order. The SDK already retries transport/429, so React Query's own
 *  retry only needs to cover the gap; we disable it for terminal API errors. */
export function useOrder(id: string | undefined) {
  const client = useDoehClient();
  return useQuery<Order>({
    queryKey: ["order", id],
    enabled: Boolean(client && id),
    queryFn: async () => (await client!.delivery.get(id!)).order,
    retry: (count, err) => {
      if (err instanceof OrderNotFoundError) return false;
      if (err instanceof DoehTransportError || err instanceof RateLimitedError) return count < 2;
      return false;
    },
  });
}
