import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CartScreen from "../screens/main/CartScreen";
import PaymentMethodsScreen from "../screens/main/PaymentMethodsScreen";
import BookingSummaryScreen from "../screens/main/BookingSummaryScreen";
import AddressListScreen from "../screens/account/AddressListScreen";
import AddressFormScreen from "../screens/account/AddressFormScreen";

const Stack = createNativeStackNavigator();

export default function CartStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CartMain" component={CartScreen} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
      <Stack.Screen name="BookingSummary" component={BookingSummaryScreen} />
      <Stack.Screen name="OrderSuccess" component={BookingSummaryScreen} />
      <Stack.Screen name="AddressList" component={AddressListScreen} />
      <Stack.Screen name="AddressForm" component={AddressFormScreen} />
    </Stack.Navigator>
  );
}
