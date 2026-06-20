import { useMemo } from "react";
import type { DoehClient } from "@beyondplusmm/doehpos-sdk";
import { useCredentials } from "@/store/credentials";
import { makeClient } from "@/api/client";

/** The configured client, or null when no API key has been set yet. */
export function useDoehClient(): DoehClient | null {
  const { apiKey, environment } = useCredentials();
  return useMemo(
    () => (apiKey ? makeClient(apiKey, environment) : null),
    [apiKey, environment],
  );
}
