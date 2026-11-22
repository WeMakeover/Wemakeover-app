import { getLocalDateString } from "./dateUtils";

/**
 * Utility functions for slot management and validation (ported from the web client).
 */

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

/**
 * Check if a slot should be disabled based on 1 hour buffer logic.
 */
export const isSlotDisabled = (slotTime, currentTime = new Date(), selectedDate = null) => {
  const today = getLocalDateString(currentTime);
  if (selectedDate && selectedDate !== today) {
    return false;
  }

  const [time, period] = slotTime.split(" ");
  const [hours, minutes] = time.split(":");

  let slotHour = parseInt(hours);
  if (period === "PM" && slotHour !== 12) {
    slotHour += 12;
  } else if (period === "AM" && slotHour === 12) {
    slotHour = 0;
  }

  const slotDateTime = new Date(currentTime);
  slotDateTime.setHours(slotHour, parseInt(minutes), 0, 0);

  const timeDiffMinutes = (slotDateTime - currentTime) / (1000 * 60);

  // Disable if less than 1 hour advance time
  return timeDiffMinutes < 60;
};

export const getAvailableSlots = (selectedDate = null, currentTime = new Date()) => {
  const today = getLocalDateString(currentTime);
  if (selectedDate && selectedDate !== today) {
    return ALL_SLOTS;
  }
  return ALL_SLOTS.filter((slot) => !isSlotDisabled(slot, currentTime, selectedDate));
};

export const getDisabledSlots = (selectedDate = null, currentTime = new Date()) => {
  const today = getLocalDateString(currentTime);
  if (selectedDate && selectedDate !== today) {
    return [];
  }
  return ALL_SLOTS.filter((slot) => isSlotDisabled(slot, currentTime, selectedDate));
};

export const formatSlotTime = (timeString) => timeString;

export const getNextAvailableSlot = (selectedDate = null, currentTime = new Date()) => {
  const availableSlots = getAvailableSlots(selectedDate, currentTime);
  return availableSlots.length > 0 ? availableSlots[0] : null;
};

export const validateSlotSelection = (slotTime, selectedDate = null, currentTime = new Date()) => {
  if (!slotTime) {
    return { isValid: false, message: "Please select a time slot" };
  }
  if (!selectedDate) {
    return { isValid: false, message: "Please select a date" };
  }
  if (isSlotDisabled(slotTime, currentTime, selectedDate)) {
    return {
      isValid: false,
      message: "This time slot is not available. Please select another time.",
    };
  }
  return { isValid: true, message: "Slot selection is valid" };
};
