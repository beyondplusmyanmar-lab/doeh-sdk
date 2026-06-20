import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import type { Environment } from "@beyondplusmm/doehpos-sdk";
import { DEFAULT_ENVIRONMENT, PREFILL_API_KEY } from "@/config/env";

// The API key is the ONLY credential. There is no shop/org concept — the key
// itself determines which shop you act as. It lives in the device secure store
// (Keychain / Keystore), never in plain AsyncStorage.
const K_KEY = "doeh.apiKey";
const K_ENV = "doeh.env";

interface CredentialsState {
  apiKey: string | null;
  environment: Environment;
  loaded: boolean;
  save: (apiKey: string, environment: Environment) => Promise<void>;
  clear: () => Promise<void>;
}

const CredentialsContext = createContext<CredentialsState | null>(null);

export function CredentialsProvider({ children }: { children: React.ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<Environment>(DEFAULT_ENVIRONMENT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const storedKey = await SecureStore.getItemAsync(K_KEY);
      const storedEnv = (await SecureStore.getItemAsync(K_ENV)) as Environment | null;
      setApiKey(storedKey ?? (PREFILL_API_KEY || null));
      if (storedEnv === "sandbox" || storedEnv === "production") setEnvironment(storedEnv);
      setLoaded(true);
    })();
  }, []);

  const save = async (key: string, env: Environment) => {
    await SecureStore.setItemAsync(K_KEY, key);
    await SecureStore.setItemAsync(K_ENV, env);
    setApiKey(key);
    setEnvironment(env);
  };

  const clear = async () => {
    await SecureStore.deleteItemAsync(K_KEY);
    setApiKey(null);
  };

  return (
    <CredentialsContext.Provider value={{ apiKey, environment, loaded, save, clear }}>
      {children}
    </CredentialsContext.Provider>
  );
}

export function useCredentials(): CredentialsState {
  const ctx = useContext(CredentialsContext);
  if (!ctx) throw new Error("useCredentials must be used within a CredentialsProvider");
  return ctx;
}
