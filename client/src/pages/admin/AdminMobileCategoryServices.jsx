import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { adminCategoriesApi } from "../../features/admin/categories/adminCategoriesApi";
import { adminServicesApi } from "../../features/admin/services/adminServicesApi";
import {
  MOBILE_TAB_ORDER,
  mapServiceTypeToTab,
} from "../../components/admin/mobile/mobileAdminUtils";
import { MobileServiceCardPreviewFromService } from "../../components/admin/mobile/MobileServiceCardPreview";
import RemoveServiceModal from "../../components/modals/RemoveServiceModal";
import Loader from "../../components/common/Loader/loader.jsx";

const getServiceId = (service) => service?.id || service?._id;

export default function AdminMobileCategoryServices() {
  const { categoryId } = useParams();
  const navigate = useNavigate();

  const [category, setCategory] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Regular");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [categoryRes, servicesRes] = await Promise.all([
        adminCategoriesApi.getCategoryById(categoryId),
        adminServicesApi.getServicesByCategory(categoryId, { limit: 200 }),
      ]);
      setCategory(categoryRes?.data || categoryRes);
      const list = servicesRes?.data?.services || servicesRes?.services || [];
      setServices(list);
    } catch (err) {
      toast.error(err.message || "Failed to load category services");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [categoryId]);

  const tabCounts = useMemo(() => {
    const counts = Object.fromEntries(MOBILE_TAB_ORDER.map((tab) => [tab, 0]));
    services.forEach((service) => {
      const tab = mapServiceTypeToTab(service.serviceType);
      if (counts[tab] != null) counts[tab] += 1;
    });
    return counts;
  }, [services]);

  const activeServices = useMemo(() => {
    return services.filter((s) => mapServiceTypeToTab(s.serviceType) === activeTab);
  }, [services, activeTab]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminServicesApi.deleteService(getServiceId(deleteTarget));
      toast.success("Service deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.message || "Failed to delete service");
    }
  };

  const handleToggleActive = async (service) => {
    try {
      await adminServicesApi.toggleServiceActive(getServiceId(service));
      toast.success("Service status updated");
      load();
    } catch (err) {
      toast.error(err.message || "Failed to update service");
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <Loader text="Loading mobile services..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8 lg:px-[80px]">
      <Link to="/admin/services" className="text-[#CC2B52] font-semibold mb-4 inline-block">
        ← Back to Mobile Categories
      </Link>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#292D32]">{category?.name || "Category"}</h1>
          <p className="text-gray-600 mt-1">Manage mobile services for this category.</p>
        </div>
        <Link
          to={`/admin/services/${categoryId}/services/new`}
          className="inline-flex items-center justify-center px-5 py-2.5 bg-[#CC2B52] text-white rounded-lg font-semibold hover:bg-[#CC2B52]/90"
        >
          + Add Mobile Service
        </Link>
      </div>

      <div className="bg-[#F5F5F5] rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {MOBILE_TAB_ORDER.map((tab) => {
            const active = tab === activeTab;
            const count = tabCounts[tab] || 0;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg border text-sm font-semibold ${
                  active
                    ? "bg-[#FDF3F5] border-[#CC2B52] text-[#CC2B52]"
                    : "bg-white border-gray-300 text-gray-600"
                }`}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        {activeServices.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500 mb-4">No services in {activeTab} tab yet.</p>
            <Link
              to={`/admin/services/${categoryId}/services/new`}
              className="inline-flex px-5 py-2.5 bg-[#CC2B52] text-white rounded-lg font-semibold"
            >
              Add your first service
            </Link>
          </div>
        ) : (
          activeServices.map((service) => {
            const serviceId = getServiceId(service);
            return (
            <div key={serviceId} className="bg-white rounded-lg border border-gray-200 p-4">
              <MobileServiceCardPreviewFromService service={service} />
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => navigate(`/admin/services/${categoryId}/services/${serviceId}/edit`)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleActive(service)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {service.isActive === false ? "Enable" : "Disable"}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(service)}
                  className="px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
            );
          })
        )}
      </div>

      {deleteTarget ? (
        <RemoveServiceModal
          serviceName={deleteTarget.name}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      ) : null}
    </div>
  );
}
