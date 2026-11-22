import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  createPaymentOrder,
  verifyPayment,
  createCODOrder,
  getPaymentHistory,
  getPaymentDetails,
  cancelPaymentOrder,
} from "./paymentApi";
import { completeBookingPayment } from "../booking/bookingSlice";

const validateOrder = (orderData) => {
  if (!orderData.services || !Array.isArray(orderData.services) || orderData.services.length === 0) {
    throw new Error("Services are required");
  }
  const bookingData = orderData.bookingDetails || orderData.booking;
  if (!bookingData) throw new Error("Booking details are required");
  if (!orderData.totalAmount || orderData.totalAmount <= 0) {
    throw new Error("Valid total amount is required");
  }
};

export const createPaymentOrderThunk = createAsyncThunk(
  "payment/createOrder",
  async (orderData, { rejectWithValue }) => {
    try {
      validateOrder(orderData);
      return await createPaymentOrder({ ...orderData, timestamp: new Date().toISOString() });
    } catch (error) {
      return rejectWithValue(error.message || "Failed to create payment order");
    }
  }
);

export const verifyPaymentThunk = createAsyncThunk(
  "payment/verifyPayment",
  async (paymentData, { rejectWithValue }) => {
    try {
      if (!paymentData.orderId || !paymentData.paymentId || !paymentData.signature) {
        throw new Error("Order ID, Payment ID, and Signature are required");
      }
      return await verifyPayment(paymentData);
    } catch (error) {
      return rejectWithValue(error.message || "Payment verification failed");
    }
  }
);

export const createCODOrderThunk = createAsyncThunk(
  "payment/createCOD",
  async (orderData, { rejectWithValue }) => {
    try {
      validateOrder(orderData);
      return await createCODOrder({ ...orderData, timestamp: new Date().toISOString() });
    } catch (error) {
      return rejectWithValue(error.message || "Failed to create COD order");
    }
  }
);

export const getPaymentHistoryThunk = createAsyncThunk(
  "payment/getHistory",
  async (params = {}, { rejectWithValue }) => {
    try {
      return await getPaymentHistory({ page: 1, limit: 10, ...params });
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch payment history");
    }
  }
);

export const getPaymentDetailsThunk = createAsyncThunk(
  "payment/getDetails",
  async (paymentId, { rejectWithValue }) => {
    try {
      if (!paymentId) throw new Error("Payment ID is required");
      return await getPaymentDetails(paymentId);
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch payment details");
    }
  }
);

export const cancelPaymentOrderThunk = createAsyncThunk(
  "payment/cancelOrder",
  async (orderId, { rejectWithValue }) => {
    try {
      if (!orderId) throw new Error("Order ID is required");
      return await cancelPaymentOrder(orderId);
    } catch (error) {
      return rejectWithValue(error.message || "Failed to cancel payment order");
    }
  }
);

export const completeCODFlowThunk = createAsyncThunk(
  "payment/completeCODFlow",
  async (orderData, { rejectWithValue, dispatch }) => {
    try {
      const codResponse = await dispatch(createCODOrderThunk(orderData));
      if (codResponse.type.endsWith("/rejected")) {
        const err = codResponse.payload;
        return rejectWithValue(
          (typeof err === "string" && err) || err?.message || err?.error || "Failed to create COD order"
        );
      }

      const payload = codResponse.payload;
      if (payload?.success === false) {
        return rejectWithValue(payload.message || payload.error || "Failed to create COD order");
      }

      const data = payload?.data || payload || {};
      const toId = (v) => {
        if (v == null || v === "") return null;
        if (typeof v === "object") return String(v._id || v.id || v);
        return String(v);
      };
      const orderId = toId(data.orderId || data.id || data._id);
      const bookingId = toId(data.bookingId);
      const orderNumber = toId(data.orderNumber);

      // Confirmed COD is success if any identifier exists or API said success.
      if (!(orderId || bookingId || orderNumber || payload?.success === true)) {
        return rejectWithValue(payload?.message || "COD booking was not confirmed");
      }

      return {
        success: true,
        message: payload?.message || "COD order created successfully",
        data: {
          ...data,
          orderId: orderId || bookingId || orderNumber,
          bookingId,
          orderNumber,
          paymentMethod: "cod",
          status: data.status || "confirmed",
        },
      };
    } catch (error) {
      return rejectWithValue(error.message || "COD order creation failed");
    }
  }
);

/**
 * Online payment flow using the native Razorpay SDK (react-native-razorpay).
 * Works in a dev/EAS build; in Expo Go the native module is unavailable and a
 * friendly error is returned.
 *
 * @param {object} payload - orderData directly, or { orderData, preferredMethod }
 * preferredMethod: "upi" | "card" | "google_pay" | "phone_pe" | "bhim"
 */
/**
 * Pay for an existing unpaid booking (My Bookings → Pay Now).
 * Online: Razorpay order → SDK → completeBookingPayment (not verifyPayment).
 */
export const completeExistingBookingPaymentFlowThunk = createAsyncThunk(
  "payment/completeExistingBookingPayment",
  async ({ orderData, preferredMethod }, { rejectWithValue, dispatch }) => {
    try {
      const bookingId = orderData?.bookingId;
      if (!bookingId) {
        return rejectWithValue("Booking reference missing");
      }

      const isCod = preferredMethod === "cod";

      if (isCod) {
        const result = await dispatch(
          completeBookingPayment({ bookingId, paymentMethod: "cod" })
        );
        if (result.meta?.requestStatus === "rejected") {
          return rejectWithValue(
            result.payload?.message || "Could not update payment method"
          );
        }
        const data = result.payload?.data || result.payload || {};
        return {
          success: true,
          data: {
            bookingId,
            orderNumber: data.orderNumber || orderData.orderNumber,
            orderId: bookingId,
            paymentMethod: "cod",
            status: data.status || "confirmed",
          },
        };
      }

      let RazorpayCheckout;
      try {
        RazorpayCheckout = require("react-native-razorpay").default;
      } catch {
        RazorpayCheckout = null;
      }
      if (!RazorpayCheckout || typeof RazorpayCheckout.open !== "function") {
        throw new Error(
          "Online payment needs the production build. Please use Pay After Service for now."
        );
      }

      const bookingData = orderData.bookingDetails || orderData.booking;
      const orderResponse = await dispatch(createPaymentOrderThunk(orderData));
      if (orderResponse.type.endsWith("/rejected")) throw new Error(orderResponse.payload);

      const { orderId, amount, currency, key } = orderResponse.payload.data;

      const upiPackages = {
        google_pay: "com.google.android.apps.nbu.paisa.user",
        phone_pe: "com.phonepe.app",
        bhim: "in.org.npci.upiapp",
      };

      const isCard = preferredMethod === "card";
      const isUpiApp = Boolean(upiPackages[preferredMethod]);

      const options = {
        key,
        amount,
        currency: currency || "INR",
        name: "Wemakeover",
        description: `Payment for booking ${orderData.orderNumber || ""}`.trim(),
        order_id: orderId,
        prefill: {
          name: bookingData?.customerName || bookingData?.address?.name || "Customer",
          email: bookingData?.customerEmail || bookingData?.address?.email || "",
          contact: bookingData?.customerPhone || bookingData?.address?.phone || "",
          method: isCard ? "card" : "upi",
        },
        theme: { color: "#CC2B52" },
      };

      if (!isCard) {
        options.method = { netbanking: 0, card: 0, upi: 1, wallet: 0 };
        if (isUpiApp) options.upi_app_package_name = upiPackages[preferredMethod];
      } else {
        options.method = { netbanking: 0, card: 1, upi: 0, wallet: 0 };
      }

      const rzpResponse = await RazorpayCheckout.open(options);

      const completeResult = await dispatch(
        completeBookingPayment({
          bookingId,
          paymentMethod: "online",
          razorpayOrderId: rzpResponse.razorpay_order_id,
          razorpayPaymentId: rzpResponse.razorpay_payment_id,
          razorpaySignature: rzpResponse.razorpay_signature,
        })
      );

      if (completeResult.meta?.requestStatus === "rejected") {
        throw new Error(completeResult.payload?.message || "Payment confirmation failed");
      }

      const data = completeResult.payload?.data || completeResult.payload || {};
      return {
        success: true,
        data: {
          bookingId,
          orderNumber: data.orderNumber || orderData.orderNumber,
          orderId: bookingId,
          paymentMethod: "online",
          status: data.status || "confirmed",
        },
      };
    } catch (error) {
      let message = "Payment failed or was cancelled";
      if (typeof error === "string") {
        message = error;
      } else if (error?.description && typeof error.description === "string") {
        message = error.description;
      } else if (error?.error?.description && typeof error.error.description === "string") {
        message = error.error.description;
      } else if (error?.message && typeof error.message === "string") {
        message = error.message;
      } else if (error?.code) {
        message = String(error.code);
      }
      const code = error?.code || error?.error?.code || error?.reason || "";
      return rejectWithValue({ message, code: String(code || "") });
    }
  }
);

export const completePaymentFlowThunk = createAsyncThunk(
  "payment/completeFlow",
  async (payload, { rejectWithValue, dispatch }) => {
    try {
      const orderData = payload?.orderData || payload;
      const preferredMethod = payload?.preferredMethod || "upi";

      let RazorpayCheckout;
      try {
        // Lazy require so the bundle/Expo Go doesn't crash when native module is absent.
        RazorpayCheckout = require("react-native-razorpay").default;
      } catch {
        RazorpayCheckout = null;
      }
      if (!RazorpayCheckout || typeof RazorpayCheckout.open !== "function") {
        throw new Error(
          "Online payment needs the production build. Please use Pay After Service for now."
        );
      }

      const bookingData = orderData.bookingDetails || orderData.booking;

      const orderResponse = await dispatch(createPaymentOrderThunk(orderData));
      if (orderResponse.type.endsWith("/rejected")) throw new Error(orderResponse.payload);

      const { orderId, amount, currency, key } = orderResponse.payload.data;

      const upiPackages = {
        google_pay: "com.google.android.apps.nbu.paisa.user",
        phone_pe: "com.phonepe.app",
        bhim: "in.org.npci.upiapp",
      };

      const isCard = preferredMethod === "card";
      const isUpiApp = Boolean(upiPackages[preferredMethod]);

      const options = {
        key,
        amount,
        currency: currency || "INR",
        name: "Wemakeover",
        description: "Beauty Services Booking",
        order_id: orderId,
        prefill: {
          name: bookingData?.address?.name || bookingData?.customerName || "Customer",
          email: bookingData?.address?.email || "",
          contact: bookingData?.address?.phone || bookingData?.customerPhone || "",
          method: isCard ? "card" : "upi",
        },
        theme: { color: "#CC2B52" },
      };

      // Prefer UPI intent so Android can open GPay / PhonePe / BHIM directly.
      if (!isCard) {
        options.method = {
          netbanking: 0,
          card: 0,
          upi: 1,
          wallet: 0,
        };
        if (isUpiApp) {
          options.upi_app_package_name = upiPackages[preferredMethod];
        }
      } else {
        options.method = {
          netbanking: 0,
          card: 1,
          upi: 0,
          wallet: 0,
        };
      }

      const rzpResponse = await RazorpayCheckout.open(options);

      const verificationData = {
        orderId: rzpResponse.razorpay_order_id,
        paymentId: rzpResponse.razorpay_payment_id,
        signature: rzpResponse.razorpay_signature,
        orderNumber: orderData.orderNumber,
        services: (orderData.services || []).map((service) => ({
          serviceId: service.serviceId || service.id,
          name: service.name,
          description: service.description || `${service.name} - Professional beauty service`,
          price: service.price,
          quantity: service.quantity,
          image: service.image || "",
          category: service.category || "Regular",
          duration: service.duration || 60,
        })),
      };

      const verificationResponse = await dispatch(verifyPaymentThunk(verificationData));
      if (verificationResponse.type.endsWith("/rejected")) {
        throw new Error(verificationResponse.payload);
      }
      return verificationResponse.payload;
    } catch (error) {
      // Razorpay often returns an object — never pass raw JSON to the UI.
      let message = "Payment failed or was cancelled";
      if (typeof error === "string") {
        message = error;
      } else if (error?.description && typeof error.description === "string") {
        message = error.description;
      } else if (error?.error?.description && typeof error.error.description === "string") {
        message = error.error.description;
      } else if (error?.message && typeof error.message === "string") {
        message = error.message;
      } else if (error?.code) {
        message = String(error.code);
      }
      const code = error?.code || error?.error?.code || error?.reason || error?.error?.reason || "";
      return rejectWithValue({ message, code: String(code || "") });
    }
  }
);
