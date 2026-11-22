/**
 * Standard business time slots shown to customers during booking.
 * Format: "HH:MM AM/PM" (matches client BookYourSlot component).
 */
export const BUSINESS_TIME_SLOTS = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM'
];

/** Default capacity per slot at launch (1 therapist = 1 booking). */
export const DEFAULT_MAX_BOOKINGS_PER_SLOT = 1;

/** Booking statuses that occupy a slot until cancelled or completed. */
export const SLOT_OCCUPYING_STATUSES = ['pending', 'confirmed', 'in_progress'];

export const MAX_BOOKINGS_PER_SLOT_CONFIG_KEY = 'MAX_BOOKINGS_PER_SLOT';
