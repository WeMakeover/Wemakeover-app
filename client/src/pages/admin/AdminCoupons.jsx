import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import Loader from '../../components/common/Loader/loader.jsx';
import {
  deleteCoupon,
  fetchAllCoupons,
  toggleCouponActive,
} from '../../features/admin/coupons/adminCouponsThunks';
import { setCouponsPage } from '../../features/admin/coupons/adminCouponsSlice';

function formatDiscount(coupon) {
  if (coupon.type === 'percentage') {
    const cap = coupon.maxDiscount ? ` (max ₹${coupon.maxDiscount})` : '';
    return `${coupon.value}%${cap}`;
  }
  return `₹${coupon.value}`;
}

function formatUsage(coupon) {
  const used = coupon.usageCount || 0;
  const limit = coupon.usageLimit != null ? coupon.usageLimit : '∞';
  return `${used} / ${limit}`;
}

export default function AdminCoupons() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { coupons, pagination, loading, error } = useSelector((state) => state.adminCoupons);

  useEffect(() => {
    const params = {
      page: pagination.currentPage,
      limit: 20,
      search,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };
    if (statusFilter === 'active') params.isActive = true;
    if (statusFilter === 'inactive') params.isActive = false;
    dispatch(fetchAllCoupons(params));
  }, [dispatch, pagination.currentPage, search, statusFilter]);

  const handleDelete = (coupon) => {
    if (!window.confirm(`Delete coupon ${coupon.code}?`)) return;
    dispatch(deleteCoupon(coupon._id)).then(() => dispatch(fetchAllCoupons({ page: pagination.currentPage })));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="text-sm text-gray-500 mt-1">Create percentage or flat discounts with usage limits.</p>
        </div>
        <Link
          to="/admin/coupons/new"
          className="inline-flex items-center justify-center rounded-lg bg-[#CC2B52] px-4 py-2.5 text-sm font-semibold text-white"
        >
          + Create coupon
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by code..."
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {error ? <p className="text-red-600 text-sm mb-4">{error}</p> : null}

      {loading ? (
        <Loader />
      ) : coupons.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
          No coupons yet. Create your first coupon to use in the mobile app.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Discount</th>
                <th className="px-4 py-3 font-semibold">Min order</th>
                <th className="px-4 py-3 font-semibold">Per user</th>
                <th className="px-4 py-3 font-semibold">Usage</th>
                <th className="px-4 py-3 font-semibold">Valid until</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon._id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-semibold text-gray-900">{coupon.code}</td>
                  <td className="px-4 py-3">{formatDiscount(coupon)}</td>
                  <td className="px-4 py-3">₹{coupon.minOrderValue || 0}</td>
                  <td className="px-4 py-3">{coupon.perUserLimit}x</td>
                  <td className="px-4 py-3">{formatUsage(coupon)}</td>
                  <td className="px-4 py-3">
                    {coupon.endsAt ? new Date(coupon.endsAt).toLocaleDateString() : 'No expiry'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {coupon.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/coupons/${coupon._id}/edit`)}
                        className="text-[#CC2B52] font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => dispatch(toggleCouponActive(coupon._id))}
                        className="text-gray-600 font-semibold"
                      >
                        {coupon.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(coupon)}
                        className="text-red-600 font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.totalPages > 1 ? (
        <div className="flex justify-center gap-2 mt-6">
          <button
            type="button"
            disabled={pagination.currentPage <= 1}
            onClick={() => dispatch(setCouponsPage(pagination.currentPage - 1))}
            className="px-3 py-1 rounded border disabled:opacity-40"
          >
            Prev
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={pagination.currentPage >= pagination.totalPages}
            onClick={() => dispatch(setCouponsPage(pagination.currentPage + 1))}
            className="px-3 py-1 rounded border disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
