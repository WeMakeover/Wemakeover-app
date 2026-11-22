import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import BookingsScreen from "../screens/main/BookingsScreen";
import BookingDetailScreen from "../screens/main/BookingDetailScreen";
import WriteReviewScreen from "../screens/account/WriteReviewScreen";

const Stack = createNativeStackNavigator();

export default function BookingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BookingsMain" component={BookingsScreen} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
      <Stack.Screen name="WriteReview" component={WriteReviewScreen} />
    </Stack.Navigator>
  );
}
