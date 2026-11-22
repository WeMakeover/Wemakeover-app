/* eslint-disable react/prop-types */
import { useNavigate } from "react-router-dom";

const FormFooter = ({ accDetails, switchToButton, switchTo }) => {
  const navigate = useNavigate();

  const handleSwitch = (path) => {
    if (path) navigate(path);
  };

  return (
    <div className="flex flex-col gap-4 font-inter">
      {accDetails && switchToButton && switchTo ? (
        <div className="having-an-acc text-xs text-gray-600 text-center font-medium flex items-center justify-center gap-1">
          {accDetails}
          <span
            className="text-[#CC2B52] font-semibold cursor-pointer hover:underline"
            tabIndex={0}
            onClick={() => handleSwitch(switchTo)}
          >
            {switchToButton}
          </span>
        </div>
      ) : null}

      <div className="copy-rights text-gray-400 text-[10px] text-center font-medium">
        © Wemakeover Admin {new Date().getFullYear()}
      </div>
    </div>
  );
};

export default FormFooter;
