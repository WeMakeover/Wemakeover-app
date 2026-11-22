/* eslint-disable react/prop-types */
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import ContactUsForm from "../common/contact/ContactUsForm";
import { resetContactState } from "../../features/contact/ContactSlice";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import { IoClose } from "react-icons/io5";

const ContactUsModal = ({ onClose }) => {
  const dispatch = useDispatch();

  useBodyScrollLock(true);

  useEffect(() => {
    return () => {
      dispatch(resetContactState());
    };
  }, [dispatch]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 overflow-hidden overscroll-contain"
    >
      <div
        className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl shadow-2xl max-w-[522px] w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto"
        data-modal-scroll
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[#CC2B52] text-lg font-semibold">Contact Us</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
          >
            <IoClose className="w-6 h-6 text-gray-600" />
          </button>
        </div>
        <ContactUsForm onSuccess={onClose} />
      </div>
    </div>
  );
};

export default ContactUsModal;
