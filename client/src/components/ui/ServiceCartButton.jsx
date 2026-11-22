import { useCart } from "../../hooks/useCart";
import { getCartItemId } from "../../features/cart/cartItemId";
import { MAX_QUANTITY_PER_SERVICE } from "../../features/cart/cartSlice";

const ServiceCartButton = ({
  serviceData,
  className = "",
  sizeConfig = null,
}) => {
  const {
    addItemToCart,
    incrementQuantity,
    decrementQuantity,
    getItemQuantity,
  } = useCart();

  const quantity = getItemQuantity(serviceData);
  const itemId = getCartItemId(serviceData);
  const isAtMax = quantity >= MAX_QUANTITY_PER_SERVICE;

  const handleAddToCart = () => {
    addItemToCart(serviceData);
  };

  const handleIncrement = () => {
    if (isAtMax) return;
    incrementQuantity(itemId);
  };

  const handleDecrement = () => {
    decrementQuantity(itemId);
  };

  const buttonBaseClasses =
    "flex items-center justify-center transition-colors duration-200";
  const containerClasses = "rounded-full font-medium overflow-hidden";
  const hasCustomSize = !!sizeConfig && (sizeConfig.width || sizeConfig.height);
  const formatDimension = (value) =>
    typeof value === "number" ? `${value}px` : value;
  const customStyle = hasCustomSize
    ? {
        width: sizeConfig?.width
          ? formatDimension(sizeConfig.width)
          : undefined,
        height: sizeConfig?.height
          ? formatDimension(sizeConfig.height)
          : undefined,
      }
    : undefined;

  // Shared dimensions — identical for "Add +" and quantity selector to prevent layout shift
  const isFullWidth = className.includes("w-full");
  const containerWidthClass = hasCustomSize
    ? ""
    : isFullWidth
    ? "w-full"
    : "w-[90px] lg:w-[90px]";
  const containerHeightClass = hasCustomSize
    ? ""
    : isFullWidth
    ? "h-[28px] lg:h-[52px]"
    : "h-9 lg:h-10";
  const innerHeightClass = hasCustomSize ? "h-full" : containerHeightClass;

  if (quantity === 0) {
    return (
      <div
        className={`${containerClasses} bg-[#CC2B52] hover:bg-[#B02547] ${containerWidthClass} ${containerHeightClass} ${className}`}
        style={customStyle}
      >
        <button
          onClick={handleAddToCart}
          className={`${buttonBaseClasses} w-full ${innerHeightClass} text-white text-sm sm:text-[14px] lg:text-[15px] font-semibold`}
          aria-label={`Add ${serviceData.cardHeader} to cart`}
        >
          Add +
        </button>
      </div>
    );
  }

  return (
    <div
      className={`${containerClasses} bg-[#CC2B52] ${containerWidthClass} ${containerHeightClass} ${className}`}
      style={customStyle}
    >
      <div
        className={`flex items-center justify-between w-full ${innerHeightClass}`}
      >
        <button
          onClick={handleDecrement}
          className={`${buttonBaseClasses} w-8 h-full flex-shrink-0 text-white hover:bg-[#B02547] text-lg font-medium`}
          aria-label="Decrease quantity"
        >
          −
        </button>

        <span className="flex-1 text-center text-white text-sm font-medium min-w-0">
          {quantity}
        </span>

        {isAtMax ? (
          <div
            className={`${buttonBaseClasses} w-8 h-full flex-shrink-0 text-white/35 text-lg font-medium cursor-not-allowed select-none`}
            aria-label="Maximum quantity reached"
          >
            +
          </div>
        ) : (
          <button
            onClick={handleIncrement}
            className={`${buttonBaseClasses} w-8 h-full flex-shrink-0 text-white hover:bg-[#B02547] text-lg font-medium`}
            aria-label="Increase quantity"
          >
            +
          </button>
        )}
      </div>
    </div>
  );
};

export default ServiceCartButton;
