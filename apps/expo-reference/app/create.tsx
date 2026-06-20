import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import type { Currency } from "@doeh/sdk";
import { useCreateOrder } from "@/hooks/useCreateOrder";
import { Body, Button, Card, Field, Muted, Pill, Screen, Title, colors } from "@/components/ui";

const CURRENCIES: Currency[] = ["MMK", "THB", "USD"];

export default function CreateOrder() {
  const router = useRouter();
  const create = useCreateOrder();
  const [amount, setAmount] = useState("1500");
  const [currency, setCurrency] = useState<Currency>("MMK");

  const amountMinor = Number.parseInt(amount, 10);
  const valid = Number.isInteger(amountMinor) && amountMinor >= 1;
  const outcome = create.data;

  const onCreate = () => {
    if (!valid) return;
    create.reset();
    create.mutate({ currency, amount_minor: amountMinor });
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }}>
      <Screen>
        <Card>
          <Title>New delivery order</Title>
          <Field
            label="Amount (minor units — 1500 = 15.00)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            placeholder="1500"
          />
          <View style={{ gap: 6 }}>
            <Muted>Currency</Muted>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {CURRENCIES.map((c) => (
                <View key={c} style={{ flex: 1 }}>
                  <Button
                    title={c}
                    onPress={() => setCurrency(c)}
                    variant={currency === c ? "primary" : "ghost"}
                  />
                </View>
              ))}
            </View>
          </View>
          {/* Button is disabled while the mutation is in flight: the first line of
              defence against a double-tap. The idempotency key is the second. */}
          <Button
            title="Create order"
            onPress={onCreate}
            loading={create.isPending}
            disabled={!valid}
          />
          <Muted>Press repeatedly — the button locks while sending, and the queue reuses one idempotency key, so you still get exactly one order.</Muted>
        </Card>

        {outcome ? (
          <Card>
            {outcome.status === "created" ? (
              <>
                <Body color={colors.good}>
                  Created {outcome.idempotent ? "(idempotent replay)" : ""}{" "}
                  <Pill text={outcome.idempotent ? "200 replay" : "201 new"} tone="good" />
                </Body>
                <Body>{outcome.orderId}</Body>
                <Button title="View order" onPress={() => router.push(`/order/${outcome.orderId}`)} variant="ghost" />
              </>
            ) : outcome.status === "queued" ? (
              <>
                <Body color={colors.warn}>Queued offline ({outcome.reason}).</Body>
                <Muted>It will sync automatically when connectivity returns. Reconnect to see it land.</Muted>
              </>
            ) : (
              <>
                <Body color={colors.bad}>Failed: {outcome.code}</Body>
                <Muted>{outcome.message}</Muted>
              </>
            )}
          </Card>
        ) : null}

        {create.error ? (
          <Card>
            <Body color={colors.bad}>{create.error.message}</Body>
          </Card>
        ) : null}
      </Screen>
    </ScrollView>
  );
}
