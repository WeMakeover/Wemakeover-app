/* eslint-disable react/prop-types */
import ServiceModal from "../ServiceModal";
import { HERO_CATEGORY_SLOTS } from "../../../config/heroCategoryConfig";
import { useHeroCategoryServices } from "../../../hooks/useHeroCategoryServices";

const SLOT = HERO_CATEGORY_SLOTS.find((slot) => slot.modalKey === "professionalMehendi");

const ProfessionalMehendiModal = ({
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

  return (
    <ServiceModal
      title={resolvedName || SLOT.fallbackName}
      cards={flexCards}
      gridCard={gridCard}
      onClose={onClose}
      services={services}
      currentServiceId={currentServiceId}
      onServiceChange={onServiceChange}
      onConfirm={() => alert("Professional Mehendi Booking Confirmed!")}
      source="professional-mehendi"
      loading={loading}
      loadingLayout="mixed"
    />
  );
};

export default ProfessionalMehendiModal;
