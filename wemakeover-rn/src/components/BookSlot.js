import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { colors, radius, spacing } from "../theme/theme";
import { getLocalDateString } from "../utils/dateUtils";
import { isSlotDisabled } from "../utils/slotUtils";

const ALL_SLOTS = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function buildDays(count = 14) {
  const days = [];
  const base = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    days.push({
      iso: getLocalDateString(d),
      weekday: WEEKDAYS[d.getDay()],
      day: d.getDate(),
      month: MONTHS[d.getMonth()],
    });
  }
  return days;
}

export default function BookSlot({ selectedDate, onDateChange, selectedSlot, onSlotSelect }) {
  const days = buildDays(14);
  const now = new Date();

  return (
    <View>
      <Text style={styles.label}>Select date</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
        {days.map((d) => {
          const active = selectedDate === d.iso;
          return (
            <TouchableOpacity
              key={d.iso}
              onPress={() => onDateChange(d.iso)}
              style={[styles.dateCard, active && styles.dateCardActive]}
            >
              <Text style={[styles.dateWeekday, active && styles.activeText]}>{d.weekday}</Text>
              <Text style={[styles.dateDay, active && styles.activeText]}>{d.day}</Text>
              <Text style={[styles.dateMonth, active && styles.activeText]}>{d.month}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={[styles.label, { marginTop: spacing.lg }]}>Select time slot</Text>
      <View style={styles.slotGrid}>
        {ALL_SLOTS.map((slot) => {
          const disabled = isSlotDisabled(slot, now, selectedDate);
          const active = selectedSlot === slot;
          return (
            <TouchableOpacity
              key={slot}
              disabled={disabled}
              onPress={() => onSlotSelect(slot)}
              style={[
                styles.slot,
                active && styles.slotActive,
                disabled && styles.slotDisabled,
              ]}
            >
              <Text style={[styles.slotText, active && styles.activeText, disabled && styles.slotTextDisabled]}>
                {slot}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  dateCard: {
    width: 60,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    marginRight: spacing.sm,
  },
  dateCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateWeekday: { fontSize: 12, color: colors.muted },
  dateDay: { fontSize: 18, fontWeight: "800", color: colors.text, marginVertical: 2 },
  dateMonth: { fontSize: 11, color: colors.muted },
  activeText: { color: "#fff" },
  slotGrid: { flexDirection: "row", flexWrap: "wrap" },
  slot: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  slotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotDisabled: { backgroundColor: "#F3F4F6", borderColor: "#F3F4F6" },
  slotText: { fontSize: 13, fontWeight: "600", color: colors.text },
  slotTextDisabled: { color: colors.muted },
});
