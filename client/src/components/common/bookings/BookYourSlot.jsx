import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Calendar } from "lucide-react";
import { isSlotDisabled } from "../../../utils/slotUtils";
import { getLocalDateString, isLocalToday } from "../../../utils/dateUtils";
import { bookingApi } from "../../../features/booking/bookingApi";

/**
 * BookYourSlot Component
 *
 * Displays date and time slot selection with 1 hour buffer logic
 * Matches the exact UI design from the image
 */
const BookYourSlot = ({
  selectedDate,
  onDateChange,
  selectedSlot,
  onSlotSelect,
  excludeBookingId = null,
  availableSlots = [],
  availableDates = [],
  unavailableDates = [],
}) => {
  console.log("🔍 [CRITICAL DEBUG] BookYourSlot component rendered with:", {
    selectedDate,
    selectedSlot,
    availableSlots: availableSlots.length,
    componentVersion: "SENIOR_DEBUG_v1",
    timestamp: new Date().toISOString(),
  });

  // Force a very obvious log to test if component is loading new code
  console.log(
    "🚨🚨🚨 BOOKYOURSLOT COMPONENT IS LOADING NEW CODE - SENIOR DEBUG ACTIVE 🚨🚨🚨"
  );

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateType, setSelectedDateType] = useState("today");
  const [fullyBookedSlots, setFullyBookedSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState(null);

  // Time slots configuration (9 AM to 5 PM, 1-hour intervals)
  const allTimeSlots = [
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

  // Get today's date string
  const getTodayString = () => {
    return currentDate.toLocaleDateString("en-IN", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  // Get tomorrow's date string
  const getTomorrowString = () => {
    const tomorrow = new Date(currentDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toLocaleDateString("en-IN", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  // Check if a slot should be disabled using utility function
  const isSlotDisabledForToday = (slotTime) => {
    if (!isLocalToday(selectedDate)) {
      return false;
    }

    return isSlotDisabled(slotTime, currentDate, selectedDate);
  };

  // Handle date type selection
  const handleDateTypeSelect = (type) => {
    console.log("🔍 [SENIOR DEBUG] BookYourSlot - Date type selected:", type);
    console.log("🔍 [SENIOR DEBUG] Current state before change:", {
      selectedDateType,
      selectedDate,
      selectedSlot,
      currentDate: currentDate.toISOString(),
    });

    setSelectedDateType(type);

    const today = new Date();
    let targetDate;

    if (type === "today") {
      // Create today's date without time (same format as calendar picker)
      targetDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
    } else if (type === "tomorrow") {
      // Create tomorrow's date without time
      targetDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1
      );
    }

    if (targetDate && onDateChange) {
      const dateString = getLocalDateString(targetDate);
      console.log(
        "🔍 [SENIOR DEBUG] BookYourSlot - About to call onDateChange:",
        {
          type,
          targetDate: targetDate.toISOString(),
          dateString,
          selectedDateType: type,
          hasTime:
            targetDate.getHours() !== 0 ||
            targetDate.getMinutes() !== 0 ||
            targetDate.getSeconds() !== 0,
          onDateChangeExists: !!onDateChange,
          onDateChangeType: typeof onDateChange,
        }
      );

      // Call the parent callback
      onDateChange(dateString);

      console.log(
        "🔍 [SENIOR DEBUG] BookYourSlot - onDateChange called successfully"
      );
    } else {
      console.error(
        "🔍 [SENIOR DEBUG] BookYourSlot - Cannot call onDateChange:",
        {
          hasTargetDate: !!targetDate,
          hasOnDateChange: !!onDateChange,
          targetDate,
          onDateChange,
        }
      );
    }
  };

  // Handle custom date picker
  const handleCustomDateChange = (event) => {
    const dateValue = event.target.value;
    if (dateValue && onDateChange) {
      onDateChange(dateValue);
      setSelectedDateType("custom");
    }
  };

  // Sync parent date to local calendar date on mount (fixes UTC mismatch on refresh)
  useEffect(() => {
    const localToday = getLocalDateString();
    if (onDateChange && selectedDateType === "today" && selectedDate !== localToday) {
      onDateChange(localToday);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update current time every minute for real-time slot updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Fetch booked slots from server when date changes
  useEffect(() => {
    if (!selectedDate) {
      setFullyBookedSlots([]);
      setSlotsError(null);
      return;
    }

    let cancelled = false;

    const fetchSlotAvailability = async () => {
      setSlotsLoading(true);
      setSlotsError(null);
      try {
        const response = await bookingApi.getAvailableSlots(
          selectedDate,
          excludeBookingId
        );

        if (!cancelled && response?.success) {
          setFullyBookedSlots(response.data?.fullyBookedSlots || []);
        }
      } catch (error) {
        console.error("Failed to fetch slot availability:", error);
        if (!cancelled) {
          setSlotsError(
            error.message || "Could not load slot availability. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setSlotsLoading(false);
        }
      }
    };

    fetchSlotAvailability();

    return () => {
      cancelled = true;
    };
  }, [selectedDate, excludeBookingId]);

  return (
    <div className="w-full">
      {/* Title */}
      <h3 className="text-lg font-bold text-[#CC2B52] mb-4">Book Your Slot</h3>

      {/* Date Selection */}
      <div className="mb-6">
        <div className="flex gap-3 mb-4">
          {/* Today Button */}
          <button
            onClick={() => handleDateTypeSelect("today")}
            className={`px-4 py-2 text-[12px] md:text-[14px] lg:text-[14px] font-medium rounded-lg border-2 transition-all duration-200 ${
              selectedDateType === "today"
                ? "bg-[#CC2B52] border-[#CC2B52] text-white"
                : "bg-white border-[#CC2B52] text-[#CC2B52] hover:bg-[#CC2B52] hover:text-white"
            }`}
          >
            Today
          </button>

          {/* Tomorrow Button */}
          <button
            onClick={() => handleDateTypeSelect("tomorrow")}
            className={`px-4 py-2 text-[12px] md:text-[14px] lg:text-[14px] font-medium rounded-lg border-2 transition-all duration-200 ${
              selectedDateType === "tomorrow"
                ? "bg-[#CC2B52] border-[#CC2B52] text-white"
                : "bg-white border-[#CC2B52] text-[#CC2B52] hover:bg-[#CC2B52] hover:text-white"
            }`}
          >
            Tomorrow
          </button>

          {/* Pick Your Date Button */}
          <button
            onClick={() => handleDateTypeSelect("custom")}
            className={`px-4 py-2 text-[12px] md:text-[14px] lg:text-[14px] font-medium rounded-lg border-2 transition-all duration-200 flex items-center gap-2 ${
              selectedDateType === "custom"
                ? "bg-[#CC2B52] border-[#CC2B52] text-white"
                : "bg-white border-[#CC2B52] text-[#CC2B52] hover:bg-[#CC2B52] hover:text-white"
            }`}
          >
            <Calendar className="w-[14px] h-[14px] md:w-[16px] md:h-[16px] lg:w-[16px] lg:h-[16px]" />
            Custom Date
          </button>
        </div>

        {/* Custom Date Picker (hidden by default, shown when "Pick your date" is selected) */}
        {selectedDateType === "custom" && (
          <div className="mb-4">
            <input
              type="date"
              min={getLocalDateString()}
              onChange={handleCustomDateChange}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CC2B52] focus:border-transparent"
            />
          </div>
        )}

        {/* Date Display */}
        {(selectedDateType === "today" || selectedDateType === "tomorrow") && (
          <div className="text-sm text-gray-600">
            {selectedDateType === "today" && getTodayString()}
            {selectedDateType === "tomorrow" && getTomorrowString()}
          </div>
        )}
      </div>

      {/* Time Slots Grid */}
      <div className="mb-4">
        <div className="grid grid-cols-3 gap-3">
          {allTimeSlots.map((slot) => {
            const isPastBuffer = isSlotDisabledForToday(slot);
            const isFullyBooked = fullyBookedSlots.includes(slot);
            const isDisabled = isPastBuffer || isFullyBooked;
            const isSelected = selectedSlot === slot;

            return (
              <button
                key={slot}
                onClick={() =>
                  !isDisabled && onSlotSelect && onSlotSelect(slot)
                }
                disabled={isDisabled || slotsLoading}
                title={
                  isFullyBooked
                    ? "This slot is fully booked"
                    : isPastBuffer
                    ? "Requires at least 1 hour advance booking"
                    : undefined
                }
                className={`w-full min-h-[52px] h-[52px] px-3 py-2 rounded-lg border-2 transition-all duration-200 text-sm font-medium flex flex-col items-center justify-center ${
                  isSelected
                    ? "bg-[#CC2B52] border-[#CC2B52] text-white"
                    : isDisabled
                    ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-white border-[#CC2B52] text-[#CC2B52] hover:bg-[#CC2B52] hover:text-white"
                }`}
              >
                <span className="leading-tight">{slot}</span>
                <span
                  className={`block text-[10px] font-normal leading-none h-3 mt-0.5 ${
                    isFullyBooked ? "visible" : "invisible"
                  }`}
                  aria-hidden={!isFullyBooked}
                >
                  Full
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slot Status Information */}
      <div className="text-xs text-gray-500">
        {slotsLoading && selectedDate && (
          <p>Checking slot availability...</p>
        )}
        {!slotsLoading && slotsError && (
          <p className="text-red-600">{slotsError}</p>
        )}
        {!slotsLoading && !slotsError && isLocalToday(selectedDate) && (
          <p className="text-[#CC2B52] font-bold">
            NOTE : Available slots require at least 1 hour advance booking time.
          </p>
        )}
        {!slotsLoading && !slotsError && selectedDate && !isLocalToday(selectedDate) && (
          <p>Greyed out slots are already booked.</p>
        )}
      </div>
    </div>
  );
};

BookYourSlot.propTypes = {
  selectedDate: PropTypes.string,
  onDateChange: PropTypes.func,
  selectedSlot: PropTypes.string,
  onSlotSelect: PropTypes.func,
  excludeBookingId: PropTypes.string,
  availableSlots: PropTypes.array,
  availableDates: PropTypes.array,
  unavailableDates: PropTypes.array,
};

export default BookYourSlot;
