import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../../theme/theme";
import { IconButton, EmptyState, Loading } from "../../components/ui";
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  selectNotifications,
  selectUnreadCount,
  selectNotificationsLoading,
} from "../../features/notifications/notificationsSlice";

const ICON_BY_TYPE = {
  booking: "calendar-outline",
  payment: "card-outline",
  review: "star-outline",
  promo: "pricetag-outline",
  system: "information-circle-outline",
};

function timeAgo(dateString) {
  if (!dateString) return "";
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationsScreen({ navigation }) {
  const dispatch = useDispatch();
  const notifications = useSelector(selectNotifications);
  const unreadCount = useSelector(selectUnreadCount);
  const loading = useSelector(selectNotificationsLoading);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    dispatch(fetchNotifications({ page: 1, limit: 30 }));
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    Promise.resolve(dispatch(fetchNotifications({ page: 1, limit: 30 }))).finally(() => setRefreshing(false));
  };

  const onPressItem = (n) => {
    const id = n.id || n._id;
    if (!n.isRead) dispatch(markNotificationAsRead(id));
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <IconButton name="arrow-back" onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={() => dispatch(markAllNotificationsAsRead())}>
            <Text style={styles.markAll}>Read all</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 34 }} />
        )}
      </View>

      {loading && notifications.length === 0 ? (
        <Loading />
      ) : notifications.length === 0 ? (
        <EmptyState icon="notifications-outline" title="No notifications" subtitle="You're all caught up!" />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {notifications.map((n) => {
            const id = n.id || n._id;
            return (
              <TouchableOpacity
                key={id}
                activeOpacity={0.85}
                style={[styles.item, !n.isRead && styles.itemUnread]}
                onPress={() => onPressItem(n)}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name={ICON_BY_TYPE[n.type] || "notifications-outline"} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {n.title || "Notification"}
                  </Text>
                  {n.message || n.body ? (
                    <Text style={styles.itemBody} numberOfLines={3}>
                      {n.message || n.body}
                    </Text>
                  ) : null}
                  <Text style={styles.itemTime}>{timeAgo(n.createdAt)}</Text>
                </View>
                <TouchableOpacity onPress={() => dispatch(deleteNotification(id))} hitSlop={8} style={styles.delete}>
                  <Ionicons name="close" size={18} color={colors.muted} />
                </TouchableOpacity>
                {!n.isRead ? <View style={styles.dot} /> : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  markAll: { color: colors.primary, fontWeight: "600", fontSize: 13 },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  itemUnread: { backgroundColor: colors.surface, borderColor: colors.surface },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  itemTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  itemBody: { fontSize: 13, color: colors.muted, marginTop: 2, lineHeight: 18 },
  itemTime: { fontSize: 11, color: colors.muted, marginTop: 6 },
  delete: { padding: 4, marginLeft: 4 },
  dot: { position: "absolute", top: 10, right: 30, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
});
