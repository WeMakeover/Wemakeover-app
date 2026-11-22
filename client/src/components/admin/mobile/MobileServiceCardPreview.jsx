/* eslint-disable react/prop-types */
import { Clock, Plus, Minus } from "lucide-react";
import { getPriceDisplay, getServiceImage, isAddableService } from "./mobileAdminUtils";

export default function MobileServiceCardPreview({
  name = "Service Name",
  nameLine2 = "",
  duration = "",
  price = "",
  priceDisplay = "",
  taxIncluded = true,
  ctaContent = "Add",
  imagePreview = null,
  showQty = false,
  compact = false,
}) {
  const title = [name, nameLine2].filter(Boolean).join(" ").trim() || "Service Name";
  const priceText = priceDisplay || (price ? `₹${Number(price).toLocaleString("en-IN")}` : "Get in touch for pricing");
  const addable = ctaContent === "Add" && Number(price) > 0;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-start gap-4">
        <div className="w-20 h-20 rounded-lg overflow-hidden bg-[#EFE9E4] flex-shrink-0">
          {imagePreview ? (
            <img src={imagePreview} alt={title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#CC2B52] text-sm font-bold">
              WM
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {duration ? (
            <div className="flex items-center gap-1 text-[#474747] text-[10px] mb-1">
              <Clock size={14} />
              <span>{duration}</span>
            </div>
          ) : null}

          <h4 className="text-[#1C1C28] font-bold text-base leading-snug mb-1">{title}</h4>

          <div>
            <p className="text-[#CC2B52] font-bold text-sm">{priceText}</p>
            {taxIncluded ? <p className="text-[#CC2B52] text-[10px]">Tax Included</p> : null}
          </div>
        </div>

        {showQty ? (
          <div className="flex items-center gap-2 border border-[#CC2B52] rounded-lg px-2 py-1 h-fit">
            <Minus size={14} className="text-[#CC2B52]" />
            <span className="text-sm font-bold text-[#CC2B52]">1</span>
            <Plus size={14} className="text-[#CC2B52]" />
          </div>
        ) : addable ? (
          <button
            type="button"
            className="border border-[#CC2B52] rounded-lg px-3 py-2 text-[#CC2B52] text-sm font-semibold flex items-center gap-1 h-fit"
          >
            Add <Plus size={14} />
          </button>
        ) : (
          <button
            type="button"
            className="border border-[#CC2B52] rounded-lg px-3 py-2 text-[#CC2B52] text-sm font-semibold h-fit"
          >
            {ctaContent === "Enquire Now" ? "Enquire" : ctaContent}
          </button>
        )}
      </div>
    </div>
  );
}

export function MobileServiceCardPreviewFromService({ service, compact = false }) {
  if (!service) return null;
  return (
    <MobileServiceCardPreview
      compact={compact}
      name={service.name}
      nameLine2={service.nameLine2}
      duration={service.duration}
      price={service.price}
      priceDisplay={getPriceDisplay(service)}
      taxIncluded={service.taxIncluded !== false}
      ctaContent={service.ctaContent || "Add"}
      imagePreview={getServiceImage(service)}
      showQty={false}
    />
  );
}
