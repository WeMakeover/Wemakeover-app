import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { adminCategoriesApi } from "../../features/admin/categories/adminCategoriesApi";
import { fetchAllCategories } from "../../features/admin/categories/adminCategoriesThunks";
import MobileCategoryBannerPreview from "../../components/admin/mobile/MobileCategoryBannerPreview";
import Checkbox from "../../components/ui/Checkbox.jsx";

const emptyForm = {
  name: "",
  description: "",
  displayOrder: "",
  bannerImage: null,
  bannerPreview: null,
  isActive: true,
};

export default function MobileCategoryForm() {
  const { categoryId } = useParams();
  const isEdit = Boolean(categoryId);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      try {
        const res = await adminCategoriesApi.getCategoryById(categoryId);
        const category = res?.data || res;
        setForm({
          name: category.name || "",
          description: category.description || "",
          displayOrder: category.displayOrder != null ? String(category.displayOrder) : "0",
          bannerImage: null,
          bannerPreview: category.mobileImage || category.image || null,
          isActive: category.isActive !== false,
        });
      } catch (err) {
        toast.error(err.message || "Failed to load category");
        navigate("/admin/services");
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [categoryId, isEdit, navigate]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (form.bannerPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(form.bannerPreview);
    }
    setForm((prev) => ({
      ...prev,
      bannerImage: file,
      bannerPreview: URL.createObjectURL(file),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    if (!isEdit && !form.bannerImage) {
      toast.error("Mobile banner image is required");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("description", form.description || "");
      formData.append("displayOrder", form.displayOrder || "0");
      formData.append("isActive", form.isActive ? "true" : "false");

      if (form.bannerImage) {
        formData.append("mobileImage", form.bannerImage);
      }

      if (isEdit) {
        await adminCategoriesApi.updateCategory(categoryId, formData);
        toast.success("Category updated");
      } else {
        await adminCategoriesApi.createCategory(formData);
        toast.success("Category created");
      }

      dispatch(fetchAllCategories({ limit: 100, sortBy: "displayOrder", sortOrder: "asc" }));
      navigate("/admin/services");
    } catch (err) {
      toast.error(err.message || "Failed to save category");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="p-8">Loading category...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8 lg:px-[80px]">
      <Link to="/admin/services" className="text-[#CC2B52] font-semibold mb-4 inline-block">
        ← Back to Categories
      </Link>

      <h1 className="text-3xl font-bold text-[#292D32] mb-6">
        {isEdit ? "Edit Category" : "Add Category"}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 space-y-5">
          <div>
            <label className="block mb-2 font-semibold text-[#292D32]">Category Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CC2B52]"
              placeholder="Facial & Clean-up"
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold text-[#292D32]">Mobile Banner Image *</label>
            <input type="file" accept="image/*" onChange={handleImageChange} />
            <p className="text-xs text-gray-500 mt-1">Used for mobile category banner and title overlay.</p>
          </div>

          <div>
            <label className="block mb-2 font-semibold text-[#292D32]">Display Order</label>
            <input
              type="number"
              min="0"
              value={form.displayOrder}
              onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CC2B52]"
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold text-[#292D32]">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CC2B52]"
            />
          </div>

          <Checkbox
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            label="Active on mobile"
          />

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate("/admin/services")}
              className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#CC2B52] text-white rounded-lg font-semibold hover:bg-[#CC2B52]/90 disabled:opacity-60"
            >
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Category"}
            </button>
          </div>
        </form>

        <div>
          <h2 className="text-lg font-semibold text-[#292D32] mb-3">Mobile Preview</h2>
          <MobileCategoryBannerPreview name={form.name} imagePreview={form.bannerPreview} />
        </div>
      </div>
    </div>
  );
}
