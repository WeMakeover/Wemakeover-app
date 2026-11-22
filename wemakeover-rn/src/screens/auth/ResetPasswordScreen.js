import React, { useState } from "react";
import { View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Screen, Heading, SubText, Field, Button } from "../../components/ui";
import { resetPasswordThunk } from "../../features/auth/authThunks";

/**
 * Reached via a deep link: wemakeover://auth/reset-password/:id/:token
 * (configured in the navigation linking config). On success the user is
 * authenticated automatically (backend returns tokens).
 */
export default function ResetPasswordScreen({ route }) {
  const dispatch = useDispatch();
  const { status, error } = useSelector((s) => s.auth);
  const id = route.params?.id || "";
  const token = route.params?.token || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const onSubmit = () => dispatch(resetPasswordThunk({ id, token, password, confirmPassword }));

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Heading>Reset password</Heading>
        <SubText>Choose a new password for your account.</SubText>

        <Field label="New password" value={password} onChangeText={setPassword} placeholder="New password" secureTextEntry />
        <Field
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter password"
          secureTextEntry
          error={status === "failed" ? error : null}
        />

        <Button title="Reset password" onPress={onSubmit} loading={status === "loading"} />
      </View>
    </Screen>
  );
}
