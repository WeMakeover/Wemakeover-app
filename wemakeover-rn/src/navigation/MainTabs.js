import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { CommonActions } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../theme/theme";
import HomeStack from "./HomeStack";
import CartStack from "./CartStack";
import BookingsStack from "./BookingsStack";
import ProfileStack from "./ProfileStack";
import { selectUnreadCount } from "../features/notifications/notificationsSlice";
import { selectCartServicesCount } from "../features/cart/cartSlice";
import {
  createPopFormsOnBlurListener,
  createResetFormOnTabPressListener,
} from "./navFlow";

const Tab = createBottomTabNavigator();
const homeTabLogo = require("../../assets/home/home-tab-logo.png");
const bookingsTabIcon = require("../../assets/home/bookings-tab-icon.png");
const cartTabIcon = require("../../assets/home/cart-tab-icon.png");
const accountTabIcon = require("../../assets/home/account-tab-icon.png");
const TAB_BAR_CONTENT_HEIGHT = 60;
const TAB_SCENE_BG = "#FFFFFF";
const TAB_RADIUS = 24;
const STROKE = "#EAEAEA";

/** Screens that must not linger when user leaves a tab mid-flow. */
const HOME_FORM_SCREENS = ["AddressForm"];
const PROFILE_FORM_SCREENS = ["AddressForm", "WriteReview"];
const CART_FORM_SCREENS = ["AddressForm", "PaymentMethods", "BookingSummary"];

/**
 * Figma Bottom Nav top stroke without react-native-svg (Expo Go safe):
 * curved corner caps + gradient across the flat top that fades at both ends.
 */
function TabBarBackground() {
  return (
    <View style={styles.tabBarBgRoot} pointerEvents="none">
      <View style={styles.tabBarBgFill} />
      <View style={styles.tabBarStrokeRow}>
        <View style={styles.tabBarCornerLeft} />
        <LinearGradient
          colors={["#EAEAEA", "#585858", "#EAEAEA"]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.tabBarTopBorder}
        />
        <View style={styles.tabBarCornerRight} />
      </View>
    </View>
  );
}

function AccountIcon({ color, size }) {
  const count = useSelector(selectUnreadCount);
  return (
    <View>
      <Image source={accountTabIcon} style={{ width: size, height: size, tintColor: color }} resizeMode="contain" />
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
        </View>
      ) : null}
    </View>
  );
}

function HomeTabIcon({ focused, size }) {
  if (focused) return <Image source={homeTabLogo} style={{ width: size, height: size }} resizeMode="contain" />;
  return <Image source={homeTabLogo} style={{ width: size, height: size, tintColor: colors.muted }} resizeMode="contain" />;
}

function BookingsTabIcon({ color, size }) {
  return (
    <Image
      source={bookingsTabIcon}
      style={{ width: size, height: size, tintColor: color }}
      resizeMode="contain"
    />
  );
}

function CartTabIcon({ color, size }) {
  const count = useSelector(selectCartServicesCount);
  return (
    <View>
      <Image
        source={cartTabIcon}
        style={{ width: size, height: size, tintColor: color }}
        resizeMode="contain"
      />
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  const tabBarBottomInset = Math.max(insets.bottom, 0);

  return (
    <View style={{ flex: 1, backgroundColor: TAB_SCENE_BG }}>
      <Tab.Navigator
        sceneContainerStyle={{ backgroundColor: TAB_SCENE_BG }}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: TAB_SCENE_BG },
          // We pad the tab bar ourselves — disable RN's extra bottom inset
          // (double inset floats the bar and lets Cart content clip icons).
          safeAreaInsets: { bottom: 0 },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            ...styles.tabBar,
            height: TAB_BAR_CONTENT_HEIGHT + tabBarBottomInset,
            paddingBottom: tabBarBottomInset,
            zIndex: 100,
            elevation: 16,
          },
          tabBarBackground: () => <TabBarBackground />,
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeStack}
          options={{
            tabBarLabel: "Home",
            tabBarIcon: ({ focused, size }) => <HomeTabIcon focused={focused} size={size} />,
          }}
          listeners={createPopFormsOnBlurListener("Home", HOME_FORM_SCREENS)}
        />
        <Tab.Screen
          name="Bookings"
          component={BookingsStack}
          options={{
            tabBarLabel: "My Bookings",
            tabBarIcon: ({ color, size }) => <BookingsTabIcon color={color} size={size} />,
          }}
        />
        <Tab.Screen
          name="Cart"
          component={CartStack}
          options={{
            tabBarLabel: "Cart",
            tabBarIcon: ({ color, size }) => <CartTabIcon color={color} size={size} />,
          }}
          listeners={({ navigation }) => {
            const popForms = createPopFormsOnBlurListener("Cart", CART_FORM_SCREENS)({ navigation });
            return {
              ...popForms,
              tabPress: () => {
                const tabState = navigation.getState();
                const cartRoute = tabState.routes.find((r) => r.name === "Cart");
                const stackState = cartRoute?.state;
                const activeRoute = stackState?.routes?.[stackState.index ?? 0];
                if (activeRoute?.name !== "OrderSuccess" && activeRoute?.name !== "BookingSummary") return;

                navigation.dispatch(
                  CommonActions.reset({
                    ...tabState,
                    routes: tabState.routes.map((route) =>
                      route.name === "Cart"
                        ? { ...route, state: { routes: [{ name: "CartMain" }], index: 0 } }
                        : route
                    ),
                    index: tabState.routes.findIndex((r) => r.name === "Cart"),
                  })
                );
              },
            };
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileStack}
          options={{
            tabBarLabel: "Account",
            tabBarIcon: ({ color, size }) => <AccountIcon color={color} size={size} />,
          }}
          listeners={({ navigation }) => {
            const onBlur = createPopFormsOnBlurListener("Profile", PROFILE_FORM_SCREENS)({ navigation });
            const onPress = createResetFormOnTabPressListener("Profile", PROFILE_FORM_SCREENS)({
              navigation,
            });
            return {
              ...onBlur,
              ...onPress,
            };
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    paddingTop: 6,
    borderTopWidth: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 1)",
    // Visible so the curved top stroke can paint; elevation keeps scenes under it.
    overflow: "visible",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  tabBarBgRoot: {
    ...StyleSheet.absoluteFillObject,
  },
  tabBarBgFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 1)",
    borderTopLeftRadius: TAB_RADIUS,
    borderTopRightRadius: TAB_RADIUS,
  },
  tabBarStrokeRow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: TAB_RADIUS,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  tabBarCornerLeft: {
    width: TAB_RADIUS,
    height: TAB_RADIUS,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: STROKE,
    borderLeftColor: STROKE,
    borderTopLeftRadius: TAB_RADIUS,
    backgroundColor: "transparent",
  },
  tabBarCornerRight: {
    width: TAB_RADIUS,
    height: TAB_RADIUS,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderTopColor: STROKE,
    borderRightColor: STROKE,
    borderTopRightRadius: TAB_RADIUS,
    backgroundColor: "transparent",
  },
  tabBarTopBorder: {
    flex: 1,
    height: 1,
  },
  tabLabel: {
    fontFamily: "Avenir-Heavy",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    backgroundColor: colors.primary,
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
});
