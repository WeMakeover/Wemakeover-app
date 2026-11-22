import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

const backendurl = import.meta.env.VITE_BACKEND_URL;

const api = axios.create({
  baseURL: `${backendurl}/admin/popular-near-you`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/auth/login';
    }
    return Promise.reject(new Error(error.response?.data?.message || 'Request failed'));
  }
);

function serviceThumb(service) {
  return service.mobileImage || (Array.isArray(service.image) ? service.image[0] : null) || null;
}

export default function AdminPopularNearYou() {
  const [selected, setSelected] = useState([]);
  const [available, setAvailable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/');
      setSelected(res.data?.selected || []);
      setAvailable(res.data?.available || []);
      setDirty(false);
    } catch (err) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const move = (index, direction) => {
    setSelected((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      return next;
    });
    setDirty(true);
    setMessage('');
  };

  const handleRemove = (index) => {
    setSelected((prev) => {
      const removed = prev[index];
      const next = prev.filter((_, i) => i !== index);
      if (removed) {
        setAvailable((avail) =>
          [...avail, { ...removed, showInPopularNearYou: false }].sort((a, b) =>
            String(a.name).localeCompare(String(b.name))
          )
        );
      }
      return next;
    });
    setDirty(true);
    setMessage('');
  };

  const handleAdd = (service) => {
    setAvailable((prev) => prev.filter((s) => s.id !== service.id && s._id !== service._id));
    setSelected((prev) => [...prev, { ...service, showInPopularNearYou: true }]);
    setDirty(true);
    setMessage('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setMessage('');
    try {
      const serviceIds = selected.map((s) => s.id || s._id);
      await api.put('/', { serviceIds });
      await load();
      setMessage('Saved. Home Popular Near You will use this list.');
      setDirty(false);
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const filteredAvailable = available.filter((s) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      String(s.name || '').toLowerCase().includes(q) ||
      String(s.categoryName || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Popular Near You</h1>
          <p className="text-sm text-gray-500 mt-1">
            Choose which services appear on the mobile Home screen, and in what order.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700"
          >
            Refresh
          </button>
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={handleSave}
            className="rounded-lg bg-[#CC2B52] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save list'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Showing on Home ({selected.length})</h2>
              {dirty ? <span className="text-xs text-amber-600 font-medium">Unsaved changes</span> : null}
            </div>
            {selected.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">
                No services curated yet. Add from the right. Until you save a list, the app may fall
                back to automatic popularity.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {selected.map((service, index) => {
                  const thumb = serviceThumb(service);
                  return (
                    <li key={service.id || service._id} className="flex items-center gap-3 px-4 py-3">
                      <span className="w-6 text-xs font-semibold text-gray-400">{index + 1}</span>
                      {thumb ? (
                        <img src={thumb} alt="" className="w-12 h-12 rounded-lg object-cover bg-gray-100" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{service.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {service.categoryName || 'Uncategorized'} · ₹{service.price}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => move(index, -1)}
                          disabled={index === 0}
                          className="rounded border border-gray-200 px-2 py-1 text-xs disabled:opacity-30"
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => move(index, 1)}
                          disabled={index === selected.length - 1}
                          className="rounded border border-gray-200 px-2 py-1 text-xs disabled:opacity-30"
                          title="Move down"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(index)}
                          className="rounded border border-red-200 px-2 py-1 text-xs text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-2">
                Available to add ({filteredAvailable.length})
              </h2>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search services…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            {filteredAvailable.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">No matching active services left to add.</p>
            ) : (
              <ul className="divide-y divide-gray-100 max-h-[560px] overflow-y-auto">
                {filteredAvailable.map((service) => {
                  const thumb = serviceThumb(service);
                  return (
                    <li key={service.id || service._id} className="flex items-center gap-3 px-4 py-3">
                      {thumb ? (
                        <img src={thumb} alt="" className="w-12 h-12 rounded-lg object-cover bg-gray-100" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{service.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {service.categoryName || 'Uncategorized'} · ₹{service.price}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAdd(service)}
                        className="rounded-lg bg-[#CC2B52] px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Add
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
