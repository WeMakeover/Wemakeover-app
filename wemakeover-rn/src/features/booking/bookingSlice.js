import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import bookingApi from "./bookingApi.js";

const initialState = {
  bookings: [],
  currentBooking: null,
  upcomingBookings: [],

  loading: false,
  creating: false,
  cancelling: false,
  rescheduling: false,
  completingPayment: false,

  error: null,
  createError: null,
  cancelError: null,
  rescheduleError: null,
  paymentError: null,

  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNextPage: false,
    hasPrevPage: false,
  },

  stats: {
    totalBookings: 0,
    totalSpent: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    upcomingBookings: 0,
    statusBreakdown: {},
  },

  availableSlots: [],
  slotsLoading: false,
  slotsError: null,

  bookingConfig: {
    minimumOrderValue: null,
    currency: "INR",
    loading: false,
    error: null,
    lastFetched: null,
  },

  lastFetched: null,
};

export const fetchUserBookings = createAsyncThunk(
  "booking/fetchUserBookings",
  async (params = {}, { rejectWithValue }) => {
    try {
      return await bookingApi.getUserBookings(params);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchBookingById = createAsyncThunk(
  "booking/fetchBookingById",
  async (bookingId, { rejectWithValue }) => {
    try {
      return await bookingApi.getBookingById(bookingId);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createBooking = createAsyncThunk(
  "booking/createBooking",
  async (bookingData, { rejectWithValue }) => {
    try {
      return await bookingApi.createBooking(bookingData);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const cancelBooking = createAsyncThunk(
  "booking/cancelBooking",
  async ({ bookingId, cancellationReason }, { rejectWithValue }) => {
    try {
      const response = await bookingApi.cancelBooking(bookingId, cancellationReason);
      return { bookingId, ...response };
    } catch (error) {
      return rejectWithValue({ message: error.message });
    }
  }
);

export const rescheduleBooking = createAsyncThunk(
  "booking/rescheduleBooking",
  async ({ bookingId, newDate, newSlot, newPaymentMethod, reason }, { rejectWithValue }) => {
    try {
      const rescheduleData = { newDate, newSlot };
      if (newPaymentMethod) rescheduleData.newPaymentMethod = newPaymentMethod;
      if (reason) rescheduleData.reason = reason;
      const response = await bookingApi.rescheduleBooking(bookingId, rescheduleData);
      return { bookingId, ...response };
    } catch (error) {
      return rejectWithValue({ message: error.message });
    }
  }
);

export const completeBookingPayment = createAsyncThunk(
  "booking/completeBookingPayment",
  async (
    { bookingId, paymentMethod, razorpayOrderId, razorpayPaymentId, razorpaySignature },
    { rejectWithValue }
  ) => {
    try {
      const paymentData = { paymentMethod };
      if (paymentMethod === "online" && razorpayOrderId && razorpayPaymentId && razorpaySignature) {
        paymentData.razorpayOrderId = razorpayOrderId;
        paymentData.razorpayPaymentId = razorpayPaymentId;
        paymentData.razorpaySignature = razorpaySignature;
      }
      const response = await bookingApi.completeBookingPayment(bookingId, paymentData);
      return { bookingId, ...response };
    } catch (error) {
      return rejectWithValue({ message: error.message });
    }
  }
);

export const fetchBookingStats = createAsyncThunk(
  "booking/fetchBookingStats",
  async (_, { rejectWithValue }) => {
    try {
      return await bookingApi.getBookingStats();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchAvailableSlots = createAsyncThunk(
  "booking/fetchAvailableSlots",
  async (date, { rejectWithValue }) => {
    try {
      return await bookingApi.getAvailableSlots(date);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchMinimumOrderValue = createAsyncThunk(
  "booking/fetchMinimumOrderValue",
  async (_, { rejectWithValue }) => {
    try {
      return await bookingApi.getMinimumOrderValue();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const bookingSlice = createSlice({
  name: "booking",
  initialState,
  reducers: {
    clearErrors: (state) => {
      state.error = null;
      state.createError = null;
      state.cancelError = null;
      state.rescheduleError = null;
      state.slotsError = null;
    },
    clearCurrentBooking: (state) => {
      state.currentBooking = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings = action.payload?.data?.bookings || action.payload?.bookings || [];
        state.pagination = action.payload?.data?.pagination || state.pagination;
        state.lastFetched = new Date().toISOString();
      })
      .addCase(fetchUserBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchBookingById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookingById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentBooking = action.payload?.data || action.payload;
      })
      .addCase(fetchBookingById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(createBooking.pending, (state) => {
        state.creating = true;
        state.createError = null;
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.creating = false;
        state.bookings.unshift(action.payload?.data || action.payload);
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.creating = false;
        state.createError = action.payload;
      })

      .addCase(cancelBooking.pending, (state) => {
        state.cancelling = true;
        state.cancelError = null;
      })
      .addCase(cancelBooking.fulfilled, (state, action) => {
        state.cancelling = false;
        const { bookingId, data } = action.payload;
        const index = state.bookings.findIndex((b) => b._id === bookingId);
        if (index !== -1 && data) state.bookings[index] = data;
        if (state.currentBooking?._id === bookingId && data) state.currentBooking = data;
      })
      .addCase(cancelBooking.rejected, (state, action) => {
        state.cancelling = false;
        state.cancelError = action.payload;
      })

      .addCase(rescheduleBooking.pending, (state) => {
        state.rescheduling = true;
        state.rescheduleError = null;
      })
      .addCase(rescheduleBooking.fulfilled, (state, action) => {
        state.rescheduling = false;
        const { bookingId, data } = action.payload;
        const index = state.bookings.findIndex((b) => b._id === bookingId);
        if (index !== -1 && data) state.bookings[index] = data;
        if (state.currentBooking?._id === bookingId && data) state.currentBooking = data;
      })
      .addCase(rescheduleBooking.rejected, (state, action) => {
        state.rescheduling = false;
        state.rescheduleError = action.payload;
      })

      .addCase(completeBookingPayment.pending, (state) => {
        state.completingPayment = true;
        state.paymentError = null;
      })
      .addCase(completeBookingPayment.fulfilled, (state, action) => {
        state.completingPayment = false;
        const { bookingId, data } = action.payload;
        const index = state.bookings.findIndex((b) => b._id === bookingId);
        if (index !== -1 && data) state.bookings[index] = data;
        if (state.currentBooking?._id === bookingId && data) state.currentBooking = data;
      })
      .addCase(completeBookingPayment.rejected, (state, action) => {
        state.completingPayment = false;
        state.paymentError = action.payload;
      })

      .addCase(fetchBookingStats.fulfilled, (state, action) => {
        const statsData = action.payload?.data || action.payload;
        if (statsData) {
          state.stats = {
            totalBookings: statsData.totalBookings ?? 0,
            totalSpent: statsData.totalSpent ?? 0,
            completedBookings: statsData.completedBookings ?? 0,
            cancelledBookings: statsData.cancelledBookings ?? 0,
            upcomingBookings: statsData.upcomingBookings ?? 0,
            statusBreakdown: statsData.statusBreakdown || {},
          };
        }
      })

      .addCase(fetchAvailableSlots.pending, (state) => {
        state.slotsLoading = true;
        state.slotsError = null;
      })
      .addCase(fetchAvailableSlots.fulfilled, (state, action) => {
        state.slotsLoading = false;
        state.availableSlots =
          action.payload?.data?.availableSlots || action.payload?.availableSlots || [];
      })
      .addCase(fetchAvailableSlots.rejected, (state, action) => {
        state.slotsLoading = false;
        state.slotsError = action.payload;
      })

      .addCase(fetchMinimumOrderValue.pending, (state) => {
        state.bookingConfig.loading = true;
        state.bookingConfig.error = null;
      })
      .addCase(fetchMinimumOrderValue.fulfilled, (state, action) => {
        state.bookingConfig.loading = false;
        const configData = action.payload?.data;
        if (configData?.value != null) {
          state.bookingConfig.minimumOrderValue = configData.value;
          state.bookingConfig.currency = configData.currency || "INR";
          state.bookingConfig.lastFetched = new Date().toISOString();
        }
      })
      .addCase(fetchMinimumOrderValue.rejected, (state, action) => {
        state.bookingConfig.loading = false;
        state.bookingConfig.error = action.payload;
        state.bookingConfig.minimumOrderValue = 799;
      });
  },
});

export const { clearErrors, clearCurrentBooking } = bookingSlice.actions;

export const selectBookings = (state) => state.booking.bookings;
export const selectCurrentBooking = (state) => state.booking.currentBooking;
export const selectBookingStats = (state) => state.booking.stats;
export const selectBookingLoading = (state) => state.booking.loading;
export const selectBookingCancelling = (state) => state.booking.cancelling;
export const selectBookingRescheduling = (state) => state.booking.rescheduling;
export const selectMinimumOrderValue = (state) =>
  state.booking?.bookingConfig?.minimumOrderValue ?? null;

export default bookingSlice.reducer;
