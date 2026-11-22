import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { adminServicesApi } from "../../features/admin/services/adminServicesApi";
import MobileServiceCardPreview from "../../components/admin/mobile/MobileServiceCardPreview";
import Select from "../../components/ui/Select.jsx";
import Checkbox from "../../components/ui/Checkbox.jsx";
import { SERVICE_TYPE_OPTIONS } from "../../components/admin/mobile/mobileAdminUtils";

const emptyForm = {
  name: "",
  nameLine2: "",
  description: "",
  duration: "",
  price: "",
  priceDisplay: "",
  taxIncluded: true,
  ctaContent: "Add",
  serviceType: "Classic",
  mobileImage: null,
  mobileImagePreview: null,
  existingMobileImage: null,
  isActive: true,
  isAvailable: true,
};

export default function MobileServiceForm() {
  const { categoryId, serviceId } = useParams();
  const isEdit = Boolean(serviceId);
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      try {
        const res = await adminServicesApi.getServiceById(serviceId);
        const service = res?.data || res;
        setForm({
          name: service.name || "",
          nameLine2: service.nameLine2 || "",
          description: service.description || "",
          duration: service.duration || "",
          price: service.price != null ? String(service.price) : "",
          priceDisplay: service.priceDisplay || "",
          taxIncluded: service.taxIncluded !== false,
          ctaContent: service.ctaContent || "Add",
          serviceType: service.serviceType || "Classic",
          mobileImage: null,
          mobileImagePreview: service.mobileImage || (Array.isArray(service.image) ? service.image[0] : service.image) || null,
          existingMobileImage: service.mobileImage || (Array.isArray(service.image) ? service.image[0] : service.image) || null,
          isActive: service.isActive !== false,
          isAvailable: service.isAvailable !== false,
        });
      } catch (err) {
        toast.error(err.message || "Failed to load service");
        navigate(`/admin/services/${categoryId}`);
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [serviceId, isEdit, categoryId, navigate]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (form.mobileImagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(form.mobileImagePreview);
    }
    setForm((prev) => ({
      ...prev,
      mobileImage: file,
      mobileImagePreview: URL.createObjectURL(file),
    }));
  };

  const buildFormData = () => {
    const formData = new FormData();
    formData.append("categoryId", categoryId);
    formData.append("name", form.name.trim());
    formData.append("nameLine2", form.nameLine2.trim());
    formData.append(
      "description",
      form.description.trim() || `${form.name.trim()} service for mobile app`
    );
    formData.append("bodyContent", "");
    formData.append("price", form.price.trim());
    if (form.priceDisplay.trim()) formData.append("priceDisplay", form.priceDisplay.trim());
    formData.append("duration", form.duration.trim());
    formData.append("taxIncluded", form.taxIncluded ? "true" : "false");
    formData.append("ctaContent", form.ctaContent);
    formData.append("serviceType", form.serviceType);
    formData.append("cardType", "Vertical");
    formData.append("isActive", form.isActive ? "true" : "false");
    formData.append("isAvailable", form.isAvailable ? "true" : "false");

    if (form.mobileImage) {
      formData.append("mobileImage", form.mobileImage);
    }

    return formData;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Service name is required");
      return;
    }
    if (!form.duration.trim()) {
      toast.error("Duration is required");
      return;
    }
    if (form.ctaContent === "Add" && !form.price.trim()) {
      toast.error("Price is required when button type is Add");
      return;
    }
    if (!isEdit && !form.mobileImage) {
      toast.error("Mobile service image is required");
      return;
    }

    setLoading(true);
    try {
      const formData = buildFormData();
      if (isEdit) {
        await adminServicesApi.updateService(serviceId, formData);
        toast.success("Mobile service updated");
      } else {
        await adminServicesApi.createService(formData);
        toast.success("Mobile service created");
      }
      navigate(`/admin/services/${categoryId}`);
    } catch (err) {
      toast.error(err.message || "Failed to save service");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="p-8">Loading service...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8 lg:px-[80px]">
      <Link
        to={`/admin/services/${categoryId}`}
        className="text-[#CC2B52] font-semibold mb-4 inline-block"
      >
        ← Back to Category Services
      </Link>

      <h1 className="text-3xl font-bold text-[#292D32] mb-6">
        {isEdit ? "Edit Mobile Service" : "Add Mobile Service"}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 space-y-5">
          <div>
            <label className="block mb-2 font-semibold text-[#292D32]">Service Type Tab *</label>
            <Select
              value={form.serviceType}
              onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
              options={SERVICE_TYPE_OPTIONS}
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold text-[#292D32]">Service Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CC2B52]"
              placeholder="Manicure"
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold text-[#292D32]">Second Line (optional)</label>
            <input
              value={form.nameLine2}
              onChange={(e) => setForm({ ...form, nameLine2: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CC2B52]"
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold text-[#292D32]">Duration *</label>
            <input
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CC2B52]"
              placeholder="1hr 10mins"
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold text-[#292D32]">Price *</label>
            <input
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CC2B52]"
              placeholder="599"
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold text-[#292D32]">Custom Price Text (optional)</label>
            <input
              value={form.priceDisplay}
              onChange={(e) => setForm({ ...form, priceDisplay: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CC2B52]"
              placeholder="2.5k-11k"
            />
          </div>

          <Checkbox
            checked={form.taxIncluded}
            onChange={(e) => setForm({ ...form, taxIncluded: e.target.checked })}
            label="Tax Included"
          />

          <div>
            <label className="block mb-2 font-semibold text-[#292D32]">Button Type *</label>
            <Select
              value={form.ctaContent}
              onChange={(e) => setForm({ ...form, ctaContent: e.target.value })}
              options={[
                { value: "Add", label: "Add" },
                { value: "Enquire Now", label: "Enquire Now" },
              ]}
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold text-[#292D32]">Mobile Service Image *</label>
            <input type="file" accept="image/*" onChange={handleImageChange} />
          </div>

          <Checkbox
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            label="Active on mobile"
          />

          <Checkbox
            checked={form.isAvailable}
            onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
            label="Available for booking"
          />

          <div>
            <label className="block mb-2 font-semibold text-[#292D32]">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CC2B52]"
              placeholder="Used on service detail page"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(`/admin/services/${categoryId}`)}
              className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#CC2B52] text-white rounded-lg font-semibold hover:bg-[#CC2B52]/90 disabled:opacity-60"
            >
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Service"}
            </button>
          </div>
        </form>

        <div>
          <h2 className="text-lg font-semibold text-[#292D32] mb-3">Live Mobile Card Preview</h2>
          <MobileServiceCardPreview
            name={form.name}
            nameLine2={form.nameLine2}
            duration={form.duration}
            price={form.price}
            priceDisplay={form.priceDisplay}
            taxIncluded={form.taxIncluded}
            ctaContent={form.ctaContent}
            imagePreview={form.mobileImagePreview}
          />
        </div>
      </div>
    </div>
  );
}
