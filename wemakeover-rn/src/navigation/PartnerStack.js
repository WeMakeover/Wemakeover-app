import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import PartnerHomeScreen from "../screens/partner/PartnerHomeScreen";

const Stack = createNativeStackNavigator();

/** Partner app shell — expand with jobs, earnings, profile later. */
export default function PartnerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PartnerHome" component={PartnerHomeScreen} />
    </Stack.Navigator>
  );
}
