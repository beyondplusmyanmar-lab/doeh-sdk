import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { DoehApiError, ScopeDeniedError } from "@beyondplusmm/doehpos-sdk";
import { useCreateTicket, useTicket } from "@/hooks/useKitchen";
import { Body, Button, Card, Field, Muted, Pill, Screen, Title, colors } from "@/components/ui";

function errorText(e: Error): string {
  if (e instanceof ScopeDeniedError) {
    return "This key's scope does not include kitchen. Mint a key with the kitchen module enabled.";
  }
  if (e instanceof DoehApiError) return `${e.code}: ${e.message}`;
  return e.message;
}

export default function Kitchen() {
  const create = useCreateTicket();
  const [station, setStation] = useState("grill");
  const [items, setItems] = useState("Tea Leaf Salad, Mohinga");

  const parsedItems = items
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const valid = station.trim().length > 0 && parsedItems.length > 0;

  const createdId = create.data?.ticket.id;
  const readBack = useTicket(createdId);

  const onCreate = () => {
    if (!valid) return;
    create.reset();
    create.mutate({ station: station.trim(), items: parsedItems });
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }}>
      <Screen>
        <Card>
          <Title>New kitchen ticket</Title>
          <Field label="Station" value={station} onChangeText={setStation} placeholder="grill" />
          <Field
            label="Items (comma-separated)"
            value={items}
            onChangeText={setItems}
            placeholder="Tea Leaf Salad, Mohinga"
          />
          <Muted>{parsedItems.length} item(s): {parsedItems.join(" · ") || "—"}</Muted>
          <Button
            title="Create ticket"
            onPress={onCreate}
            loading={create.isPending}
            disabled={!valid}
          />
        </Card>

        {create.data ? (
          <Card>
            <Body color={colors.good}>
              Created{" "}
              <Pill
                text={create.data.idempotent ? "idempotent replay" : "new"}
                tone="good"
              />
            </Body>
            <Body>{create.data.ticket.id}</Body>
          </Card>
        ) : null}

        {create.error ? (
          <Card>
            <Body color={colors.bad}>{errorText(create.error)}</Body>
          </Card>
        ) : null}

        {createdId ? (
          <Card>
            <Title>Read back</Title>
            {readBack.isLoading ? (
              <Body>Loading…</Body>
            ) : readBack.error ? (
              <>
                <Body color={colors.bad}>{errorText(readBack.error as Error)}</Body>
                <Button title="Retry" onPress={() => readBack.refetch()} variant="ghost" />
              </>
            ) : readBack.data ? (
              <>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Muted>id</Muted>
                  <Body>{readBack.data.ticket.id}</Body>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Muted>station</Muted>
                  <Body>{String(readBack.data.ticket.station ?? station.trim())}</Body>
                </View>
                <Button title="Refresh" onPress={() => readBack.refetch()} variant="ghost" />
              </>
            ) : null}
          </Card>
        ) : null}

        <Card>
          <Muted>
            Exercises <Body>client.kitchen.createTicket</Body> and{" "}
            <Body>client.kitchen.getTicket</Body>. In sandbox these are real
            create + read-back; downstream fulfillment is intentionally absent.
          </Muted>
        </Card>
      </Screen>
    </ScrollView>
  );
}
