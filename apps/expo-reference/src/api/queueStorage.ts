import AsyncStorage from "@react-native-async-storage/async-storage";
import type { QueueStorage } from "@beyondplusmm/doehpos-sdk";

// The offline queue persists pending creates (payload + idempotency key) so they
// survive app restarts. The queue is not secret (it holds order amounts, not the
// key), so AsyncStorage is the right home — the key stays in SecureStore.
const STORAGE_KEY = "doeh.offlineQueue.v1";

export const queueStorage: QueueStorage = {
  load: () => AsyncStorage.getItem(STORAGE_KEY),
  save: (serialized) => AsyncStorage.setItem(STORAGE_KEY, serialized),
};
