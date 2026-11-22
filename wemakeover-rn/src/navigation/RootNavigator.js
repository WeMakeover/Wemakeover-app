import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import AuthStack from "./AuthStack";
import MainTabs from "./MainTabs";
import PartnerStack from "./PartnerStack";
import { navigationRef } from "./navigationRef";
import { checkLoginStatus } from "../features/auth/authThunks";
import usePushNotifications from "../hooks/usePushNotifications";
import { colors } from "../theme/theme";

/**
 * Deep links so password-reset emails open the right screen, e.g.
 *   wemakeover://auth/reset-password/<id>/<token>
 */
const linking = {
  prefixes: ["wemakeover://", "https://wemakeover.co.in"],
  config: {
    screens: {
      Register: {
        path: "register",
        parse: {
          ref: (ref) => (ref == null ? "" : String(ref)),
        },
      },
      ResetPassword: "auth/reset-password/:id/:token",
      // Prefer Home stack so deep link does not dump users on Account
      Home: {
        screens: {
          ReferEarn: "refer",
        },
      },
      Profile: {
        screens: {
          ReferEarn: "account/refer",
          ProfileMain: "account",
        },
      },
    },
  },
};

export default function RootNavigator() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  const isPartnerAuthenticated = useSelector((s) => s.partnerAuth.isAuthenticated);
  const [booting, setBooting] = useState(true);

  // Push notifications: register the FCM token after login + route taps.
  usePushNotifications();

  useEffect(() => {
    // Try to restore the session from stored tokens on app launch.
    const bootTimeout = setTimeout(() => setBooting(false), 8000);
    dispatch(checkLoginStatus()).finally(() => {
      clearTimeout(bootTimeout);
      setBooting(false);
    });
    return () => clearTimeout(bootTimeout);
  }, [dispatch]);

  if (booting) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  let appTree = <AuthStack />;
  if (isPartnerAuthenticated) {
    appTree = <PartnerStack />;
  } else if (isAuthenticated) {
    appTree = <MainTabs />;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      theme={{
        dark: false,
        colors: {
          primary: colors.primary,
          background: "#FFFFFF",
          card: "#FFFFFF",
          text: colors.text,
          border: colors.border,
          notification: colors.primary,
        },
        fonts: {
          regular: { fontFamily: "System", fontWeight: "400" },
          medium: { fontFamily: "System", fontWeight: "500" },
          bold: { fontFamily: "System", fontWeight: "700" },
          heavy: { fontFamily: "System", fontWeight: "800" },
        },
      }}
    >
      {appTree}
    </NavigationContainer>
  );
}
