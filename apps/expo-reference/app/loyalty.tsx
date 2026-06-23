import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import {
  DoehApiError,
  InsufficientPointsError,
  MemberNotFoundError,
  ScopeDeniedError,
} from "@beyondplusmm/doehpos-sdk";
import { useEarnPoints, useMember, useRedeemPoints } from "@/hooks/useLoyalty";
import { Body, Button, Card, Field, Muted, Pill, Screen, Title, colors } from "@/components/ui";

const MEMBER_ID = /^[A-Za-z0-9_]+$/;

// A loyalty ledger entry as served by GET /v1/loyalty/members/{id}.
interface LedgerEntry {
  id?: string;
  type?: "earn" | "redeem";
  points?: number;
  reason?: string;
  at?: string;
}

// The whole point of the negative path: redeeming over balance must read as
// "Insufficient points", never a generic "unknown error" (L5).
function errorText(e: Error): string {
  if (e instanceof InsufficientPointsError) {
    const balance = (e.body as { balance?: number } | undefined)?.balance;
    return `Insufficient points${typeof balance === "number" ? ` — balance is ${balance}` : ""}.`;
  }
  if (e instanceof MemberNotFoundError) {
    return "No such member yet — earn points to create the account.";
  }
  if (e instanceof ScopeDeniedError) {
    return "This key's scope does not include loyalty. Mint a key with the loyalty module enabled.";
  }
  if (e instanceof DoehApiError) return `${e.code}: ${e.message}`;
  return e.message;
}

export default function Loyalty() {
  const [memberId, setMemberId] = useState("LOYALTY_DEMO_001");
  const [points, setPoints] = useState("50");
  const [reason, setReason] = useState("in-store purchase");
  const [lookup, setLookup] = useState(false);

  const earn = useEarnPoints();
  const redeem = useRedeemPoints();
  const member = useMember(lookup ? memberId : undefined);

  const pointsNum = Number.parseInt(points, 10);
  const idOk = MEMBER_ID.test(memberId);
  const valid = idOk && Number.isInteger(pointsNum) && pointsNum >= 1;

  const ledger = (member.data?.account.ledger as LedgerEntry[] | undefined) ?? [];

  const run = (m: typeof earn) => {
    if (!valid) return;
    earn.reset();
    redeem.reset();
    setLookup(true); // start showing/refreshing the balance
    m.mutate({ memberId, input: { points: pointsNum, reason: reason.trim() || undefined } });
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }}>
      <Screen>
        <Card>
          <Title>Member</Title>
          <Field
            label="Member id (letters/digits/underscore)"
            value={memberId}
            onChangeText={setMemberId}
            autoCapitalize="none"
            placeholder="LOYALTY_DEMO_001"
          />
          {!idOk && memberId.length > 0 ? (
            <Muted>Invalid id — only A–Z, a–z, 0–9, and _ are allowed (no hyphens).</Muted>
          ) : null}
          <Button
            title="Look up balance"
            variant="ghost"
            disabled={!idOk}
            loading={member.isFetching}
            onPress={() => setLookup(true)}
          />
          {member.data ? (
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Muted>balance</Muted>
              <Body color={colors.good}>{member.data.account.balance}</Body>
            </View>
          ) : member.error ? (
            <Body color={colors.bad}>{errorText(member.error as Error)}</Body>
          ) : null}
        </Card>

        <Card>
          <Title>Earn / redeem</Title>
          <Field label="Points" value={points} onChangeText={setPoints} keyboardType="number-pad" placeholder="50" />
          <Field label="Reason (optional)" value={reason} onChangeText={setReason} placeholder="in-store purchase" />
          <Button title="Earn points" onPress={() => run(earn)} loading={earn.isPending} disabled={!valid} />
          <Button
            title="Redeem points"
            variant="ghost"
            onPress={() => run(redeem)}
            loading={redeem.isPending}
            disabled={!valid}
          />
          <Muted>`earn` auto-provisions the account. Redeem over balance is rejected — no points move.</Muted>
        </Card>

        {earn.data || redeem.data ? (
          <Card>
            <Body color={colors.good}>
              {earn.data ? "Earned " : "Redeemed "}
              <Pill
                text={(earn.data ?? redeem.data)!.idempotent ? "idempotent replay" : "applied"}
                tone="good"
              />
            </Body>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Muted>new balance</Muted>
              <Body>{(earn.data ?? redeem.data)!.account.balance}</Body>
            </View>
          </Card>
        ) : null}

        {earn.error || redeem.error ? (
          <Card>
            <Body color={colors.bad}>{errorText((earn.error ?? redeem.error) as Error)}</Body>
          </Card>
        ) : null}

        {ledger.length > 0 ? (
          <Card>
            <Title>Ledger</Title>
            {ledger.map((e, i) => (
              <View key={e.id ?? i} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Muted>
                  {e.type ?? "—"}
                  {e.reason ? ` · ${e.reason}` : ""}
                </Muted>
                <Body color={e.type === "redeem" ? colors.warn : colors.good}>
                  {e.type === "redeem" ? "-" : "+"}
                  {e.points ?? 0}
                </Body>
              </View>
            ))}
          </Card>
        ) : null}

        <Card>
          <Muted>
            Exercises <Body>client.loyalty.earn</Body>, <Body>client.loyalty.redeem</Body>, and{" "}
            <Body>client.loyalty.getMember</Body>. Balances are shop-scoped; sending the same
            mutation twice with one idempotency key applies it once.
          </Muted>
        </Card>
      </Screen>
    </ScrollView>
  );
}
