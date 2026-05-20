import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft, Upload, X, Loader2, Check, AlertTriangle, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { adminApi } from '@/lib/api';

// ─── Image Uploader ────────────────────────────────────────────────────────────
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
          <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden bg-white/5 group">
            <img src={img.url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(img, idx)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={11} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-24 h-24 rounded-xl border border-dashed border-white/20 hover:border-white/40 flex flex-col items-center justify-center gap-1.5 text-neutral-500 hover:text-white transition-all"
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
          <span className="text-[10px]">{uploading ? 'Uploading' : 'Add image'}</span>
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

// ─── Field helpers ─────────────────────────────────────────────────────────────
function Field({ label, children, hint }) {
  return (
    <div>
      <label className="admin-label">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-neutral-500 mt-1">{hint}</p>}
    </div>
  );
}

// ─── Main Edit Page ────────────────────────────────────────────────────────────
export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setDirty(true);
  };

  // Load product by ID from admin endpoint
  useEffect(() => {
    setLoading(true);
    adminApi.getProduct(id)
      .then(({ data }) => {
        const p = data.product;
        if (!p) { toast.error('Product not found'); navigate('/admin/products'); return; }
        setProduct(p);
        setForm({
          ...p,
          tags: Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || ''),
          compatibility: Array.isArray(p.compatibility) ? p.compatibility.join('\n') : (p.compatibility || ''),
          included: Array.isArray(p.included) ? p.included.join('\n') : (p.included || ''),
          compareAt: p.compareAt || '',
          description: p.description || '',
          kit: p.kit || '',
          rank: p.rank || '',
          profile: p.profile || '',
          heatspreader: p.heatspreader || '',
          estimatedDispatch: p.estimatedDispatch || '1–2 business days',
          stockLabel: p.stockLabel || '',
          metaTitle: p.metaTitle || '',
          metaDescription: p.metaDescription || '',
        });
      })
      .catch(() => { toast.error('Failed to load product'); navigate('/admin/products'); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const data = {
        ...form,
        tags: typeof form.tags === 'string'
          ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
          : form.tags,
        compatibility: typeof form.compatibility === 'string'
          ? form.compatibility.split('\n').map(t => t.trim()).filter(Boolean)
          : form.compatibility,
        included: typeof form.included === 'string'
          ? form.included.split('\n').map(t => t.trim()).filter(Boolean)
          : form.included,
        compareAt: form.compareAt ? Number(form.compareAt) : undefined,
        capacity: Number(form.capacity),
        speed: Number(form.speed),
        price: Number(form.price),
        stockQuantity: Number(form.stockQuantity),
      };

      // Remove _id and internal fields from the update payload
      const { _id, __v, createdAt, updatedAt, slug, sku, stock, ...updateData } = data;

      await adminApi.updateProduct(id, updateData);
      toast.success('Product saved');
      setDirty(false);
    } catch (err) {
      const details = err.response?.data?.details;
      if (details) details.forEach(d => toast.error(d.message));
      else toast.error(err.response?.data?.error || 'Save failed');
      console.error('Save error:', err.response?.data || err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-8 flex items-center gap-2 text-neutral-400">
          <Loader2 size={16} className="animate-spin" /> Loading product…
        </div>
      </AdminLayout>
    );
  }

  if (!form) return null;

  return (
    <AdminLayout>
      <div className="p-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <Link
              to="/admin/products"
              className="flex items-center gap-1.5 text-neutral-500 hover:text-white text-[13px] mb-3 transition-colors"
            >
              <ChevronLeft size={14} /> Back to products
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Edit product</h1>
            <p className="text-neutral-500 text-[13px] mt-1 font-mono">{product?.slug}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/shop/${product?.slug}`}
              target="_blank"
              className="btn-ghost text-[13px] flex items-center gap-1.5"
            >
              View on store <ExternalLink size={12} />
            </Link>
            {dirty && (
              <span className="text-[11px] text-amber-400 flex items-center gap-1">
                <AlertTriangle size={11} /> Unsaved changes
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          {/* Images */}
          <section className="glass rounded-2xl p-6">
            <h2 className="font-semibold text-[14px] mb-4">Product images</h2>
            <ImageUploader
              images={form.images || []}
              onChange={imgs => set('images', imgs)}
            />
            <p className="text-[11px] text-neutral-500 mt-2">
              First image is used as the main product photo. Drag to reorder (coming soon).
            </p>
          </section>

          {/* Basic info */}
          <section className="glass rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-[14px] mb-2">Basic information</h2>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Slug (URL)" hint="Cannot be changed after creation">
                <input
                  className="input opacity-60 cursor-not-allowed"
                  value={form.slug}
                  readOnly
                />
              </Field>
              <Field label="SKU">
                <input className="input opacity-60 cursor-not-allowed" value={form.sku} readOnly />
              </Field>
            </div>

            <Field label="Product name *">
              <input
                className="input"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                required
              />
            </Field>

            <Field label="Description" hint="Appears on the product page. Supports plain text.">
              <textarea
                className="input min-h-[120px] resize-y"
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Describe the product, its benefits, what's in the box, etc."
              />
            </Field>

            <div className="grid grid-cols-3 gap-4">
              <Field label="Line / Series">
                <input className="input" value={form.line} onChange={e => set('line', e.target.value)} />
              </Field>
              <Field label="Generation">
                <select className="input" value={form.generation} onChange={e => set('generation', e.target.value)}>
                  <option>DDR4</option>
                  <option>DDR5</option>
                </select>
              </Field>
              <Field label="Form factor">
                <select className="input" value={form.formFactor} onChange={e => set('formFactor', e.target.value)}>
                  <option>UDIMM</option>
                  <option>SO-DIMM</option>
                  <option>RDIMM</option>
                  <option>LRDIMM</option>
                </select>
              </Field>
            </div>
          </section>

          {/* Specs */}
          <section className="glass rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-[14px] mb-2">Technical specs</h2>

            <div className="grid grid-cols-4 gap-4">
              <Field label="Capacity (GB)">
                <input type="number" className="input" value={form.capacity} onChange={e => set('capacity', e.target.value)} />
              </Field>
              <Field label="Capacity label" hint='e.g. "16GB"'>
                <input className="input" value={form.capacityLabel} onChange={e => set('capacityLabel', e.target.value)} />
              </Field>
              <Field label="Kit config" hint='e.g. "2 x 8GB"'>
                <input className="input" value={form.kit} onChange={e => set('kit', e.target.value)} placeholder="2 x 16GB" />
              </Field>
              <Field label="Speed (MT/s)">
                <input type="number" className="input" value={form.speed} onChange={e => set('speed', e.target.value)} />
              </Field>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <Field label="Speed label" hint='e.g. "3200 MT/s"'>
                <input className="input" value={form.speedLabel} onChange={e => set('speedLabel', e.target.value)} />
              </Field>
              <Field label="CAS">
                <input className="input" value={form.cas} onChange={e => set('cas', e.target.value)} placeholder="CL16" />
              </Field>
              <Field label="Timings">
                <input className="input" value={form.timings} onChange={e => set('timings', e.target.value)} placeholder="16-18-18-38" />
              </Field>
              <Field label="Voltage">
                <input className="input" value={form.voltage} onChange={e => set('voltage', e.target.value)} placeholder="1.35V" />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Field label="Rank">
                <input className="input" value={form.rank} onChange={e => set('rank', e.target.value)} placeholder="Single Rank" />
              </Field>
              <Field label="Profile">
                <input className="input" value={form.profile} onChange={e => set('profile', e.target.value)} placeholder="XMP 2.0" />
              </Field>
              <Field label="Heatspreader">
                <input className="input" value={form.heatspreader} onChange={e => set('heatspreader', e.target.value)} placeholder="Aluminum, low-profile" />
              </Field>
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-[13px] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!form.ecc}
                  onChange={e => set('ecc', e.target.checked)}
                  className="accent-white"
                />
                ECC memory
              </label>
              <label className="flex items-center gap-2 text-[13px] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!form.rgb}
                  onChange={e => set('rgb', e.target.checked)}
                  className="accent-white"
                />
                RGB lighting
              </label>
            </div>
          </section>

          {/* Pricing & stock */}
          <section className="glass rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-[14px] mb-2">Pricing & inventory</h2>

            <div className="grid grid-cols-3 gap-4">
              <Field label="Price ($) *">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="input"
                  value={form.price}
                  onChange={e => set('price', e.target.value)}
                  required
                />
              </Field>
              <Field label="Compare-at price ($)" hint="Shown as original/strikethrough price">
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={form.compareAt || ''}
                  onChange={e => set('compareAt', e.target.value)}
                />
              </Field>
              <Field label="Stock quantity *">
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={form.stockQuantity}
                  onChange={e => set('stockQuantity', e.target.value)}
                  required
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Stock label override" hint="Leave blank to auto-compute from quantity">
                <input
                  className="input"
                  value={form.stockLabel || ''}
                  onChange={e => set('stockLabel', e.target.value)}
                  placeholder="Auto (In stock / Low stock / Out of stock)"
                />
              </Field>
              <Field label="Estimated dispatch">
                <input
                  className="input"
                  value={form.estimatedDispatch}
                  onChange={e => set('estimatedDispatch', e.target.value)}
                  placeholder="1–2 business days"
                />
              </Field>
            </div>
          </section>

          {/* Details & compatibility */}
          <section className="glass rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-[14px] mb-2">Details & compatibility</h2>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Condition">
                <input className="input" value={form.condition} onChange={e => set('condition', e.target.value)} />
              </Field>
              <Field label="Warranty">
                <input className="input" value={form.warranty} onChange={e => set('warranty', e.target.value)} />
              </Field>
            </div>

            <Field label="Tags" hint="Comma-separated, e.g. DDR4, Desktop, XMP">
              <input
                className="input"
                value={Array.isArray(form.tags) ? form.tags.join(', ') : form.tags}
                onChange={e => set('tags', e.target.value)}
                placeholder="DDR4, Desktop, XMP"
              />
            </Field>

            <Field label="Compatible with" hint="One system/platform per line">
              <textarea
                className="input min-h-[80px] resize-y"
                value={Array.isArray(form.compatibility) ? form.compatibility.join('\n') : form.compatibility}
                onChange={e => set('compatibility', e.target.value)}
                placeholder={"AMD Ryzen 7000 (AM5)\nIntel 12th/13th gen (LGA1700)"}
              />
            </Field>

            <Field label="What's in the box" hint="One item per line">
              <textarea
                className="input min-h-[80px] resize-y"
                value={Array.isArray(form.included) ? form.included.join('\n') : form.included}
                onChange={e => set('included', e.target.value)}
                placeholder={"2 × DDR5 UDIMM modules\nQuick-start guide"}
              />
            </Field>
          </section>

          {/* SEO & visibility */}
          <section className="glass rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-[14px] mb-2">SEO & visibility</h2>

            <Field label="Meta title" hint="Defaults to product name if blank">
              <input className="input" value={form.metaTitle} onChange={e => set('metaTitle', e.target.value)} />
            </Field>
            <Field label="Meta description">
              <textarea
                className="input min-h-[60px] resize-y"
                value={form.metaDescription}
                onChange={e => set('metaDescription', e.target.value)}
              />
            </Field>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-[13px] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isFeatured !== false && !!form.isFeatured}
                  onChange={e => set('isFeatured', e.target.checked)}
                  className="accent-white"
                />
                Featured product
              </label>
              <label className="flex items-center gap-2 text-[13px] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isActive !== false}
                  onChange={e => set('isActive', e.target.checked)}
                  className="accent-white"
                />
                Active (visible on store)
              </label>
            </div>
          </section>

          {/* Save bar */}
          <div className="flex items-center gap-3 py-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex items-center gap-2 px-8"
            >
              {saving ? (
                <><Loader2 size={14} className="animate-spin" /> Saving…</>
              ) : (
                <><Check size={14} /> Save changes</>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/products')}
              className="btn-ghost"
            >
              Cancel
            </button>
            {dirty && !saving && (
              <span className="text-[12px] text-amber-400 flex items-center gap-1 ml-2">
                <AlertTriangle size={12} /> You have unsaved changes
              </span>
            )}
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
