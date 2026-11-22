import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { colors, radius, spacing } from "../../theme/theme";
import { IconButton, EmptyState, Loading, Button, Divider } from "../../components/ui";
import StarRating from "../../components/StarRating";
import {
  fetchMyReviews,
  fetchPendingReviews,
  selectMyReviews,
  selectPendingReviews,
} from "../../features/reviews/reviewsSlice";
import { formatDate } from "../../utils/paymentUtils";

function serviceNames(services) {
  if (!Array.isArray(services)) return "Service";
  return services.map((s) => s.name || s.serviceName || "Service").join(", ");
}

export default function MyReviewsScreen({ navigation }) {
  const dispatch = useDispatch();
  const { reviews, loading } = useSelector(selectMyReviews);
  const pending = useSelector(selectPendingReviews);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    dispatch(fetchMyReviews({ page: 1, limit: 20 }));
    dispatch(fetchPendingReviews());
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([dispatch(fetchMyReviews({ page: 1, limit: 20 })), dispatch(fetchPendingReviews())]).finally(() =>
      setRefreshing(false)
    );
  };

  const empty = reviews.length === 0 && pending.bookings.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <IconButton name="arrow-back" onPress={() => navigation.goBack()} />
        <Text style={styles.title}>My reviews</Text>
        <View style={{ width: 34 }} />
      </View>

      {loading && empty ? (
        <Loading />
      ) : empty ? (
        <EmptyState icon="star-outline" title="No reviews yet" subtitle="Reviews you write will appear here." />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {pending.bookings.length > 0 ? (
            <>
              <Text style={styles.section}>Pending reviews</Text>
              {pending.bookings.map((b) => (
                <View key={b._id} style={styles.pendingCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pendingName} numberOfLines={1}>
                      {serviceNames(b.services)}
                    </Text>
                    <Text style={styles.pendingDate}>
                      {formatDate(b.bookingDetails?.date || b.date)}
                    </Text>
                  </View>
                  <Button
                    title="Write"
                    onPress={() =>
                      navigation.navigate("WriteReview", {
                        bookingId: b._id,
                        services: serviceNames(b.services),
                      })
                    }
                    style={{ paddingHorizontal: spacing.lg }}
                  />
                </View>
              ))}
              <Divider />
            </>
          ) : null}

          {reviews.length > 0 ? (
            <>
              <Text style={styles.section}>Submitted</Text>
              {reviews.map((r) => (
                <View key={r._id || r.reviewId} style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardName} numberOfLines={1}>
                      {r.serviceName || serviceNames(r.services) || "Review"}
                    </Text>
                    {r.type === "complaint" ? (
                      <Text style={styles.complaintTag}>Complaint</Text>
                    ) : (
                      <StarRating value={r.rating || 0} size={16} readOnly />
                    )}
                  </View>
                  {r.comment ? <Text style={styles.comment}>{r.comment}</Text> : null}
                  <Text style={styles.date}>
                    {formatDate(r.createdAt)} {r.isEdited ? "· edited" : ""}
                  </Text>
                </View>
              ))}
            </>
          ) : null}
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
  section: { fontSize: 13, fontWeight: "700", color: colors.muted, textTransform: "uppercase", marginBottom: spacing.sm },
  pendingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pendingName: { fontSize: 15, fontWeight: "700", color: colors.text },
  pendingDate: { fontSize: 12, color: colors.muted, marginTop: 2 },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardName: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.text, marginRight: spacing.sm },
  complaintTag: { fontSize: 12, fontWeight: "700", color: colors.error },
  comment: { fontSize: 14, color: colors.text, marginTop: spacing.sm, lineHeight: 20 },
  date: { fontSize: 12, color: colors.muted, marginTop: spacing.sm },
});
