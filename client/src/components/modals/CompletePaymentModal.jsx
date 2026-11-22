import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import PaymentMethodSelector from "../common/PaymentMethodSelector";
import { usePayment } from "../../hooks/usePayment";
import { useSelector } from "react-redux";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import { calculateOrderPricing } from "../../utils/pricingUtils";

/**
 * CompletePaymentModal Component
 *
 * Modal for completing payment on a pending booking
 * Allows user to choose payment method (online or COD) and proceed to payment
 */
const CompletePaymentModal = ({
  isOpen,
  onClose,
  onConfirm,
  booking,
  isLoading = false,
  errorMessage = null,
}) => {
  // State for payment method
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [localError, setLocalError] = useState(null);

  // Get user data from Redux
  const user = useSelector((state) => state.auth.user);
  useBodyScrollLock(isOpen);

  // Use payment hook for Razorpay integration
  const { createPaymentOrder, isRazorpayLoaded } = usePayment();

  // Pre-select online when converting a COD booking to online payment
  useEffect(() => {
    if (isOpen && booking) {
      const isCodBooking =
        (booking?.paymentDetails?.paymentMethod || "cod") === "cod";
      setPaymentMethod(isCodBooking ? "online" : null);
      setLocalError(null);
    }
  }, [isOpen, booking]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Check if form is valid
  const isFormValid = () => {
    return paymentMethod === "online" || paymentMethod === "cod";
  };

  const toNumber = (value, fallback = 0) => {
    if (typeof value === "number" && !Number.isNaN(value)) return value;
    if (value === null || value === undefined) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const buildServicesPayload = () => {
    return (booking?.services || []).map((service, idx) => ({
      serviceId:
        service.serviceId ||
        service.id ||
        service._id ||
        `service-${service.name || "item"}-${idx}`,
      name: service.name,
      description:
        service.description ||
        `${service.name || "Service"} - Professional beauty service`,
      price: toNumber(service.price, 0),
      quantity: toNumber(service.quantity, 1),
      image: service.image || "/src/assets/images/default-service.jpg",
      category: service.category || "Regular",
      duration: service.duration || "60",
    }));
  };

  const normalizeAddressForPayment = (address = {}, fallbackAddress = {}) => {
    const safeString = (value) => {
      if (typeof value !== "string") return value || "";
      return value.trim();
    };

    const valueFrom = (key) => {
      if (address && address[key]) return address[key];
      if (fallbackAddress && fallbackAddress[key]) return fallbackAddress[key];
      return "";
    };

    const streetCandidates = [
      safeString(address?.street),
      safeString(address?.streetAreaName),
      safeString(address?.completeAddress),
      safeString(fallbackAddress?.street),
      safeString(fallbackAddress?.streetAreaName),
      safeString(fallbackAddress?.completeAddress),
    ].filter(Boolean);

    const city =
      safeString(valueFrom("city")) ||
      safeString(fallbackAddress?.address?.city) ||
      "";
    const state =
      safeString(valueFrom("state")) ||
      safeString(fallbackAddress?.address?.state) ||
      "Bihar";
    const pincode =
      safeString(valueFrom("pincode")) ||
      safeString(fallbackAddress?.address?.pincode) ||
      "";
    const country =
      safeString(valueFrom("country")) ||
      safeString(fallbackAddress?.address?.country) ||
      "India";

    return {
      street: streetCandidates[0] || "Address Line 1",
      streetAreaName:
        safeString(address?.streetAreaName) ||
        safeString(fallbackAddress?.streetAreaName) ||
        "",
      completeAddress:
        safeString(address?.completeAddress) ||
        safeString(fallbackAddress?.completeAddress) ||
        streetCandidates[0] ||
        "",
      houseFlatNumber:
        safeString(address?.houseFlatNumber) ||
        safeString(fallbackAddress?.houseFlatNumber) ||
        "",
      landmark:
        safeString(address?.landmark) ||
        safeString(fallbackAddress?.landmark) ||
        "",
      city: city || "",
      state: state || "",
      pincode: pincode || "",
      country,
      phone: safeString(valueFrom("phone")) || "",
    };
  };

  // Handle confirm payment
  const handleConfirm = async () => {
    console.log("💳 [DEBUG] handleConfirm called");
    console.log("💳 [DEBUG] Current paymentMethod state:", paymentMethod);
    console.log("💳 [DEBUG] isFormValid:", isFormValid());

    if (!isFormValid()) {
      console.log("❌ [DEBUG] Form not valid, returning");
      return;
    }

    console.log(
      "💳 Complete payment modal: Confirming with method:",
      paymentMethod
    );

    // For COD, just call onConfirm directly
    if (paymentMethod === "cod") {
      console.log("💳 COD payment selected - calling onConfirm directly");
      onConfirm(paymentMethod, null);
      return;
    }

    // For online payment, initiate Razorpay flow
    if (paymentMethod === "online") {
      console.log(
        "💳 Online payment selected - initiating Razorpay for existing booking"
      );

      try {
        setIsProcessingPayment(true);
        setLocalError(null);

        const servicesPayload = buildServicesPayload();
        const servicesSubtotal = servicesPayload.reduce(
          (sum, service) => sum + service.price * service.quantity,
          0
        );

        const pricingSubtotal = toNumber(
          booking?.pricing?.subtotal ?? booking?.subtotal,
          servicesSubtotal
        );
        const fallbackPricing = calculateOrderPricing(pricingSubtotal);
        const pricingTax = toNumber(
          booking?.pricing?.taxAmount ?? booking?.taxAmount,
          fallbackPricing.taxAmount
        );
        const pricingPlatformFee = toNumber(
          booking?.pricing?.platformFee ?? booking?.platformFee,
          fallbackPricing.platformFee
        );
        const pricingTotal = toNumber(
          booking?.pricing?.totalAmount ?? booking?.totalAmount,
          fallbackPricing.totalAmount
        );

        const pricingPayload = {
          subtotal: pricingSubtotal,
          platformFee: pricingPlatformFee,
          taxAmount: pricingTax,
          totalAmount: pricingTotal,
          currency: booking?.pricing?.currency || "INR",
        };

        const rawAddress =
          booking?.bookingDetails?.address ||
          booking?.booking?.address ||
          booking?.address ||
          {};
        const backupAddress = {
          address: booking?.bookingDetails?.address || {},
          streetAreaName: booking?.bookingDetails?.streetAreaName,
          completeAddress: booking?.bookingDetails?.completeAddress,
          city: booking?.bookingDetails?.city,
          state: booking?.bookingDetails?.state,
          pincode: booking?.bookingDetails?.pincode,
          country: booking?.bookingDetails?.country,
          phone: booking?.bookingDetails?.customerPhone,
        };
        const normalizedAddress = normalizeAddressForPayment(
          rawAddress,
          backupAddress
        );
        normalizedAddress.phone =
          normalizedAddress.phone ||
          booking?.bookingDetails?.customerPhone ||
          booking?.userId?.phoneNumber ||
          user?.phoneNumber ||
          "";

        const totalDuration = servicesPayload.reduce((total, service) => {
          const minutes = parseInt(service.duration, 10);
          const safeMinutes = Number.isFinite(minutes) ? minutes : 60;
          return total + safeMinutes * (service.quantity || 1);
        }, 0);

        const bookingPayload = {
          date:
            booking?.booking?.date ||
            booking?.bookingDetails?.date ||
            booking?.date ||
            null,
          slot:
            booking?.booking?.slot ||
            booking?.bookingDetails?.slot ||
            booking?.slot ||
            "",
          duration:
            booking?.booking?.duration ||
            booking?.bookingDetails?.duration ||
            totalDuration,
          address: normalizedAddress,
          notes:
            booking?.booking?.notes ||
            booking?.bookingDetails?.notes ||
            booking?.notes ||
            null,
        };

        const customerName =
          booking?.bookingDetails?.customerName ||
          booking?.userId?.name ||
          user?.name ||
          "Customer";
        const customerEmail =
          booking?.bookingDetails?.customerEmail ||
          booking?.userId?.email ||
          user?.email ||
          "";
        const customerPhone =
          booking?.bookingDetails?.customerPhone ||
          normalizedAddress?.phone ||
          booking?.userId?.phoneNumber ||
          user?.phoneNumber ||
          "";

        const bookingDetailsPayload = {
          ...bookingPayload,
          customerName,
          customerPhone,
          customerEmail,
        };

        const orderData = {
          bookingId: booking._id,
          orderNumber: booking.orderNumber,
          services: servicesPayload,
          pricing: pricingPayload,
          booking: bookingPayload,
          bookingDetails: bookingDetailsPayload,
          totalAmount: pricingPayload.totalAmount,
          subtotal: pricingPayload.subtotal,
          platformFee: pricingPayload.platformFee,
          taxAmount: pricingPayload.taxAmount,
          customer: {
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
          },
        };

        console.log(
          "💳 Creating Razorpay order for existing booking:",
          orderData
        );

        // Create Razorpay order
        const result = await createPaymentOrder(orderData);

        console.log("💳 Razorpay order created:", result);

        if (result.meta.requestStatus === "fulfilled" && result.payload?.data) {
          const { orderId, amount, currency, key } = result.payload.data;

          if (!orderId) {
            throw new Error("Invalid payment order. Please try again.");
          }

          if (!window.Razorpay) {
            throw new Error(
              isRazorpayLoaded
                ? "Payment gateway failed to load. Please refresh and try again."
                : "Payment gateway is still loading. Please wait a moment and try again."
            );
          }

          const razorpayKey =
            key || import.meta.env.VITE_RAZORPAY_KEY_ID;
          if (!razorpayKey) {
            throw new Error("Payment gateway is not configured.");
          }

          const razorpayOptions = {
            key: razorpayKey,
            amount,
            currency,
            name: "Wemakeover",
            description: `Payment for booking ${booking.orderNumber}`,
            order_id: orderId,
            prefill: {
              name: orderData.customer.name,
              email: orderData.customer.email,
              contact: orderData.customer.phone,
            },
            notes: {
              booking_date: bookingPayload.date,
              booking_slot: bookingPayload.slot,
              services_count: servicesPayload.length,
            },
            theme: {
              color: "#CC2B52",
            },
            handler: function (response) {
              console.log("✅ Razorpay payment successful:", response);

              const razorpayData = {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              };

              onConfirm(paymentMethod, razorpayData);
              setIsProcessingPayment(false);
            },
            modal: {
              ondismiss: function () {
                console.log("⚠️ Razorpay modal dismissed by user");
                setIsProcessingPayment(false);
              },
            },
          };

          console.log("💳 Opening Razorpay modal with options:", {
            ...razorpayOptions,
            key: "[REDACTED]",
          });

          const razorpay = new window.Razorpay(razorpayOptions);
          setTimeout(() => razorpay.open(), 100);
        } else {
          const message =
            result?.payload?.message ||
            result?.payload ||
            "Failed to create Razorpay order";
          throw new Error(
            typeof message === "string" ? message : "Failed to create Razorpay order"
          );
        }
      } catch (error) {
        console.error("❌ Razorpay payment initiation failed:", error);
        setIsProcessingPayment(false);
        setLocalError(
          error?.message || "Failed to start payment. Please try again."
        );
      }
    }
  };

  // Handle close
  const handleClose = () => {
    // Reset form
    setPaymentMethod(booking?.paymentDetails?.paymentMethod || null);
    onClose();
  };

  // Handle payment method change
  const handlePaymentMethodChange = (method) => {
    console.log(
      "💳 Complete payment modal: Payment method changed to:",
      method
    );
    setPaymentMethod(method);
  };

  // Calculate total amount
  const totalAmount =
    booking?.pricing?.totalAmount || booking?.totalAmount || 0;
  const currentPaymentMethod = booking?.paymentDetails?.paymentMethod || "cod";
  const showCodOption = currentPaymentMethod !== "cod";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-hidden overscroll-contain">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[min(90vh,640px)] flex flex-col font-['DM_Sans']">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-[#CC2B52]">
              Complete Payment
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Pay securely for your booking
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" data-modal-scroll>
          <div className="rounded-xl border border-gray-200 p-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-gray-500">Order</span>
              <span className="font-medium text-gray-900 text-right">
                {booking?.orderNumber || "—"}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-500">Date &amp; time</span>
              <span className="font-medium text-gray-900 text-right">
                {formatDate(booking?.bookingDetails?.date)},{" "}
                {booking?.bookingDetails?.slot}
              </span>
            </div>
            <div className="flex justify-between gap-3 pt-2 border-t border-gray-100">
              <span className="text-gray-500">Total</span>
              <span className="font-semibold text-[#CC2B52] text-base">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>

          {booking?.services?.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Services</p>
              {booking.services.map((service, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm py-1.5"
                >
                  <span className="text-gray-800 truncate pr-3">
                    {service.name}{" "}
                    <span className="text-gray-400">×{service.quantity}</span>
                  </span>
                  <span className="font-medium text-gray-900 shrink-0">
                    {formatCurrency(service.price * service.quantity)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {currentPaymentMethod === "cod" && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              You booked with Pay After Service. Switch to online payment below
              if you prefer to pay now.
            </p>
          )}

          {(errorMessage || localError) && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-sm text-red-700">{errorMessage || localError}</p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Payment method
            </p>
            <PaymentMethodSelector
              selectedMethod={paymentMethod}
              onMethodChange={handlePaymentMethodChange}
              showOnline={true}
              showCOD={showCodOption}
              disabled={isLoading || isProcessingPayment}
            />
          </div>

          {paymentMethod === "online" && (
            <p className="text-xs text-gray-500">
              You&apos;ll be redirected to Razorpay to pay with UPI, cards, or
              net banking.
            </p>
          )}
        </div>

        {/* Sticky footer — always visible */}
        <div className="shrink-0 border-t border-gray-100 px-5 py-4 flex gap-3 bg-white rounded-b-2xl">
          <button
            onClick={handleClose}
            disabled={isLoading || isProcessingPayment}
            className="flex-1 h-11 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || isProcessingPayment || !isFormValid()}
            className="flex-1 h-11 bg-[#CC2B52] text-white rounded-xl text-sm font-semibold hover:bg-[#B02547] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading || isProcessingPayment ? (
              <span>Processing...</span>
            ) : paymentMethod === "online" ? (
              `Pay ${formatCurrency(totalAmount)}`
            ) : paymentMethod === "cod" ? (
              "Confirm"
            ) : (
              "Select method"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

CompletePaymentModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  booking: PropTypes.shape({
    _id: PropTypes.string,
    orderNumber: PropTypes.string,
    services: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        price: PropTypes.number,
        quantity: PropTypes.number,
        description: PropTypes.string,
        image: PropTypes.string,
        category: PropTypes.string,
        duration: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      })
    ),
    bookingDetails: PropTypes.shape({
      date: PropTypes.string,
      slot: PropTypes.string,
      address: PropTypes.object,
      duration: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      customerName: PropTypes.string,
      customerPhone: PropTypes.string,
      customerEmail: PropTypes.string,
      notes: PropTypes.string,
      streetAreaName: PropTypes.string,
      completeAddress: PropTypes.string,
      city: PropTypes.string,
      state: PropTypes.string,
      pincode: PropTypes.string,
      country: PropTypes.string,
    }),
    booking: PropTypes.shape({
      date: PropTypes.string,
      slot: PropTypes.string,
      duration: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      address: PropTypes.object,
      notes: PropTypes.string,
    }),
    date: PropTypes.string,
    slot: PropTypes.string,
    notes: PropTypes.string,
    address: PropTypes.object,
    pricing: PropTypes.shape({
      subtotal: PropTypes.number,
      taxAmount: PropTypes.number,
      totalAmount: PropTypes.number,
      currency: PropTypes.string,
    }),
    totalAmount: PropTypes.number,
    subtotal: PropTypes.number,
    taxAmount: PropTypes.number,
    paymentDetails: PropTypes.shape({
      paymentMethod: PropTypes.string,
    }),
    paymentStatus: PropTypes.string,
    userId: PropTypes.shape({
      name: PropTypes.string,
      email: PropTypes.string,
      phoneNumber: PropTypes.string,
    }),
  }),
  isLoading: PropTypes.bool,
  errorMessage: PropTypes.string,
};

export default CompletePaymentModal;
