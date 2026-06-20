import React, { useState } from "react";
import { ScrollView } from "react-native";
import { generateIdempotencyKey, type OrderResponse } from "@doeh/sdk";
import { useDoehClient } from "@/hooks/useDoehClient";
import { Body, Button, Card, Muted, Pill, Screen, Title, colors } from "@/components/ui";

// Sends the SAME create twice with ONE idempotency key. The first write returns
// 201 (a new order); the replay returns 200 with idempotent=true and the SAME
// order id — never a duplicate. This is the guarantee the offline queue relies on.
export default function IdempotencyDemo() {
  const client = useDoehClient();
  const [busy, setBusy] = useState(false);
  const [first, setFirst] = useState<OrderResponse | null>(null);
  const [second, setSecond] = useState<OrderResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!client) return;
    setBusy(true);
    setError(null);
    setFirst(null);
    setSecond(null);
    try {
      const key = generateIdempotencyKey("expo-demo");
      const payload = { currency: "MMK", amount_minor: 1500 } as const;
      const a = await client.delivery.create(payload, { idempotencyKey: key });
      setFirst(a);
      const b = await client.delivery.create(payload, { idempotencyKey: key });
      setSecond(b);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const sameOrder = first && second && first.order.id === second.order.id;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }}>
      <Screen>
        <Card>
          <Title>Idempotency</Title>
          <Muted>
            Two identical creates, one shared Idempotency-Key. A correct API returns the original
            order on the replay rather than creating a second one.
          </Muted>
          <Button title="Send twice with one key" onPress={run} loading={busy} />
        </Card>

        {first ? (
          <Card>
            <Body>
              First send <Pill text={first.idempotent ? "200 replay" : "201 new"} tone="good" />
            </Body>
            <Muted>{first.order.id}</Muted>
          </Card>
        ) : null}

        {second ? (
          <Card>
            <Body>
              Second send{" "}
              <Pill
                text={second.idempotent ? "200 idempotent=true" : "201 (NOT deduped!)"}
                tone={second.idempotent ? "good" : "warn"}
              />
            </Body>
            <Muted>{second.order.id}</Muted>
            <Body color={sameOrder ? colors.good : colors.bad}>
              {sameOrder ? "Same order id — exactly one order created." : "Different ids — dedupe failed."}
            </Body>
          </Card>
        ) : null}

        {error ? (
          <Card>
            <Body color={colors.bad}>{error}</Body>
          </Card>
        ) : null}
      </Screen>
    </ScrollView>
  );
}
