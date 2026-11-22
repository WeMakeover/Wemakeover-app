import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import artistImg from "../../../assets/hero/artist.png";
import faceFoundationImg from "../../../assets/hero/faceFoundation.png";
import tattooImg from "../../../assets/hero/tattoo.png";
import naturalIngridentsImg from "../../../assets/hero/naturalIngridents.png";
import primerImg from "../../../assets/hero/primer.png";
import makeupImg from "../../../assets/hero/makeup.png";

// Neutral placeholder when hero image is missing or fails to load (no hardcoded hero asset)
const HERO_PLACEHOLDER = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
import { fetchPublicSiteSettings } from "../../../features/admin/siteSettings/siteSettingsThunks";
import { HERO_CATEGORY_SLOTS } from "../../../config/heroCategoryConfig";
import { matchHeroCategory } from "../../../utils/serviceTransformers";

import ProfessionalMakeup from "../../modals/heroModals/ProfessionalMakeup";
import CleanupAndFacialModal from "../../modals/heroModals/CleanupAndFacialModal";
import ProfessionalMehendiModal from "../../modals/heroModals/ProfessionalMehendiModal";
import WaxingModal from "../../modals/heroModals/WaxingModal";
import ManicureAndPedicureModal from "../../modals/heroModals/ManicureAndPedicureModal";
import BleachAndDeTanModal from "../../modals/heroModals/BleachAndDeTanModal";

const HERO_IMAGES = {
  professionalMakeup: artistImg,
  cleanupAndFacial: faceFoundationImg,
  professionalMehendi: tattooImg,
  waxing: naturalIngridentsImg,
  manicureAndPedicure: primerImg,
  bleachAndDeTan: makeupImg,
};

const HERO_MODALS = {
  professionalMakeup: ProfessionalMakeup,
  cleanupAndFacial: CleanupAndFacialModal,
  professionalMehendi: ProfessionalMehendiModal,
  waxing: WaxingModal,
  manicureAndPedicure: ManicureAndPedicureModal,
  bleachAndDeTan: BleachAndDeTanModal,
};

const Hero = () => {
  const dispatch = useDispatch();
  const { publicSettings, loading: siteSettingsLoading } = useSelector((state) => state.adminSiteSettings);

  const [activeCategory, setActiveCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const heroImageUrl = publicSettings?.hero?.mainImage ?? "";
  const showHeroLoading = siteSettingsLoading && !publicSettings;
  const hasHeroImage = Boolean(heroImageUrl && heroImageUrl.trim());

  const closeModal = () => setActiveCategory(null);

  const handleServiceChange = (serviceId) => {
    const nextCategory = categories.find((category) => category.id === serviceId);
    if (nextCategory?.ModalComponent) {
      setActiveCategory(nextCategory);
    }
  };

  const servicesList = useMemo(
    () => categories.map((category) => ({ id: category.id, name: category.name })),
    [categories]
  );

  useEffect(() => {
    dispatch(fetchPublicSiteSettings());
  }, [dispatch]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/categories`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch categories");
        }

        const result = await response.json();

        if (result.success && result.data) {
          const dbCategories = result.data;

          const matchedHeroCategories = HERO_CATEGORY_SLOTS.map((slot) => {
            const dbMatch = matchHeroCategory(dbCategories, {
              slugs: slot.legacySlugs,
              names: slot.legacyNames,
            });

            return {
              ...slot,
              dbId: dbMatch?._id || dbMatch?.id || null,
              name: dbMatch?.name || slot.fallbackName,
              image: dbMatch?.image || HERO_IMAGES[slot.modalKey] || artistImg,
              ModalComponent: HERO_MODALS[slot.modalKey] || null,
            };
          });

          const matchedDbIds = new Set(
            matchedHeroCategories
              .filter((category) => category.dbId)
              .map((category) => String(category.dbId))
          );

          const additionalCategories = dbCategories
            .filter((dbCat) => !matchedDbIds.has(String(dbCat._id || dbCat.id)))
            .map((dbCat) => ({
              id: `dynamic-${dbCat._id || dbCat.id}`,
              dbId: dbCat._id || dbCat.id,
              name: dbCat.name,
              image: dbCat.image || artistImg,
              isDynamic: true,
              ModalComponent: null,
            }));

          setCategories([...matchedHeroCategories, ...additionalCategories]);
        } else {
          setCategories(
            HERO_CATEGORY_SLOTS.map((slot) => ({
              ...slot,
              name: slot.fallbackName,
              image: HERO_IMAGES[slot.modalKey] || artistImg,
              ModalComponent: HERO_MODALS[slot.modalKey] || null,
            }))
          );
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        setCategories(
          HERO_CATEGORY_SLOTS.map((slot) => ({
            ...slot,
            name: slot.fallbackName,
            image: HERO_IMAGES[slot.modalKey] || artistImg,
            ModalComponent: HERO_MODALS[slot.modalKey] || null,
          }))
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleCategoryClick = (category) => {
    if (category.ModalComponent) {
      setActiveCategory(category);
    } else if (category.isDynamic) {
      console.log(`Dynamic category clicked: ${category.name}`);
    }
  };

  const ActiveModal = activeCategory?.ModalComponent;

  return (
    <main
      id="hero"
      className="w-full flex flex-col lg:flex-row min-h-[350px] sm:min-h-[450px] md:min-h-[550px] lg:h-[700px] lg:items-center lg:justify-between"
    >
      <div className="w-full h-[300px] sm:h-[350px] md:h-[400px] lg:w-1/2 lg:h-full flex items-center justify-center order-1 lg:order-1 bg-gray-100">
        {showHeroLoading ? (
          <div className="w-full h-full animate-pulse bg-gray-200" aria-hidden />
        ) : hasHeroImage ? (
          <img
            src={heroImageUrl}
            alt="Hero"
            className="w-full h-full object-cover object-center"
            onError={(e) => {
              e.target.src = HERO_PLACEHOLDER;
            }}
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #FDF2F4 0%, #FCE7EB 40%, #F7EBEE 100%)",
            }}
            aria-hidden
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[70%] h-[70%] rounded-full bg-[#CC2B52]/[0.04] blur-2xl" />
              <div className="absolute w-[50%] h-[50%] rounded-full bg-[#CC2B52]/[0.06] blur-xl -translate-y-1/4" />
            </div>
            <div className="relative flex flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#CC2B52]/10 flex items-center justify-center">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-[#CC2B52]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-[#CC2B52]/70 font-medium text-sm sm:text-base max-w-[220px]">
                Your look, our passion
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-[clamp(1rem,4vw,5rem)] py-[clamp(2rem,5vw,3rem)] lg:py-0 order-2 lg:order-2">
        <div className="w-full flex flex-col items-center justify-center gap-[clamp(1.5rem,4vw,2rem)]">
          <div className="header flex flex-col items-start justify-center gap-[clamp(1rem,3vw,1.5rem)] text-left w-full">
            <h1 className="title font-semibold text-[clamp(1.5rem,4vw,2.375rem)] text-[#CC2B52] leading-tight">
              Professional Makeup & Grooming at your Doorstep!
            </h1>
            <p className="description font-normal text-[clamp(0.875rem,2vw,1.125rem)] leading-relaxed text-[#292929] max-w-lg">
              We bring professional makeup and grooming essential services to
              you at a very friendly price
            </p>
          </div>

          <div className="service-container w-full">
            {loading ? (
              <div className="services grid grid-cols-3 gap-[clamp(0.75rem,2vw,1.5rem)]">
                {[...Array(6)].map((_, index) => (
                  <div
                    key={index}
                    className="service-item flex flex-col items-center justify-center p-[clamp(0.5rem,2vw,1rem)] border rounded-xl shadow-md w-full aspect-square animate-pulse bg-gray-100"
                  >
                    <div className="w-[clamp(3rem,8vw,5rem)] h-[clamp(3rem,8vw,5rem)] bg-gray-200 rounded mb-[clamp(0.25rem,1vw,0.5rem)]" />
                    <div className="h-4 w-20 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="services grid grid-cols-3 gap-[clamp(0.75rem,2vw,1.5rem)]">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="service-item flex flex-col items-center justify-center p-[clamp(0.5rem,2vw,1rem)] border rounded-xl shadow-md w-full aspect-square cursor-pointer hover:shadow-lg transition-shadow duration-200"
                    onClick={() => handleCategoryClick(category)}
                  >
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-[clamp(3rem,8vw,5rem)] h-[clamp(3rem,8vw,5rem)] object-cover mb-[clamp(0.25rem,1vw,0.5rem)] rounded"
                      onError={(e) => {
                        e.target.src = artistImg;
                      }}
                    />
                    <p className="service-name text-center text-[clamp(0.75rem,1.5vw,1.125rem)] font-medium leading-tight">
                      {category.name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {ActiveModal && activeCategory && (
        <div
          className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-80 flex items-center justify-center z-50 p-[clamp(0.5rem,2vw,1rem)]"
          onClick={closeModal}
        >
          <ActiveModal
            categoryId={activeCategory.dbId}
            categoryName={activeCategory.name}
            onClose={closeModal}
            services={servicesList}
            currentServiceId={activeCategory.id}
            onServiceChange={handleServiceChange}
          />
        </div>
      )}
    </main>
  );
};

export default Hero;
