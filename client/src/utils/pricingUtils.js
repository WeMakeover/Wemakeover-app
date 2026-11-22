export const TRANSPORTATION_DISPOSABLES_FEE = 150;

/** @deprecated Use TRANSPORTATION_DISPOSABLES_FEE */
export const TRANSPORTATION_PLATFORM_FEE = TRANSPORTATION_DISPOSABLES_FEE;

/** Legacy GST rate — only used when displaying old bookings that include tax */
export const GST_RATE = 18;

export const FEE_LABEL = 'Transportation & Disposables Fee';

/**
 * Calculate full order pricing from product subtotal.
 * Total = subtotal + transportation & disposables fee (no GST on new orders).
 */
export const calculateOrderPricing = (productSubtotal) => {
  const subtotal = Math.max(0, Math.round(productSubtotal || 0));
  const platformFee = TRANSPORTATION_DISPOSABLES_FEE;
  const taxAmount = 0;
  const totalAmount = subtotal + platformFee;

  return {
    subtotal,
    platformFee,
    taxAmount,
    totalAmount,
  };
};
