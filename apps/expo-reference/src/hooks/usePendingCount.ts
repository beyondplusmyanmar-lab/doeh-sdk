import { useQuery } from "@tanstack/react-query";
import { useOfflineQueue } from "./useOfflineQueue";

/** Number of creates still waiting in the offline queue (polled lightly). */
export function usePendingCount() {
  const queue = useOfflineQueue();
  return useQuery<number>({
    queryKey: ["pendingCount"],
    enabled: Boolean(queue),
    queryFn: async () => (await queue!.pending()).length,
    refetchInterval: 2000,
    initialData: 0,
  });
}
