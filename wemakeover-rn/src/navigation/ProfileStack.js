import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProfileScreen from "../screens/main/ProfileScreen";
import AddressListScreen from "../screens/account/AddressListScreen";
import AddressFormScreen from "../screens/account/AddressFormScreen";
import NotificationsScreen from "../screens/account/NotificationsScreen";
import MyReviewsScreen from "../screens/account/MyReviewsScreen";
import WriteReviewScreen from "../screens/account/WriteReviewScreen";
import ContactScreen from "../screens/account/ContactScreen";
import ServiceabilityScreen from "../screens/account/ServiceabilityScreen";
import ReferEarnScreen from "../screens/account/ReferEarnScreen";

const Stack = createNativeStackNavigator();

export default function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="AddressList" component={AddressListScreen} />
      <Stack.Screen name="AddressForm" component={AddressFormScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="MyReviews" component={MyReviewsScreen} />
      <Stack.Screen name="WriteReview" component={WriteReviewScreen} />
      <Stack.Screen name="Contact" component={ContactScreen} />
      <Stack.Screen name="Serviceability" component={ServiceabilityScreen} />
      <Stack.Screen name="ReferEarn" component={ReferEarnScreen} />
    </Stack.Navigator>
  );
}
