import React, { useState } from "react";
import { View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Screen, Heading, SubText, Field, Button, LinkText } from "../../components/ui";
import { forgetPasswordThunk } from "../../features/auth/authThunks";

export default function ForgotPasswordScreen({ navigation }) {
  const dispatch = useDispatch();
  const { status, forgotPasswordSuccess } = useSelector((s) => s.auth);
  const [email, setEmail] = useState("");

  const onSubmit = () => dispatch(forgetPasswordThunk(email.trim().toLowerCase()));

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Heading>Forgot password</Heading>
        <SubText>
          {forgotPasswordSuccess
            ? "If an account exists, a reset link has been sent to your email."
            : "Enter your email and we'll send a reset link."}
        </SubText>

        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Button title="Send reset link" onPress={onSubmit} loading={status === "loading"} />
        <LinkText onPress={() => navigation.navigate("Login")}>Back to login</LinkText>
      </View>
    </Screen>
  );
}
