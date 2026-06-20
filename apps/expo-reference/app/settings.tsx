import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import type { Environment } from "@beyondplusmm/doehpos-sdk";
import { useCredentials } from "@/store/credentials";
import { ENVIRONMENTS } from "@/config/env";
import { Body, Button, Card, Field, Muted, Pill, Screen, Title, colors } from "@/components/ui";

export default function Settings() {
  const router = useRouter();
  const { apiKey, environment, save, clear } = useCredentials();
  const [keyInput, setKeyInput] = useState(apiKey ?? "");
  const [env, setEnv] = useState<Environment>(environment);
  const [saving, setSaving] = useState(false);

  const mismatch =
    keyInput.startsWith("sk_test_") && env === "production"
      ? "A test key with the production environment will be rejected (API_KEY_ENV_MISMATCH)."
      : keyInput.startsWith("sk_live_") && env === "sandbox"
        ? "A live key with the sandbox environment will be rejected (API_KEY_ENV_MISMATCH)."
        : null;

  const onSave = async () => {
    setSaving(true);
    try {
      await save(keyInput.trim(), env);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }}>
      <Screen>
        <Card>
          <Title>API key</Title>
          <Muted>Stored in the device secure store (Keychain / Keystore). Never logged.</Muted>
          <Field
            label="Bearer key"
            value={keyInput}
            onChangeText={setKeyInput}
            placeholder="sk_test_…"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
        </Card>

        <Card>
          <Title>Environment</Title>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {ENVIRONMENTS.map((e) => (
              <View key={e} style={{ flex: 1 }}>
                <Button
                  title={e}
                  onPress={() => setEnv(e)}
                  variant={env === e ? "primary" : "ghost"}
                />
              </View>
            ))}
          </View>
          <Body>
            Cutover is exactly this toggle: <Pill text="sandbox" tone="good" /> +{" "}
            <Pill text="sk_test_" /> → <Pill text="production" tone="warn" /> +{" "}
            <Pill text="sk_live_" />.
          </Body>
          {mismatch ? <Body color={colors.warn}>{mismatch}</Body> : null}
        </Card>

        <Button title="Save" onPress={onSave} loading={saving} disabled={!keyInput.trim()} />
        <Button
          title="Clear key"
          onPress={() => {
            clear();
            setKeyInput("");
          }}
          variant="danger"
        />
      </Screen>
    </ScrollView>
  );
}
