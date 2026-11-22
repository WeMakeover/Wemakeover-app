import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/main/HomeScreen";
import CategoryServicesScreen from "../screens/main/CategoryServicesScreen";
import ServiceDetailScreen from "../screens/main/ServiceDetailScreen";
import ReferEarnScreen from "../screens/account/ReferEarnScreen";
import AddressFormScreen from "../screens/account/AddressFormScreen";

const Stack = createNativeStackNavigator();

export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="CategoryServices" component={CategoryServicesScreen} />
      <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
      <Stack.Screen name="ReferEarn" component={ReferEarnScreen} />
      <Stack.Screen name="AddressForm" component={AddressFormScreen} />
    </Stack.Navigator>
  );
}
