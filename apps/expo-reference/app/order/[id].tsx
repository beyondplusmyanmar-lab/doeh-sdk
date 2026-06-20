import React from "react";
import { ScrollView, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { OrderNotFoundError } from "@beyondplusmm/doehpos-sdk";
import { useOrder } from "@/hooks/useOrder";
import { Body, Button, Card, Muted, Pill, Screen, Title, colors } from "@/components/ui";

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Muted>{label}</Muted>
      <Body>{String(value)}</Body>
    </View>
  );
}

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useOrder(id);

  return (
    <ScrollView style={{ backgroundColor: colors.bg }}>
      <Screen>
        <Card>
          <Title>Order</Title>
          <Muted>{id}</Muted>
        </Card>

        {q.isLoading ? (
          <Card>
            <Body>Loading…</Body>
          </Card>
        ) : q.error ? (
          <Card>
            <Body color={colors.bad}>
              {q.error instanceof OrderNotFoundError
                ? "Not found (or not visible to this key's scope)."
                : q.error.message}
            </Body>
            <Button title="Retry" onPress={() => q.refetch()} variant="ghost" />
          </Card>
        ) : q.data ? (
          <Card>
            <Row label="id" value={q.data.id} />
            <Row label="status" value={q.data.status} />
            <Row label="amount" value={`${q.data.amount_minor} ${q.data.currency}`} />
            <Row label="shop / branch" value={`${q.data.shop_id} / ${q.data.branch_id}`} />
            <Row label="created (local)" value={q.data.created_at_local} />
            <Muted>
              In sandbox, status stays at its initial value — downstream fulfillment is
              intentionally not wired.
            </Muted>
            <Button title="Refresh" onPress={() => q.refetch()} variant="ghost" />
          </Card>
        ) : null}
      </Screen>
    </ScrollView>
  );
}
