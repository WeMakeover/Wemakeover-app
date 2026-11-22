import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { colors, radius, spacing } from "../../theme/theme";
import { Button, IconButton } from "../../components/ui";
import StarRating from "../../components/StarRating";
import { submitReview, resetSubmission, selectSubmission } from "../../features/reviews/reviewsSlice";
import toast from "../../lib/toast";

const MAX = 2000;
const COMPLAINT_CATEGORIES = [
  { value: "service_quality", label: "Service quality" },
  { value: "staff_behavior", label: "Staff behavior" },
  { value: "timing", label: "Timing/Punctuality" },
  { value: "pricing", label: "Pricing issues" },
  { value: "hygiene", label: "Hygiene concerns" },
  { value: "other", label: "Other" },
];

export default function WriteReviewScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { bookingId, services } = route.params || {};
  const { loading, error, success } = useSelector(selectSubmission);

  const [tab, setTab] = useState("review");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    return () => {
      dispatch(resetSubmission());
    };
  }, [dispatch]);

  useEffect(() => {
    if (success) {
      toast.success(tab === "review" ? "Thanks for your review!" : "Complaint submitted");
      navigation.goBack();
    }
  }, [success, tab, navigation]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const valid = tab === "review" ? rating >= 1 : comment.trim().length > 0;

  const onSubmit = () => {
    if (!valid) {
      toast.error(tab === "review" ? "Please select a rating" : "Please describe your complaint");
      return;
    }
    dispatch(
      submitReview({
        bookingId,
        type: tab,
        rating: tab === "review" ? rating : null,
        comment: comment.trim(),
        complaintCategory: tab === "complaint" ? category || "other" : null,
        source: "mobile",
      })
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <IconButton name="arrow-back" onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Share your experience</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        {services ? (
          <Text style={styles.services} numberOfLines={2}>
            {services}
          </Text>
        ) : null}

        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tab, tab === "review" && styles.tabActive]} onPress={() => setTab("review")}>
            <Text style={[styles.tabText, tab === "review" && styles.tabTextActive]}>Review</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, tab === "complaint" && styles.tabActive]} onPress={() => setTab("complaint")}>
            <Text style={[styles.tabText, tab === "complaint" && styles.tabTextActive]}>Complaint</Text>
          </TouchableOpacity>
        </View>

        {tab === "review" ? (
          <View style={styles.ratingBox}>
            <Text style={styles.label}>How would you rate it?</Text>
            <StarRating value={rating} onChange={setRating} size={38} />
            <Text style={styles.ratingHint}>
              {rating === 0
                ? "Tap to rate"
                : rating <= 2
                ? "We're sorry to hear that"
                : rating <= 3
                ? "Thanks for the feedback"
                : "We're glad you enjoyed it!"}
            </Text>
          </View>
        ) : (
          <View style={{ marginBottom: spacing.md }}>
            <Text style={styles.label}>What is your complaint about?</Text>
            <View style={styles.catWrap}>
              {COMPLAINT_CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.value}
                  style={[styles.cat, category === c.value && styles.catActive]}
                  onPress={() => setCategory(c.value)}
                >
                  <Text style={[styles.catText, category === c.value && styles.catTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.label}>
          {tab === "review" ? "Tell us more (optional)" : "Describe your complaint"}
        </Text>
        <TextInput
          style={styles.textArea}
          value={comment}
          onChangeText={(t) => setComment(t.slice(0, MAX))}
          placeholder={tab === "review" ? "What did you like or dislike?" : "Provide details so we can help..."}
          placeholderTextColor={colors.muted}
          multiline
        />
        <Text style={styles.counter}>{comment.length}/{MAX}</Text>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={tab === "review" ? "Submit review" : "Submit complaint"}
          loading={loading}
          disabled={!valid}
          onPress={onSubmit}
        />
      </View>
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
  services: { fontSize: 14, color: colors.muted, marginBottom: spacing.md },
  tabs: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: radius.pill, padding: 4, marginBottom: spacing.lg },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, alignItems: "center" },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontWeight: "700", color: colors.text },
  tabTextActive: { color: "#fff" },
  ratingBox: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: spacing.lg, marginBottom: spacing.lg },
  label: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  ratingHint: { fontSize: 13, color: colors.muted, marginTop: spacing.sm },
  catWrap: { flexDirection: "row", flexWrap: "wrap" },
  cat: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  catActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catText: { fontSize: 13, color: colors.text },
  catTextActive: { color: "#fff", fontWeight: "600" },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 110,
    textAlignVertical: "top",
    color: colors.text,
    backgroundColor: "#fff",
  },
  counter: { alignSelf: "flex-end", fontSize: 12, color: colors.muted, marginTop: 4 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.lg + 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
