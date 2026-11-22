import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  createCoupon,
  fetchCouponById,
  updateCoupon,
} from '../../features/admin/coupons/adminCouponsThunks';

const emptyForm = {
  code: '',
  description: '',
  type: 'percentage',
  value: '',
  maxDiscount: '',
  minOrderValue: '0',
  startsAt: '',
  endsAt: '',
  usageLimit: '',
  perUserLimit: '1',
  isActive: true,
};

export default function CouponForm() {
  const { couponId } = useParams();
  const isEdit = Boolean(couponId);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { selectedCoupon, saving, error } = useSelector((state) => state.adminCoupons);
  const [form, setForm] = useState(emptyForm);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (isEdit) dispatch(fetchCouponById(couponId));
  }, [dispatch, couponId, isEdit]);

  useEffect(() => {
    if (!isEdit || !selectedCoupon) return;
    setForm({
      code: selectedCoupon.code || '',
      description: selectedCoupon.description || '',
      type: selectedCoupon.type || 'percentage',
      value: String(selectedCoupon.value ?? ''),
      maxDiscount: selectedCoupon.maxDiscount != null ? String(selectedCoupon.maxDiscount) : '',
      minOrderValue: String(selectedCoupon.minOrderValue ?? 0),
      startsAt: selectedCoupon.startsAt ? selectedCoupon.startsAt.slice(0, 10) : '',
      endsAt: selectedCoupon.endsAt ? selectedCoupon.endsAt.slice(0, 10) : '',
      usageLimit: selectedCoupon.usageLimit != null ? String(selectedCoupon.usageLimit) : '',
      perUserLimit: String(selectedCoupon.perUserLimit ?? 1),
      isActive: selectedCoupon.isActive !== false,
    });
  }, [selectedCoupon, isEdit]);

  const setField = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!form.code.trim()) {
      setLocalError('Coupon code is required');
      return;
    }
    if (!form.value || Number(form.value) <= 0) {
      setLocalError('Discount value must be greater than 0');
      return;
    }

    const payload = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim(),
      type: form.type,
      value: Number(form.value),
      minOrderValue: Number(form.minOrderValue || 0),
      perUserLimit: Number(form.perUserLimit || 1),
      isActive: form.isActive,
      maxDiscount: form.type === 'percentage' && form.maxDiscount ? Number(form.maxDiscount) : null,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      startsAt: form.startsAt || null,
      endsAt: form.endsAt || null,
    };

    const action = isEdit
      ? await dispatch(updateCoupon({ couponId, data: payload }))
      : await dispatch(createCoupon(payload));

    if (action.meta.requestStatus === 'fulfilled') {
      navigate('/admin/coupons');
    } else {
      setLocalError(action.payload || 'Failed to save coupon');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/admin/coupons" className="text-[#CC2B52] font-semibold text-sm mb-4 inline-block">
        ← Back to coupons
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? 'Edit coupon' : 'Create coupon'}
      </h1>

      {(localError || error) && (
        <p className="mb-4 text-sm text-red-600">{localError || error}</p>
      )}

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Coupon code *</label>
          <input
            value={form.code}
            onChange={setField('code')}
            placeholder="SAVE10"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 uppercase"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input
            value={form.description}
            onChange={setField('description')}
            placeholder="Optional note for admins"
            className="w-full rounded-lg border border-gray-200 px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount type *</label>
            <select value={form.type} onChange={setField('type')} className="w-full rounded-lg border border-gray-200 px-3 py-2">
              <option value="percentage">Percentage (%)</option>
              <option value="flat">Flat amount (₹)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Value *</label>
            <input
              type="number"
              min="1"
              value={form.value}
              onChange={setField('value')}
              placeholder={form.type === 'percentage' ? '10' : '100'}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </div>
        </div>

        {form.type === 'percentage' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max discount cap (₹)</label>
            <input
              type="number"
              min="0"
              value={form.maxDiscount}
              onChange={setField('maxDiscount')}
              placeholder="Optional, e.g. 500"
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Minimum order (₹)</label>
            <input
              type="number"
              min="0"
              value={form.minOrderValue}
              onChange={setField('minOrderValue')}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Uses per account</label>
            <input
              type="number"
              min="1"
              value={form.perUserLimit}
              onChange={setField('perUserLimit')}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">Set to 1 for one-time per user coupons.</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Total usage limit</label>
          <input
            type="number"
            min="1"
            value={form.usageLimit}
            onChange={setField('usageLimit')}
            placeholder="Leave empty for unlimited"
            className="w-full rounded-lg border border-gray-200 px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valid from</label>
            <input type="date" value={form.startsAt} onChange={setField('startsAt')} className="w-full rounded-lg border border-gray-200 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valid until</label>
            <input type="date" value={form.endsAt} onChange={setField('endsAt')} className="w-full rounded-lg border border-gray-200 px-3 py-2" />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.isActive} onChange={setField('isActive')} />
          Active (users can apply this coupon)
        </label>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-[#CC2B52] py-3 text-white font-semibold disabled:opacity-60"
        >
          {saving ? 'Saving...' : isEdit ? 'Update coupon' : 'Create coupon'}
        </button>
      </form>
    </div>
  );
}
