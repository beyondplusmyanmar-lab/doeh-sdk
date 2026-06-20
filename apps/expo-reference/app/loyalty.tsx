import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { DoehApiError, ScopeDeniedError } from "@beyondplusmm/doehpos-sdk";
import { useEarnPoints, useMember } from "@/hooks/useLoyalty";
import { Body, Button, Card, Field, Muted, Pill, Screen, Title, colors } from "@/components/ui";

const MEMBER_ID = /^[A-Za-z0-9_]+$/;

function errorText(e: Error): string {
  if (e instanceof ScopeDeniedError) {
    return "This key's scope does not include loyalty. Mint a key with the loyalty module enabled.";
  }
  if (e instanceof DoehApiError) return `${e.code}: ${e.message}`;
  return e.message;
}

export default function Loyalty() {
  const earn = useEarnPoints();
  const [memberId, setMemberId] = useState("member_42");
  const [points, setPoints] = useState("50");
  const [reason, setReason] = useState("in-store purchase");

  const pointsNum = Number.parseInt(points, 10);
  const idOk = MEMBER_ID.test(memberId);
  const valid = idOk && Number.isInteger(pointsNum) && pointsNum >= 1;

  // After a successful earn, read the member back to show the persisted balance.
  const member = useMember(earn.isSuccess ? memberId : undefined);

  const onEarn = () => {
    if (!valid) return;
    earn.reset();
    earn.mutate({ memberId, input: { points: pointsNum, reason: reason.trim() || undefined } });
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }}>
      <Screen>
        <Card>
          <Title>Award loyalty points</Title>
          <Field
            label="Member id (letters/digits/underscore)"
            value={memberId}
            onChangeText={setMemberId}
            autoCapitalize="none"
            placeholder="member_42"
          />
          {!idOk && memberId.length > 0 ? (
            <Muted>Invalid id — only A–Z, a–z, 0–9, and _ are allowed (no hyphens).</Muted>
          ) : null}
          <Field
            label="Points"
            value={points}
            onChangeText={setPoints}
            keyboardType="number-pad"
            placeholder="50"
          />
          <Field label="Reason (optional)" value={reason} onChangeText={setReason} placeholder="in-store purchase" />
          <Button title="Earn points" onPress={onEarn} loading={earn.isPending} disabled={!valid} />
          <Muted>`earn` auto-provisions the member account — there is no separate create step.</Muted>
        </Card>

        {earn.data ? (
          <Card>
            <Body color={colors.good}>
              Earned{" "}
              <Pill text={earn.data.idempotent ? "idempotent replay" : "applied"} tone="good" />
            </Body>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Muted>balance</Muted>
              <Body>{earn.data.account.balance}</Body>
            </View>
          </Card>
        ) : null}

        {earn.error ? (
          <Card>
            <Body color={colors.bad}>{errorText(earn.error)}</Body>
          </Card>
        ) : null}

        {earn.isSuccess ? (
          <Card>
            <Title>Read back</Title>
            {member.isLoading ? (
              <Body>Loading…</Body>
            ) : member.error ? (
              <>
                <Body color={colors.bad}>{errorText(member.error as Error)}</Body>
                <Button title="Retry" onPress={() => member.refetch()} variant="ghost" />
              </>
            ) : member.data ? (
              <>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Muted>member</Muted>
                  <Body>{memberId}</Body>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Muted>balance</Muted>
                  <Body>{member.data.account.balance}</Body>
                </View>
                <Button title="Refresh balance" onPress={() => member.refetch()} variant="ghost" />
              </>
            ) : null}
          </Card>
        ) : null}

        <Card>
          <Muted>
            Exercises <Body>client.loyalty.earn</Body> and{" "}
            <Body>client.loyalty.getMember</Body>. Sending the same earn twice
            with one idempotency key applies it once.
          </Muted>
        </Card>
      </Screen>
    </ScrollView>
  );
}
