import type { Environment } from "@beyondplusmm/doehpos-sdk";

export const ENVIRONMENTS: Environment[] = ["sandbox", "production"];
export const DEFAULT_ENVIRONMENT: Environment = "sandbox";

/**
 * Optional dev convenience — prefill the Settings screen from an env var so you
 * don't paste the key on every reload. Never commit a real key. EXPO_PUBLIC_*
 * is inlined at build time by Expo.
 */
export const PREFILL_API_KEY = process.env.EXPO_PUBLIC_DOEH_API_KEY ?? "";

export const USER_AGENT = "doeh-expo-reference/0.1.0";
