import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CredentialsProvider } from "@/store/credentials";
import { useOnlineFlush } from "@/hooks/useOnlineFlush";
import { colors } from "@/components/ui";

const queryClient = new QueryClient({
  defaultOptions: {
    // The SDK owns transport/429 retries; don't double-retry at the query layer.
    queries: { retry: false, staleTime: 5_000 },
    mutations: { retry: false },
  },
});

// Bridges the reconnect-flush effect into the provider tree.
function OnlineFlushBridge() {
  useOnlineFlush();
  return null;
}

const screenOptions = {
  headerStyle: { backgroundColor: colors.bg },
  headerTitleStyle: { color: colors.text },
  headerTintColor: colors.primary,
  contentStyle: { backgroundColor: colors.bg },
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <CredentialsProvider>
          <OnlineFlushBridge />
          <StatusBar style="light" />
          <Stack screenOptions={screenOptions}>
            <Stack.Screen name="index" options={{ title: "Doeh Reference" }} />
            <Stack.Screen name="settings" options={{ title: "Settings" }} />
            <Stack.Screen name="create" options={{ title: "Create order" }} />
            <Stack.Screen name="order/[id]" options={{ title: "Order" }} />
            <Stack.Screen name="idempotency" options={{ title: "Idempotency demo" }} />
            <Stack.Screen name="kitchen" options={{ title: "Kitchen" }} />
            <Stack.Screen name="loyalty" options={{ title: "Loyalty" }} />
          </Stack>
        </CredentialsProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
