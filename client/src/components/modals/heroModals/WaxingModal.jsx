/* eslint-disable react/prop-types */
import ServiceModal from "../ServiceModal";
import { HERO_CATEGORY_SLOTS } from "../../../config/heroCategoryConfig";
import { useHeroCategoryServices } from "../../../hooks/useHeroCategoryServices";

const SLOT = HERO_CATEGORY_SLOTS.find((slot) => slot.modalKey === "waxing");

const WaxingModal = ({
  onClose,
  services = [],
  currentServiceId = null,
  onServiceChange = null,
  categoryId = null,
  categoryName = null,
}) => {
  const { flexCards, gridCard, categoryName: resolvedName, loading } = useHeroCategoryServices({
    categoryId,
    categoryName,
    legacySlugs: SLOT.legacySlugs,
    legacyNames: SLOT.legacyNames,
  });

  const waxingInfo = {
    items: [
      "AC is highly recommended for waxing.",
      "Areas with wound or cuts won't be waxed.",
      "Do share or be aware of any history of reaction due to wax",
      "Wax box will not be handed over to customer",
      "The hair should be minimum 0.25in to be able to wax properly",
    ],
  };

  return (
    <ServiceModal
      title={resolvedName || SLOT.fallbackName}
      cards={flexCards}
      gridCard={gridCard}
      infoContent={waxingInfo}
      onClose={onClose}
      services={services}
      currentServiceId={currentServiceId}
      onServiceChange={onServiceChange}
      onConfirm={() => alert("Waxing Booking Confirmed!")}
      loading={loading}
      loadingLayout="mixed"
    />
  );
};

export default WaxingModal;
