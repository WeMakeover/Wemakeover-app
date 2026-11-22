import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import PropTypes from "prop-types";
import toast from "react-hot-toast";
import CompletePaymentModal from "../../modals/CompletePaymentModal";
import { completeBookingPayment } from "../../../features/booking/bookingSlice";
import orderSuccessSvg from "../../../assets/Order/orderSuccess.svg";

const mapOrderDataToBooking = (orderData) => {
  const backend = orderData?.backendData || {};
  const bookingId = backend.bookingId || backend.data?.bookingId || null;

  return {
    _id: bookingId,
    orderNumber: orderData.orderNumber || backend.orderNumber || null,
    services: orderData.services || [],
    bookingDetails: {
      date: orderData.bookingDetails?.date || orderData.appointmentDate,
      slot: orderData.bookingDetails?.slot || orderData.appointmentSlot,
      address: orderData.bookingDetails?.address,
    },
    pricing: {
      subtotal: orderData.subtotal,
      taxAmount: orderData.taxAmount,
      totalAmount: orderData.totalAmount,
    },
    totalAmount: orderData.totalAmount,
    subtotal: orderData.subtotal,
    taxAmount: orderData.taxAmount,
    paymentStatus: "pending",
    paymentDetails: { paymentMethod: "cod" },
  };
};

/**
 * OrderSuccess Component
 *
 * Displays a success message after order completion with order details
 * Follows the Figma design for the success screen
 */
const OrderSuccess = ({ orderData: propOrderData, onGoHome }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isCompletingPayment, setIsCompletingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  // Get orderData from navigation state or props (for backward compatibility)
  const orderData = location.state?.orderData || propOrderData;
  const paymentBooking = useMemo(
    () => (orderData ? mapOrderDataToBooking(orderData) : null),
    [orderData]
  );

  // If no order data is available, redirect to home
  if (!orderData) {
    console.warn(
      "⚠️ OrderSuccess: No order data found. Redirecting to home..."
    );
    if (onGoHome) {
      onGoHome();
    } else {
      navigate("/", { replace: true });
    }
    return null;
  }

  // Format price to INR currency format
  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Format date to readable format
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
    });
  };

  // Format time to readable format
  const formatTime = (timeString) => {
    const date = new Date(`2000-01-01T${timeString}`);
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleViewBookingDetails = () => {
    navigate("/my-bookings");
  };

  const handleContinueBrowsing = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      navigate("/", { replace: true });
    }
  };

  const handlePayNow = () => {
    if (!paymentBooking?._id) {
      toast.error(
        "Unable to find your booking reference. Please pay from My Bookings."
      );
      return;
    }

    setPaymentError(null);
    setShowPaymentModal(true);
  };

  const handleCloseModal = () => {
    setShowPaymentModal(false);
    setPaymentError(null);
  };

  const handleConfirmPayment = async (paymentMethod, razorpayData = null) => {
    const bookingId = paymentBooking?._id;

    if (!bookingId) {
      setPaymentError(
        "Booking reference not found. Please pay from My Bookings."
      );
      return;
    }

    setIsCompletingPayment(true);
    setPaymentError(null);

    try {
      const result = await dispatch(
        completeBookingPayment({
          bookingId,
          paymentMethod,
          razorpayOrderId: razorpayData?.razorpayOrderId,
          razorpayPaymentId: razorpayData?.razorpayPaymentId,
          razorpaySignature: razorpayData?.razorpaySignature,
        })
      );

      if (
        result.meta.requestStatus === "fulfilled" &&
        result.payload?.success
      ) {
        setShowPaymentModal(false);
        setPaymentCompleted(true);
        toast.success("Payment completed successfully!");
        return;
      }

      const message =
        result.payload?.message ||
        result.error?.message ||
        "Failed to complete payment";
      setPaymentError(message);
    } catch (error) {
      setPaymentError(error.message || "Failed to complete payment");
    } finally {
      setIsCompletingPayment(false);
    }
  };

  const showPayNowButton =
    orderData.paymentMethod === "cash" && !paymentCompleted;

  return (
    <div className="min-h-screen bg-white flex justify-center items-center pt-16 pb-8">
      {/* Main Content */}
      <div className="w-full max-w-[610px] mx-auto flex flex-col items-center py-8 sm:py-12 px-4 sm:px-6 border border-dashed border-blue-300 rounded-lg">
        {/* Header */}
        <h1 className="font-['DM_Sans'] font-semibold text-xl sm:text-xl md:text-2xl lg:text-[30px] leading-[100%] tracking-[0.01em] text-black mb-6 sm:mb-8 text-center">
          Thanks For Booking With Makeover 👋
        </h1>

        {/* Animation/Image */}
        <div className="w-28 h-24 sm:w-36 sm:h-32 md:w-40 md:h-40 lg:w-[160px] lg:h-[150px] flex items-center justify-center mb-6 sm:mb-8">
          <img
            src={orderSuccessSvg}
            alt="Success Animation"
            className="w-full h-full object-contain rounded-full"
            loading="lazy"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "https://via.placeholder.com/150";
            }}
          />
        </div>

        {/* Booking Message */}
        <div className="w-full text-center mb-8 sm:mb-12">
          <p className="font-['DM_Sans'] font-semibold text-sm sm:text-base md:text-[16px] leading-[200%] text-black px-2">
            Your booking is successful placed for selected services on{" "}
            {formatDate(orderData.appointmentDate)},{" "}
            {formatTime(orderData.appointmentTime)}.
            <br />
            {paymentCompleted ? (
              <>
                Payment of {formatPrice(orderData.totalAmount)} has been
                received. Thank you!
              </>
            ) : (
              <>
                You can pay {formatPrice(orderData.totalAmount)} now or after
                the service is complete
              </>
            )}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 sm:gap-4 w-full max-w-[319px] mb-6 sm:mb-8">
          <button
            onClick={handleContinueBrowsing}
            className="w-full h-12 sm:h-[52px] border border-[#CC2B52] rounded-xl flex justify-center items-center hover:bg-[#CC2B52] hover:text-white transition-colors duration-200"
          >
            <span className="font-['DM_Sans'] font-normal text-base sm:text-lg md:text-[20px] leading-[100%] tracking-[0.01em] text-[#CC2B52] hover:text-white">
              Continue Browsing
            </span>
          </button>

          {showPayNowButton && (
            <button
              onClick={handlePayNow}
              className="w-full h-12 sm:h-[52px] bg-[#CC2B52] rounded-xl flex justify-center items-center hover:bg-[#B02547] transition-colors duration-200"
            >
              <span className="font-['DM_Sans'] font-normal text-base sm:text-lg md:text-[20px] leading-[100%] tracking-[0.01em] text-white">
                Pay {formatPrice(orderData.totalAmount)} Now
              </span>
            </button>
          )}
        </div>

        {/* Booking Details Link */}
        <div className="text-center">
          <p className="font-['Roboto'] font-normal text-sm sm:text-base md:text-[16px] leading-[160%] tracking-[0.01em] text-[#313957] px-2">
            View booking details here{" "}
            <span
              className="text-[#CC2B52] cursor-pointer underline hover:no-underline transition-all duration-200"
              onClick={handleViewBookingDetails}
            >
              Booking Details
            </span>
          </p>
        </div>

        {/* Copyright */}
        <div className="mt-8 sm:mt-12">
          <p className="font-['Roboto'] font-normal text-xs sm:text-[12px] leading-[100%] tracking-[0.01em] text-[#959CB6]">
            © MAKEOVER 2025 ALL RIGHTS RESERVED
          </p>
        </div>
      </div>

      <CompletePaymentModal
        isOpen={showPaymentModal}
        onClose={handleCloseModal}
        onConfirm={handleConfirmPayment}
        booking={paymentBooking}
        isLoading={isCompletingPayment}
        errorMessage={paymentError}
      />
    </div>
  );
};

OrderSuccess.propTypes = {
  orderData: PropTypes.shape({
    orderId: PropTypes.string,
    orderNumber: PropTypes.string,
    appointmentDate: PropTypes.string,
    appointmentTime: PropTypes.string,
    appointmentSlot: PropTypes.string,
    totalAmount: PropTypes.number,
    subtotal: PropTypes.number,
    taxAmount: PropTypes.number,
    paymentMethod: PropTypes.string,
    bookingDetails: PropTypes.object,
    backendData: PropTypes.object,
    services: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        description: PropTypes.string,
        price: PropTypes.number.isRequired,
        quantity: PropTypes.number.isRequired,
      })
    ),
  }),
  onGoHome: PropTypes.func,
};

export default OrderSuccess;
