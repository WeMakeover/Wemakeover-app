import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch } from "react-redux";
import ContactUsForm from "../contact/ContactUsForm";
import { resetContactState } from "../../../features/contact/ContactSlice";

const ContactUs = () => {
  const dispatch = useDispatch();
  const words = ["Bridal", "Party", "Engagement"];
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % words.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [words.length]);

  useEffect(() => {
    return () => {
      dispatch(resetContactState());
    };
  }, [dispatch]);

  return (
    <section
      id="contact-us"
      className="contact-us flex flex-col lg:flex-row justify-evenly sm:justify-between items-start w-full min-h-[706px] py-4 sm:py-6 md:py-8 lg:py-[60px] px-4 sm:px-8 md:px-12 lg:px-20 gap-4 sm:gap-6 md:gap-8 lg:gap-0"
    >
      <div className="message font-normal text-xl sm:text-2xl md:text-3xl lg:text-[54px] leading-tight sm:leading-relaxed lg:leading-[72px] text-[#212121] w-full lg:w-[728px]">
        <h3 className="text-[#CC2B52] text-base sm:text-lg lg:text-xl mb-3 sm:mb-4">
          Connect
        </h3>
        <h4 className="flex items-start min-h-[40px] sm:min-h-[50px] md:min-h-[60px] lg:min-h-[80px]">
          Your
          <span className="text-[#CC2B52] ml-1 sm:ml-2 relative block h-[32px] sm:h-[40px] md:h-[48px] lg:h-[72px]">
            <AnimatePresence mode="wait">
              <motion.span
                key={currentIndex}
                initial={{ y: 72, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -72, opacity: 0 }}
                transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
                className="absolute top-0 left-0 w-full"
              >
                {words[currentIndex]}
              </motion.span>
            </AnimatePresence>
          </span>
        </h4>
        <h4>makeover is just a message away</h4>
      </div>

      <div className="form-container w-full lg:w-[522px] p-3 sm:p-4 md:p-6 lg:p-8 shadow-xl rounded-lg bg-white transition-all duration-300 hover:shadow-2xl">
        <ContactUsForm />
      </div>
    </section>
  );
};

export default ContactUs;
