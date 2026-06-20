import { useMemo } from "react";
import { OfflineQueue } from "@beyondplusmm/doehpos-sdk";
import { useDoehClient } from "./useDoehClient";
import { queueStorage } from "@/api/queueStorage";

// One queue bound to the current client. The storage (and therefore any pending
// items) is independent of the client, so changing the key/env doesn't drop the
// queue — it just sends the backlog with the new credentials.
export function useOfflineQueue(): OfflineQueue | null {
  const client = useDoehClient();
  return useMemo(
    () => (client ? new OfflineQueue(client.delivery, queueStorage) : null),
    [client],
  );
}
