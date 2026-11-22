/* eslint-disable react/prop-types */
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import FormSection from "../forms/FormSection";
import OTPVerification from "../auth/OTPVerification";
import {
  requestContactOtp,
  sendContactData,
} from "../../../features/contact/contactThunks";
import { clearContactOtpStep } from "../../../features/contact/ContactSlice";

const inputData = [
  {
    id: "name",
    labelName: "Name",
    type: "text",
    placeholder: "Enter your name",
  },
  {
    id: "email",
    labelName: "Email",
    type: "email",
    placeholder: "Enter your email",
  },
  {
    id: "phoneNumber",
    labelName: "Phone",
    type: "tel",
    placeholder: "Enter your phone number",
  },
  {
    id: "message",
    labelName: "Message",
    type: "textarea",
    placeholder: "Enter your message",
  },
];

const emptyForm = {
  name: "",
  email: "",
  phoneNumber: "",
  message: "",
};

const ContactUsForm = ({ onSuccess }) => {
  const dispatch = useDispatch();
  const { loading, otpLoading, otpSent, pendingEmail } = useSelector(
    (state) => state.contact
  );

  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  const handleInputChange = ({ target: { id, value } }) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (formError) setFormError("");
  };

  const validateForm = () => {
    const name = formData.name.trim();
    const email = formData.email.trim();
    const message = formData.message.trim();

    if (!name) return "Name is required";
    if (!email) return "Email is required";
    if (!/^\S+@\S+\.\S+$/.test(email)) return "Please enter a valid email";
    if (!message) return "Message is required";
    return "";
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setFormError("");
    dispatch(clearContactOtpStep());
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const result = await dispatch(
      requestContactOtp({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
      })
    );

    if (result.meta.requestStatus !== "fulfilled") {
      return;
    }
  };

  const handleVerifyAndSend = async (otp) => {
    const result = await dispatch(
      sendContactData({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phoneNumber: formData.phoneNumber.trim(),
        message: formData.message.trim(),
        otp,
      })
    );

    if (result.meta.requestStatus === "fulfilled") {
      resetForm();
      onSuccess?.();
    } else {
      throw new Error(result.payload || "Failed to send message");
    }
  };

  const handleResendOtp = async () => {
    await dispatch(
      requestContactOtp({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
      })
    ).unwrap();
  };

  const handleBackToForm = () => {
    dispatch(clearContactOtpStep());
  };

  if (otpSent) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={handleBackToForm}
          className="text-sm text-[#CC2B52] hover:underline font-medium"
        >
          ← Edit message
        </button>
        <OTPVerification
          email={pendingEmail || formData.email}
          purpose="verification"
          onVerify={handleVerifyAndSend}
          onResend={handleResendOtp}
        />
        {loading && (
          <p className="text-center text-sm text-gray-500">Sending your message...</p>
        )}
      </div>
    );
  }

  return (
    <FormSection
      inputData={inputData}
      buttonText={
        otpLoading ? "Sending code..." : "Verify Email & Contact Us"
      }
      isLoading={otpLoading}
      error={formError}
      inputcss="px-3 sm:px-4 py-2 sm:py-3 rounded-[6px] transition-all focus:ring-2 focus:ring-[#CC2B52]/50 text-sm sm:text-base"
      labelcss="text-[#3B486E] text-sm sm:text-base lg:text-[16px]"
      buttoncss="mt-4 sm:mt-6 hover:bg-[#CC2B52]/90 transition-colors text-sm sm:text-base"
      formData={formData}
      onInputChange={handleInputChange}
      onSubmit={handleRequestOtp}
    />
  );
};

export default ContactUsForm;
