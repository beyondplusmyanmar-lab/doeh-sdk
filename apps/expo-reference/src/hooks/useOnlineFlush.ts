import { useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";
import { useQueryClient } from "@tanstack/react-query";
import { useOfflineQueue } from "./useOfflineQueue";

/**
 * When connectivity returns, drain the offline queue. This is the "reconnect ->
 * sync" half of the airplane-mode demo. The queue reuses each stored idempotency
 * key, so re-sending a create that may have already reached the server is safe.
 */
export function useOnlineFlush() {
  const queue = useOfflineQueue();
  const qc = useQueryClient();

  useEffect(() => {
    if (!queue) return;
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected && state.isInternetReachable !== false;
      if (!online) return;
      queue
        .flush()
        .then((r) => {
          if (r.succeeded.length || r.deadLettered.length) {
            qc.invalidateQueries({ queryKey: ["pendingCount"] });
          }
        })
        .catch(() => {
          /* transport errors are kept in the queue; nothing to do here */
        });
    });
    return () => unsubscribe();
  }, [queue, qc]);
}
