import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { fetchAllCategories } from "../../features/admin/categories/adminCategoriesThunks";
import { toggleCategoryActive } from "../../features/admin/categories/adminCategoriesThunks";
import ToggleCategoryStatusModal from "../../components/modals/admin/ToggleCategoryStatusModal";
import MobileCategoryBannerPreview from "../../components/admin/mobile/MobileCategoryBannerPreview";
import Loader from "../../components/common/Loader/loader.jsx";

export default function AdminMobileServices() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { categories, loading } = useSelector((state) => state.adminCategories);
  const [searchInput, setSearchInput] = useState("");
  const [toggleTarget, setToggleTarget] = useState(null);

  useEffect(() => {
    dispatch(fetchAllCategories({ limit: 100, sortBy: "displayOrder", sortOrder: "asc" }));
  }, [dispatch]);

  const filteredCategories = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name?.toLowerCase().includes(q));
  }, [categories, searchInput]);

  const handleToggle = async () => {
    if (!toggleTarget) return;
    try {
      await dispatch(toggleCategoryActive(toggleTarget._id)).unwrap();
      toast.success("Category status updated");
      setToggleTarget(null);
      dispatch(fetchAllCategories({ limit: 100, sortBy: "displayOrder", sortOrder: "asc" }));
    } catch (err) {
      toast.error(err?.message || "Failed to update category");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8 lg:px-[80px]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#292D32]">Categories & Services</h1>
        <p className="text-gray-600 mt-2">
          Manage categories and services shown in the mobile app.
        </p>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-8">
          <button
            type="button"
            className="pb-4 relative font-semibold text-[#CC2B52]"
          >
            Categories
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#CC2B52]" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <input
            type="text"
            placeholder="Search category..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full md:max-w-sm px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CC2B52]"
          />
          <Link
            to="/admin/services/categories/new"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-[#CC2B52] text-white rounded-lg font-semibold hover:bg-[#CC2B52]/90"
          >
            + Add Category
          </Link>
        </div>

        {loading ? (
          <Loader text="Loading categories..." />
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No mobile categories yet.</p>
            <Link
              to="/admin/services/categories/new"
              className="inline-flex px-5 py-2.5 bg-[#CC2B52] text-white rounded-lg font-semibold"
            >
              Create your first category
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-600">
                  <th className="py-3 pr-4">Order</th>
                  <th className="py-3 pr-4">Banner</th>
                  <th className="py-3 pr-4">Category</th>
                  <th className="py-3 pr-4">Services</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((category) => (
                  <tr key={category._id} className="border-b border-gray-100 align-middle">
                    <td className="py-4 pr-4">{category.displayOrder ?? 0}</td>
                    <td className="py-4 pr-4">
                      <img
                        src={category.mobileImage || category.image}
                        alt={category.name}
                        className="w-16 h-10 object-cover rounded"
                      />
                    </td>
                    <td className="py-4 pr-4 font-semibold text-[#292D32]">{category.name}</td>
                    <td className="py-4 pr-4">{category.serviceCount ?? category.metadata?.activeServices ?? 0}</td>
                    <td className="py-4 pr-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          category.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {category.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/services/categories/${category._id}/edit`)}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/services/${category._id}`)}
                          className="px-3 py-1.5 border border-[#CC2B52] text-[#CC2B52] rounded-lg hover:bg-[#CC2B52]/5"
                        >
                          Manage Services
                        </button>
                        <button
                          type="button"
                          onClick={() => setToggleTarget(category)}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          {category.isActive ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-[#292D32] mb-3">Mobile banner preview sample</h2>
        {filteredCategories[0] ? (
          <div className="max-w-md">
            <MobileCategoryBannerPreview
              name={filteredCategories[0].name}
              imagePreview={filteredCategories[0].mobileImage || filteredCategories[0].image}
            />
          </div>
        ) : null}
      </div>

      {toggleTarget ? (
        <ToggleCategoryStatusModal
          category={toggleTarget}
          onCancel={() => setToggleTarget(null)}
          onConfirm={handleToggle}
        />
      ) : null}
    </div>
  );
}
