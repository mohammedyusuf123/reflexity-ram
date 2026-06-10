import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Plus, Pencil, Trash2, Upload, X, Check, Loader2,
  Search, ChevronLeft, ChevronRight, ImageIcon, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { adminApi } from '@/lib/api';

const EMPTY_PRODUCT = {
  slug: '', sku: '', name: '', line: 'Desktop', generation: 'DDR4',
  formFactor: 'UDIMM', capacity: 16, capacityLabel: '16GB', kit: '',
  speed: 3200, speedLabel: '3200 MT/s', cas: 'CL16', timings: '', voltage: '1.35V',
  ecc: false, rank: 'Single Rank', profile: 'XMP 2.0', heatspreader: '',
  rgb: false, condition: 'New', warranty: 'Limited Lifetime',
  price: 0, compareAt: '', stockQuantity: 0, estimatedDispatch: '1–2 business days',
  images: [], tags: '', compatibility: '', included: '', isFeatured: false, isActive: true,
};

function ImageUploader({ images, onChange }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append('images', f));
      const { data } = await adminApi.uploadImages(formData);
      onChange([...images, ...data.images]);
      toast.success(`${data.images.length} image${data.images.length !== 1 ? 's' : ''} uploaded`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (img, idx) => {
    try {
      if (img.publicId) await adminApi.deleteImage(img.publicId);
      onChange(images.filter((_, i) => i !== idx));
    } catch {
      toast.error('Failed to delete image');
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {images.map((img, idx) => (
          <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden bg-white/5 group">
            <img src={img.url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(img, idx)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={10} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-20 h-20 rounded-lg border border-dashed border-white/20 hover:border-white/40 flex flex-col items-center justify-center gap-1 text-neutral-500 hover:text-white transition-all"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          <span className="text-[10px]">{uploading ? 'Uploading' : 'Add'}</span>
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  );
}

function normalizeProduct(p) {
  if (!p) return EMPTY_PRODUCT;
  return {
    ...EMPTY_PRODUCT,
    ...p,
    // Convert arrays back to editable strings for form inputs
    tags: Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || ''),
    compatibility: Array.isArray(p.compatibility) ? p.compatibility.join('\n') : (p.compatibility || ''),
    included: Array.isArray(p.included) ? p.included.join('\n') : (p.included || ''),
    compareAt: p.compareAt || '',
  };
}
function ProductModal({ product, onClose, onSave }) {
  const [form, setForm] = useState(() => normalizeProduct(product));
  const [saving, setSaving] = useState(false);
  const [idsTouched, setIdsTouched] = useState(!!product?._id);
  const isEdit = !!product?._id;

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // New listings: auto-fill slug + SKU from the name so you only type it once.
  // Stops as soon as you manually edit either field.
  const handleNameChange = (name) => {
    setForm(f => {
      const next = { ...f, name };
      if (!isEdit && !idsTouched) {
        const base = name.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 48);
        next.slug = base ? `rfx-${base}` : '';
        next.sku = base ? `RFX-${base.toUpperCase().replace(/-/g, '-').slice(0, 24)}` : '';
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Convert comma-separated strings to arrays
      const data = {
        ...form,
        tags: typeof form.tags === 'string' ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : form.tags,
        compatibility: typeof form.compatibility === 'string' ? form.compatibility.split('\n').map(t => t.trim()).filter(Boolean) : form.compatibility,
        included: typeof form.included === 'string' ? form.included.split('\n').map(t => t.trim()).filter(Boolean) : form.included,
        compareAt: form.compareAt ? Number(form.compareAt) : undefined,
        capacity: Number(form.capacity),
        speed: Number(form.speed),
        price: Number(form.price),
        stockQuantity: Number(form.stockQuantity),
      };

      let result;
      if (isEdit) {
        result = await adminApi.updateProduct(form._id, data);
      } else {
        result = await adminApi.createProduct(data);
      }
      toast.success(isEdit ? 'Product updated' : 'Product created');
      onSave(result.data.product);
    } catch (err) {
      const details = err.response?.data?.details;
      if (details) details.forEach(d => toast.error(d.message));
      else toast.error(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-auto">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl glass rounded-2xl p-6 my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-lg">{isEdit ? 'Edit product' : 'Add product'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-white/5">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ── Essentials — what you touch on every listing ─────────────── */}
          <div>
            <label className="admin-label">Product name *</label>
            <input className="input" value={form.name} onChange={e => handleNameChange(e.target.value)} required placeholder="32GB (2x16GB) DDR5-6000 CL30 EXPO Kit" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="admin-label">Price ($) *</label>
              <input type="number" step="0.01" className="input" value={form.price} onChange={e => setField('price', e.target.value)} required />
            </div>
            <div>
              <label className="admin-label">Compare at ($)</label>
              <input type="number" step="0.01" className="input" value={form.compareAt || ''} onChange={e => setField('compareAt', e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label className="admin-label">Stock qty *</label>
              <input type="number" className="input" value={form.stockQuantity} onChange={e => setField('stockQuantity', e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="admin-label">Images</label>
            <ImageUploader
              images={form.images || []}
              onChange={imgs => setField('images', imgs)}
            />
          </div>

          <div>
            <label className="admin-label">Description</label>
            <textarea className="input min-h-[80px]" value={form.description || ''} onChange={e => setField('description', e.target.value)} placeholder="Shown on the listing page" />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-[13px] cursor-pointer">
              <input type="checkbox" checked={form.isActive !== false} onChange={e => setField('isActive', e.target.checked)} />
              Active (visible in store)
            </label>
            <label className="flex items-center gap-2 text-[13px] cursor-pointer">
              <input type="checkbox" checked={form.isFeatured} onChange={e => setField('isFeatured', e.target.checked)} />
              Featured on homepage
            </label>
          </div>

          {/* ── IDs — auto-filled from the name, editable if needed ───────── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Slug *</label>
              <input className="input" value={form.slug} onChange={e => { setIdsTouched(true); setField('slug', e.target.value); }} required placeholder="auto-filled from name" />
            </div>
            <div>
              <label className="admin-label">SKU *</label>
              <input className="input" value={form.sku} onChange={e => { setIdsTouched(true); setField('sku', e.target.value); }} required placeholder="auto-filled from name" />
            </div>
          </div>

          {/* ── Specs — collapsed by default, open when you need them ─────── */}
          <details className="group rounded-xl border border-white/10">
            <summary className="cursor-pointer select-none px-4 py-3 text-[13px] text-neutral-300 hover:text-white flex items-center justify-between">
              Memory specs & details
              <span className="text-neutral-600 text-[11px] group-open:hidden">Show</span>
              <span className="text-neutral-600 text-[11px] hidden group-open:inline">Hide</span>
            </summary>
            <div className="px-4 pb-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="admin-label">Line</label>
                  <input className="input" value={form.line} onChange={e => setField('line', e.target.value)} />
                </div>
                <div>
                  <label className="admin-label">Generation</label>
                  <select className="input" value={form.generation} onChange={e => setField('generation', e.target.value)}>
                    <option>DDR4</option>
                    <option>DDR5</option>
                  </select>
                </div>
                <div>
                  <label className="admin-label">Form factor</label>
                  <select className="input" value={form.formFactor} onChange={e => setField('formFactor', e.target.value)}>
                    <option>UDIMM</option>
                    <option>SO-DIMM</option>
                    <option>RDIMM</option>
                    <option>LRDIMM</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="admin-label">Capacity (GB)</label>
                  <input type="number" className="input" value={form.capacity} onChange={e => setField('capacity', e.target.value)} />
                </div>
                <div>
                  <label className="admin-label">Capacity label</label>
                  <input className="input" value={form.capacityLabel} onChange={e => setField('capacityLabel', e.target.value)} placeholder="16GB" />
                </div>
                <div>
                  <label className="admin-label">Speed (MT/s)</label>
                  <input type="number" className="input" value={form.speed} onChange={e => setField('speed', e.target.value)} />
                </div>
                <div>
                  <label className="admin-label">Speed label</label>
                  <input className="input" value={form.speedLabel} onChange={e => setField('speedLabel', e.target.value)} placeholder="3200 MT/s" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="admin-label">CAS</label>
                  <input className="input" value={form.cas} onChange={e => setField('cas', e.target.value)} placeholder="CL16" />
                </div>
                <div>
                  <label className="admin-label">Timings</label>
                  <input className="input" value={form.timings} onChange={e => setField('timings', e.target.value)} placeholder="16-18-18-38" />
                </div>
                <div>
                  <label className="admin-label">Voltage</label>
                  <input className="input" value={form.voltage} onChange={e => setField('voltage', e.target.value)} placeholder="1.35V" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="admin-label">Condition</label>
                  <input className="input" value={form.condition} onChange={e => setField('condition', e.target.value)} />
                </div>
                <div>
                  <label className="admin-label">Warranty</label>
                  <input className="input" value={form.warranty} onChange={e => setField('warranty', e.target.value)} />
                </div>
              </div>

              <div>
                <label className="admin-label">Tags (comma-separated)</label>
                <input className="input" value={Array.isArray(form.tags) ? form.tags.join(', ') : form.tags} onChange={e => setField('tags', e.target.value)} placeholder="DDR4, Desktop, XMP" />
              </div>

              <div>
                <label className="admin-label">Compatibility (one per line)</label>
                <textarea className="input min-h-[60px]" value={Array.isArray(form.compatibility) ? form.compatibility.join('\n') : form.compatibility} onChange={e => setField('compatibility', e.target.value)} />
              </div>

              <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                <input type="checkbox" checked={form.ecc} onChange={e => setField('ecc', e.target.checked)} />
                ECC memory
              </label>
            </div>
          </details>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Save changes' : 'Create product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalProduct, setModalProduct] = useState(null); // null = closed, {} = new, {...} = edit
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();

  // Quick action: /admin/products?new=1 opens the Add modal directly
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setModalProduct({});
      setModalOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const load = (p = page, q = search) => {
    setLoading(true);
    adminApi.listProducts({ page: p, limit: 15, search: q || undefined })
      .then(({ data }) => {
        setProducts(data.products);
        setPagination(data.pagination);
      })
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load(1, search);
  };

  const handleSave = (product) => {
    setModalOpen(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this product?')) return;
    setDeletingId(id);
    try {
      await adminApi.deleteProduct(id);
      toast.success('Product deactivated');
      load();
    } catch {
      toast.error('Failed to deactivate');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Products</h1>
            <p className="text-neutral-500 text-[13px] mt-0.5">{pagination.total} total products</p>
          </div>
          <button
            onClick={() => { setModalProduct({}); setModalOpen(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={14} />
            Add product
          </button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              className="input pl-9"
              placeholder="Search products…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-secondary">Search</button>
        </form>

        {/* Table */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-neutral-500 text-[11px] uppercase tracking-widest border-b border-white/5">
                  <th className="text-left p-4 font-normal">Product</th>
                  <th className="text-left p-4 font-normal">SKU</th>
                  <th className="text-left p-4 font-normal">Gen</th>
                  <th className="text-right p-4 font-normal">Price</th>
                  <th className="text-right p-4 font-normal">Stock</th>
                  <th className="text-center p-4 font-normal">Status</th>
                  <th className="text-right p-4 font-normal">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-neutral-500">
                      <Loader2 size={16} className="animate-spin inline mr-2" />
                      Loading…
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-neutral-500">No products found</td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p._id} className="hover:bg-white/2 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 shrink-0">
                            {p.images?.[0] ? (
                              <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-600">
                                <ImageIcon size={14} />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium line-clamp-1">{p.name}</div>
                            <div className="mono text-[10px] text-neutral-500">{p.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 mono text-[11px] text-neutral-400">{p.sku}</td>
                      <td className="p-4">
                        <span className="pill pill-blue text-[10px] py-0.5">{p.generation}</span>
                      </td>
                      <td className="p-4 text-right mono">${p.price.toFixed(2)}</td>
                      <td className="p-4 text-right">
                        <span className={`font-medium ${p.stockQuantity === 0 ? 'text-red-400' : p.stock === 'low' ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {p.stockQuantity}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {p.isActive ? (
                          <span className="pill pill-accent text-[10px] py-0.5">Active</span>
                        ) : (
                          <span className="pill text-[10px] py-0.5 text-neutral-500">Inactive</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/shop/${p.slug}`}
                            target="_blank"
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-white/5 transition-colors"
                            title="View on store"
                          >
                            <ChevronRight size={13} />
                          </Link>
                          <button
                            onClick={() => { setModalProduct(p); setModalOpen(true); }}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-white/5 transition-colors"
                            title="Edit product"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(p._id)}
                            disabled={deletingId === p._id}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Deactivate"
                          >
                            {deletingId === p._id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-white/5 text-[13px]">
              <span className="text-neutral-500">
                Page {pagination.page} of {pagination.pages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="btn-ghost py-1.5 px-3 flex items-center gap-1"
                >
                  <ChevronLeft size={13} /> Prev
                </button>
                <button
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={page >= pagination.pages}
                  className="btn-ghost py-1.5 px-3 flex items-center gap-1"
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <ProductModal
          product={modalProduct}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </AdminLayout>
  );
}
