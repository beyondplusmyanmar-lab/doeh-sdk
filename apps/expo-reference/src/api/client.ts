import { DoehClient, type Environment } from "@beyondplusmm/doehpos-sdk";
import { USER_AGENT } from "@/config/env";

// React Native provides a global fetch, so no fetch injection is needed.
// Cutover is purely this `environment` value + a sk_live_ key — no code change.
export function makeClient(apiKey: string, environment: Environment): DoehClient {
  return new DoehClient({ apiKey, environment, userAgent: USER_AGENT });
}
