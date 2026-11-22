import React from "react";
import { View, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { useFonts } from "expo-font";
import Toast from "react-native-toast-message";

import { store, persistor } from "./src/store/store";
import RootNavigator from "./src/navigation/RootNavigator";
import { fontAssets } from "./src/theme/fonts";
import { colors } from "./src/theme/theme";

function AppBootSplash() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  if (!fontsLoaded && !fontError) {
    return <AppBootSplash />;
  }

  return (
    <Provider store={store}>
      <PersistGate loading={<AppBootSplash />} persistor={persistor}>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <RootNavigator />
          <Toast />
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}
