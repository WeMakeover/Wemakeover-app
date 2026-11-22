/* eslint-disable react/prop-types */
import ServiceModal from "../ServiceModal";
import { HERO_CATEGORY_SLOTS } from "../../../config/heroCategoryConfig";
import { useHeroCategoryServices } from "../../../hooks/useHeroCategoryServices";

const SLOT = HERO_CATEGORY_SLOTS.find((slot) => slot.modalKey === "bleachAndDeTan");

const BleachAndDeTanModal = ({
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
      onConfirm={() => alert("Detan & Bleach Booking Confirmed!")}
      source="bleach-detan"
      loading={loading}
      loadingLayout="mixed"
    />
  );
};

export default BleachAndDeTanModal;
