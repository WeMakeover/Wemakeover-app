import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import PropTypes from "prop-types";
import { getLocalDateString } from "../../../utils/dateUtils";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatDisplayDate = (dateString) => {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const AdminBookingsDatePicker = ({ value = "", onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const containerRef = useRef(null);

  useEffect(() => {
    if (!value) return;
    const [year, month] = value.split("-").map(Number);
    setViewMonth(month - 1);
    setViewYear(year);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((year) => year - 1);
    } else {
      setViewMonth((month) => month - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((year) => year + 1);
    } else {
      setViewMonth((month) => month + 1);
    }
  };

  const handleDateSelect = (day) => {
    const dateString = getLocalDateString(new Date(viewYear, viewMonth, day));
    onChange(dateString);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setIsOpen(false);
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const todayString = getLocalDateString();
  const calendarCells = [];

  for (let i = 0; i < firstDay; i += 1) {
    calendarCells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    calendarCells.push(day);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={`h-[38px] px-3 rounded-lg border flex items-center gap-2 font-sans transition-colors ${
          value
            ? "border-[#CC2B52] bg-[#FDF2F4] text-[#CC2B52]"
            : "border-gray-300 bg-[#F9FBFF] text-gray-700 hover:border-[#CC2B52]/40"
        }`}
        style={{ fontSize: "14px", fontWeight: 500 }}
        aria-label="Filter bookings by date"
      >
        <CalendarDays className="w-4 h-4 shrink-0" />
        <span className="whitespace-nowrap">
          {value ? formatDisplayDate(value) : "Filter by date"}
        </span>
        {value && (
          <span
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              handleClear();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                handleClear();
              }
            }}
            className="ml-1 p-0.5 rounded hover:bg-[#CC2B52]/10"
            aria-label="Clear date filter"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[300px] rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-full hover:bg-gray-100"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <h3 className="text-sm font-semibold text-gray-800">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h3>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-full hover:bg-gray-100"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAY_NAMES.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-gray-500 py-1"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="h-9" />;
              }

              const dateString = getLocalDateString(new Date(viewYear, viewMonth, day));
              const isSelected = value === dateString;
              const isToday = todayString === dateString;

              return (
                <button
                  key={dateString}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  className={`h-9 w-9 mx-auto rounded-full text-sm font-medium transition-colors ${
                    isSelected
                      ? "bg-[#CC2B52] text-white"
                      : isToday
                      ? "border-2 border-[#CC2B52] text-gray-800 hover:bg-gray-100"
                      : "text-gray-800 hover:bg-gray-100 hover:text-[#CC2B52]"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onChange(todayString)}
              className="text-sm font-medium text-[#CC2B52] hover:text-[#B02547]"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Show all dates
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

AdminBookingsDatePicker.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

export default AdminBookingsDatePicker;
