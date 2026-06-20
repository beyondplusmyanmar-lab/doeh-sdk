import React from "react";
import { ScrollView } from "react-native";
import { Link, useRouter } from "expo-router";
import { useCredentials } from "@/store/credentials";
import { usePendingCount } from "@/hooks/usePendingCount";
import { Body, Button, Card, Muted, Pill, Screen, Title, colors } from "@/components/ui";

export default function Home() {
  const router = useRouter();
  const { apiKey, environment, loaded } = useCredentials();
  const pending = usePendingCount();
  const configured = Boolean(apiKey);

  return (
    <ScrollView style={{ backgroundColor: colors.bg }}>
      <Screen>
        <Card>
          <Title>Single-shop merchant app</Title>
          <Muted>
            One key, one shop, one sandbox. Scope is derived from the key — there is no shop
            selector anywhere in this app.
          </Muted>
          <Body>
            Environment:{" "}
            <Pill text={environment} tone={environment === "production" ? "warn" : "good"} />
          </Body>
          <Body>
            Key:{" "}
            {configured ? (
              <Pill text={`${apiKey!.slice(0, 11)}…`} tone="good" />
            ) : (
              <Pill text="not set" tone="warn" />
            )}
          </Body>
          {pending.data ? (
            <Body color={colors.warn}>{pending.data} order(s) queued offline — will sync on reconnect.</Body>
          ) : null}
        </Card>

        <Card>
          <Title>Try it</Title>
          {!configured && loaded ? (
            <Body color={colors.warn}>Set your sandbox key in Settings first.</Body>
          ) : null}
          <Button title="Create a delivery order" onPress={() => router.push("/create")} disabled={!configured} />
          <Button
            title="Idempotency demo (double-send)"
            onPress={() => router.push("/idempotency")}
            variant="ghost"
            disabled={!configured}
          />
          <Link href="/settings" asChild>
            <Button title="Settings" onPress={() => router.push("/settings")} variant="ghost" />
          </Link>
        </Card>

        <Card>
          <Muted>
            Sandbox note: create, read-back, and idempotency are fully real. Downstream
            fulfillment is intentionally absent, so an order's status does not transition here.
            Cutover to production is one toggle in Settings + a live key — no code change.
          </Muted>
        </Card>
      </Screen>
    </ScrollView>
  );
}
