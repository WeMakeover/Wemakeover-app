import Booking from '../models/booking.model.js';
import BookingConfigService from './bookingConfig.service.js';
import {
  BUSINESS_TIME_SLOTS,
  DEFAULT_MAX_BOOKINGS_PER_SLOT,
  MAX_BOOKINGS_PER_SLOT_CONFIG_KEY,
  SLOT_OCCUPYING_STATUSES
} from '../constants/slot.constants.js';

/**
 * Normalize slot strings so "11:00 AM" and "11:00 AM - 11:45 AM" match.
 */
export function normalizeSlotValue(slot) {
  if (!slot || typeof slot !== 'string') {
    return '';
  }

  const trimmed = slot.trim();
  const match = trimmed.match(/^(\d{1,2}:\d{2})\s*(AM|PM)/i);

  if (!match) {
    return trimmed;
  }

  const [, time, period] = match;
  const [hours, minutes] = time.split(':');

  return `${hours.padStart(2, '0')}:${minutes} ${period.toUpperCase()}`;
}

/**
 * Build an inclusive local-day range for querying bookings by date.
 * Accepts YYYY-MM-DD strings as calendar dates (avoids UTC shift).
 */
export function getDateQueryRange(dateInput) {
  let year;
  let month;
  let day;

  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    [year, month, day] = dateInput.split('-').map(Number);
  } else {
    const date = new Date(dateInput);

    if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }

    year = date.getFullYear();
    month = date.getMonth() + 1;
    day = date.getDate();
  }

  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  const end = new Date(year, month - 1, day, 23, 59, 59, 999);

  return { start, end };
}

class SlotAvailabilityService {
  async getMaxBookingsPerSlot() {
    const configResult = await BookingConfigService.getConfigByKey(
      MAX_BOOKINGS_PER_SLOT_CONFIG_KEY
    );

    if (configResult.success && typeof configResult.data?.value === 'number') {
      return Math.max(1, configResult.data.value);
    }

    return DEFAULT_MAX_BOOKINGS_PER_SLOT;
  }

  async getActiveBookingsForDate(dateInput, excludeBookingId = null) {
    const { start, end } = getDateQueryRange(dateInput);

    const query = {
      'bookingDetails.date': { $gte: start, $lte: end },
      status: { $in: SLOT_OCCUPYING_STATUSES }
    };

    if (excludeBookingId) {
      query._id = { $ne: excludeBookingId };
    }

    return Booking.find(query).select('bookingDetails.slot status').lean();
  }

  async countBookingsForSlot(dateInput, slot, excludeBookingId = null) {
    const normalizedSlot = normalizeSlotValue(slot);
    const bookings = await this.getActiveBookingsForDate(dateInput, excludeBookingId);

    return bookings.filter(
      (booking) => normalizeSlotValue(booking.bookingDetails?.slot) === normalizedSlot
    ).length;
  }

  async isSlotAvailable(dateInput, slot, excludeBookingId = null) {
    const normalizedSlot = normalizeSlotValue(slot);

    if (!normalizedSlot) {
      return {
        available: false,
        message: 'Invalid time slot selected.',
        currentBookings: 0,
        maxBookings: await this.getMaxBookingsPerSlot()
      };
    }

    const [currentBookings, maxBookings] = await Promise.all([
      this.countBookingsForSlot(dateInput, normalizedSlot, excludeBookingId),
      this.getMaxBookingsPerSlot()
    ]);

    const available = currentBookings < maxBookings;

    return {
      available,
      currentBookings,
      maxBookings,
      remainingCapacity: Math.max(0, maxBookings - currentBookings),
      normalizedSlot,
      message: available
        ? 'Slot is available'
        : 'This time slot is fully booked. Please choose a different time.'
    };
  }

  async getAvailabilityForDate(dateInput, excludeBookingId = null) {
    const maxBookings = await this.getMaxBookingsPerSlot();
    const bookings = await this.getActiveBookingsForDate(dateInput, excludeBookingId);

    const bookingCountBySlot = {};

    for (const booking of bookings) {
      const slotKey = normalizeSlotValue(booking.bookingDetails?.slot);
      if (!slotKey) continue;
      bookingCountBySlot[slotKey] = (bookingCountBySlot[slotKey] || 0) + 1;
    }

    const slotDetails = BUSINESS_TIME_SLOTS.map((slot) => {
      const currentBookings = bookingCountBySlot[slot] || 0;
      const isAvailable = currentBookings < maxBookings;

      return {
        slot,
        currentBookings,
        maxBookings,
        remainingCapacity: Math.max(0, maxBookings - currentBookings),
        isAvailable,
        isFullyBooked: !isAvailable
      };
    });

    const availableSlots = slotDetails
      .filter((detail) => detail.isAvailable)
      .map((detail) => detail.slot);

    const bookedSlots = slotDetails
      .filter((detail) => detail.currentBookings > 0)
      .map((detail) => detail.slot);

    const fullyBookedSlots = slotDetails
      .filter((detail) => detail.isFullyBooked)
      .map((detail) => detail.slot);

    const date = new Date(dateInput);
    const dateString = Number.isNaN(date.getTime())
      ? String(dateInput)
      : date.toISOString().split('T')[0];

    return {
      date: dateString,
      maxBookingsPerSlot: maxBookings,
      allSlots: [...BUSINESS_TIME_SLOTS],
      availableSlots,
      bookedSlots,
      fullyBookedSlots,
      totalSlots: BUSINESS_TIME_SLOTS.length,
      availableCount: availableSlots.length,
      slotDetails
    };
  }
}

export default new SlotAvailabilityService();
