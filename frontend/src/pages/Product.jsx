import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Minus,
  Plus,
  ShoppingCart,
  Truck,
  Shield,
  Copy,
  Check,
  AlertTriangle,
  Package,
} from "lucide-react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ImageModal from "@/components/ImageModal";
import ProductCard from "@/components/ProductCard";
import RestockSignup from "@/components/RestockSignup";
import EmptyState from "@/components/EmptyState";
import { PRODUCTS, findProduct } from "@/lib/data";
import { useCart, useRecentlyViewed } from "@/lib/store";
import useAuthStore from "@/lib/authStore";
import { useSEO } from "@/lib/seo";
import { productsApi } from "@/lib/api";

const TABS = [
  { id: "specs", label: "Specifications" },
  { id: "compat", label: "Compatibility" },
  { id: "shipping", label: "Shipping" },
  { id: "warranty", label: "Warranty" },
];

export default function Product() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const p = findProduct(slug);
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const [tab, setTab] = useState("specs");
  const [modalOpen, setModalOpen] = useState(false);
  const [skuCopied, setSkuCopied] = useState(false);
  const addItem = useCart((s) => s.addItem);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const addViewed = useRecentlyViewed((s) => s.add);
  const recentSlugs = useRecentlyViewed((s) => s.slugs);

  useSEO({
    title: p?.name,
    description: p ? `${p.name} — ${p.generation} ${p.formFactor} · ${p.speedLabel} · ${p.cas} · ${p.condition}.` : null,
  });

  useEffect(() => {
    if (p) addViewed(p.slug);
  }, [p, addViewed]);

  const related = useMemo(() => {
    if (!p) return [];
    return PRODUCTS.filter((x) => x.slug !== p.slug && x.generation === p.generation).slice(0, 3);
  }, [p]);

  const recentlyViewed = useMemo(() => {
    return recentSlugs
      .filter((s) => s !== slug)
      .map((s) => findProduct(s))
      .filter(Boolean)
      .slice(0, 4);
  }, [recentSlugs, slug]);

  if (!p) {
    return (
      <>
        <Header />
        <main className="page" data-testid="product-not-found">
          <div className="container-tight pt-16">
            <EmptyState
              icon={Package}
              title="Module not found"
              description="That SKU isn't in our catalog. Browse all memory or contact us with the part number you need."
              ctaLabel="Back to shop"
              ctaTo="/shop"
              secondaryLabel="Email us"
              secondaryTo="/support"
            />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const addToCart = async () => {
    const result = await addItem(p.slug, qty);
    if (result && !result.success) {
      toast.error(result.message || 'Failed to add to cart');
      return;
    }
    toast.success("Added to cart", {
      description: `${qty} × ${p.name}`,
      icon: <Check size={16} className="text-emerald-400" />,
    });
  };

  const buyNow = async () => {
    const result = await addItem(p.slug, qty);
    if (result && !result.success) {
      toast.error(result.message || 'Failed to add to cart');
      return;
    }
    navigate("/checkout");
  };

  // For admin: find product ID for edit link
  const [productId, setProductId] = useState(null);
  useEffect(() => {
    // Fetch the product ID from API for admin edit link
    if (isAdmin()) {
      productsApi.getBySlug(p?.slug).then(({ data }) => {
        setProductId(data?.product?._id);
      }).catch(() => {});
    }
  }, [p?.slug]);

  const copySku = async () => {
    try {
      await navigator.clipboard.writeText(p.sku);
    } catch {
      /* noop */
    }
    setSkuCopied(true);
    toast.success("SKU copied", { description: p.sku });
    setTimeout(() => setSkuCopied(false), 1800);
  };

  return (
    <>
      <Header />
      <main className="page pb-32 md:pb-16" data-testid="product-page">
        <div className="container-tight pt-8">
          <Link
            to="/shop"
            className="inline-flex items-center gap-1.5 text-[12px] text-neutral-400 hover:text-white mb-6"
            data-testid="product-back-link"
          >
            <ChevronLeft size={14} /> Back to shop
          </Link>

          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14">
            {/* Gallery */}
            <div>
              <button
                className="block w-full glass rounded-2xl overflow-hidden aspect-[5/4] mb-3 cursor-zoom-in"
                onClick={() => setModalOpen(true)}
                data-testid="product-main-image-btn"
              >
                <img
                  src={p.images[imgIdx]}
                  alt={p.name}
                  className="w-full h-full object-cover"
                />
              </button>
              {p.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2" data-testid="product-thumbnails">
                  {p.images.map((src, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIdx(i)}
                      data-active={i === imgIdx}
                      className={`aspect-square rounded-lg overflow-hidden border ${
                        i === imgIdx ? "border-white/40" : "border-white/5 hover:border-white/20"
                      }`}
                      data-testid={`product-thumbnail-${i}`}
                    >
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right column */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="mono text-[11px] text-neutral-500 tracking-widest">{p.sku}</span>
                <button
                  onClick={copySku}
                  className="btn-ghost text-[11px]"
                  data-testid="product-copy-sku-btn"
                >
                  {skuCopied ? <Check size={11} /> : <Copy size={11} />}
                  {skuCopied ? "Copied" : "Copy"}
                </button>
              </div>

              {isAdmin() && productId && (
                <Link
                  to={`/admin/products/edit/${productId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-colors text-[12px] font-medium"
                >
                  <Pencil size={11} /> Edit this product
                </Link>
              )}
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-3">
                {p.name}
              </h1>
              <div className="text-[13px] text-neutral-500 mb-5">{p.line}</div>

              <div className="flex flex-wrap gap-1.5 mb-6">
                <span className="pill">{p.generation}</span>
                <span className="pill">{p.formFactor}</span>
                <span className="pill">{p.capacityLabel}</span>
                <span className="pill">{p.speedLabel}</span>
                <span className="pill">{p.cas}</span>
                {p.ecc && <span className="pill pill-accent">ECC</span>}
              </div>

              <div className="flex items-end gap-3 mb-2">
                <div className="text-4xl font-bold tracking-tight">${p.price.toFixed(2)}</div>
                {p.compareAt && p.compareAt > p.price && (
                  <div className="text-[13px] text-neutral-500 line-through mb-1.5">
                    ${p.compareAt.toFixed(2)}
                  </div>
                )}
                {p.compareAt && p.compareAt > p.price && (
                  <span className="pill pill-accent mb-1.5">
                    Save ${(p.compareAt - p.price).toFixed(0)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 mb-6">
                <span
                  className={`pill ${
                    p.stock === "low" ? "pill-amber" : p.stock === "out" ? "" : "pill-accent"
                  }`}
                  data-testid="product-stock-pill"
                >
                  <span
                    className={`dot ${
                      p.stock === "low" ? "dot-amber" : p.stock === "out" ? "dot-red" : "dot-green"
                    }`}
                  />
                  {p.stockLabel}
                </span>
                <span className="mono text-[11px] text-neutral-500">
                  Dispatch: {p.estimatedDispatch}
                </span>
              </div>

              {/* Qty + add to cart */}
              <div className="flex flex-wrap items-stretch gap-3 mb-5">
                <div className="flex items-center glass rounded-full overflow-hidden" data-testid="product-qty-stepper">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="px-4 py-2.5 hover:bg-white/5"
                    data-testid="product-qty-decrease"
                  >
                    <Minus size={14} />
                  </button>
                  <div className="px-4 mono text-sm min-w-[2ch] text-center" data-testid="product-qty-value">
                    {qty}
                  </div>
                  <button
                    onClick={() => setQty((q) => q + 1)}
                    className="px-4 py-2.5 hover:bg-white/5"
                    data-testid="product-qty-increase"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <button
                  onClick={addToCart}
                  className="btn-primary flex-1 sm:flex-none"
                  data-testid="product-add-to-cart-btn"
                >
                  <ShoppingCart size={15} /> Add to cart
                </button>
                <button
                  onClick={buyNow}
                  className="btn-secondary flex-1 sm:flex-none"
                  data-testid="product-buy-now-btn"
                >
                  Buy now
                </button>
              </div>

              {p.stock !== "in" && (
                <div className="mb-5" data-testid="product-restock-wrapper">
                  <RestockSignup slug={p.slug} sku={p.sku} />
                </div>
              )}

              {/* Trust strip */}
              <div className="grid sm:grid-cols-2 gap-3 mb-6">
                <div className="glass-soft rounded-xl p-4 flex items-start gap-3">
                  <Truck size={18} className="text-neutral-300 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[13px] font-medium">US-wide shipping</div>
                    <div className="text-[12px] text-neutral-500">
                      ESD-safe packaging · tracked delivery
                    </div>
                  </div>
                </div>
                <div className="glass-soft rounded-xl p-4 flex items-start gap-3">
                  <Shield size={18} className="text-neutral-300 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[13px] font-medium">{p.warranty}</div>
                    <div className="text-[12px] text-neutral-500">
                      Defect-replacement coverage
                    </div>
                  </div>
                </div>
              </div>

              <div className="mono text-[10.5px] text-neutral-600 leading-relaxed mt-4">
                {p.note}
              </div>
            </div>
          </div>

          {/* TABS */}
          <div className="mt-16 border-t border-white/5 pt-10">
            <div className="flex flex-wrap gap-1 mb-6" data-testid="product-tabs">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="tab-pill"
                  data-active={tab === t.id}
                  data-testid={`product-tab-${t.id}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="glass rounded-2xl p-6 md:p-8">
              {tab === "specs" && <SpecsTable p={p} />}
              {tab === "compat" && (
                <div data-testid="product-compat-content">
                  <ul className="space-y-2 text-[14px] text-neutral-300">
                    {p.compatibility.map((c, i) => (
                      <li key={i} className="flex gap-2.5 leading-relaxed">
                        <span className="dot dot-green mt-2 shrink-0" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 flex gap-2 p-3.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-[12px] text-amber-200 leading-relaxed">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    Always check your motherboard's official QVL list before
                    purchasing high-speed DDR5 — compatibility is
                    board-and-CPU-dependent.
                  </div>

                  <h4 className="text-[12px] mono text-neutral-500 tracking-widest mt-6 mb-3">
                    WHAT'S INCLUDED
                  </h4>
                  <ul className="space-y-1.5 text-[13.5px] text-neutral-400">
                    {p.included.map((i, k) => (
                      <li key={k} className="flex gap-2">
                        <span className="text-neutral-600">·</span>
                        {i}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {tab === "shipping" && (
                <div data-testid="product-shipping-content" className="space-y-3 text-[14px] text-neutral-300 leading-relaxed">
                  <p>Orders ship same-day for items placed before 1pm local time, otherwise within 1 business day.</p>
                  <p>All modules ship in static-shielded ESD-safe trays inside padded mailers.</p>
                  <p>
                    <Link to="/shipping" className="text-white underline underline-offset-4">
                      Full shipping policy →
                    </Link>
                  </p>
                </div>
              )}
              {tab === "warranty" && (
                <div data-testid="product-warranty-content" className="space-y-3 text-[14px] text-neutral-300 leading-relaxed">
                  <p>This SKU is covered by Reflexity's {p.warranty.toLowerCase()} warranty against manufacturing defects.</p>
                  <p>DOA modules within 30 days are replaced no-questions.</p>
                  <p>
                    <Link to="/warranty" className="text-white underline underline-offset-4">
                      Full warranty terms →
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Related */}
          {related.length > 0 && (
            <div className="mt-16">
              <div className="section-label mb-4">
                <span className="num">·</span> More {p.generation}
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="product-related">
                {related.map((r, i) => (
                  <ProductCard key={r.slug} p={r} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Recently viewed */}
          {recentlyViewed.length > 0 && (
            <div className="mt-16">
              <div className="section-label mb-4">
                <span className="num">·</span> Recently viewed
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="recently-viewed">
                {recentlyViewed.map((r, i) => (
                  <ProductCard key={r.slug} p={r} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky mobile buy bar */}
        <div
          className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-white/10 bg-black/85 backdrop-blur-xl px-4 py-3 flex items-center gap-3"
          data-testid="mobile-buy-bar"
        >
          <div className="flex-1">
            <div className="text-lg font-bold leading-none">${p.price.toFixed(2)}</div>
            <div className="text-[11px] text-neutral-500 mt-1 truncate">{p.sku}</div>
          </div>
          <div className="flex items-center glass rounded-full overflow-hidden">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2">
              <Minus size={12} />
            </button>
            <div className="px-2 mono text-[12px] min-w-[2ch] text-center">{qty}</div>
            <button onClick={() => setQty((q) => q + 1)} className="px-3 py-2">
              <Plus size={12} />
            </button>
          </div>
          <button
            onClick={addToCart}
            className="btn-primary py-2.5 px-4 text-[13px]"
            data-testid="mobile-add-to-cart"
          >
            Add
          </button>
        </div>
      </main>

      <ImageModal
        open={modalOpen}
        images={p.images}
        startIndex={imgIdx}
        onClose={() => setModalOpen(false)}
        alt={p.name}
      />
      <Footer />
    </>
  );
}

function SpecsTable({ p }) {
  const rows = [
    ["Generation", p.generation],
    ["Form Factor", p.formFactor],
    ["Capacity (kit)", p.capacityLabel],
    ["Kit Configuration", p.kit],
    ["Speed", p.speedLabel],
    ["CAS Latency", p.cas],
    ["Timings", p.timings],
    ["Voltage", p.voltage],
    ["ECC", p.ecc ? "Yes" : "No"],
    ["Register Type", p.formFactor === "RDIMM" || p.formFactor === "LRDIMM" ? p.formFactor : "Unbuffered"],
    ["Rank", p.rank],
    ["Profile", p.profile],
    ["Heatspreader", p.heatspreader],
    ["RGB", p.rgb ? "Yes" : "No"],
    ["Condition", p.condition],
    ["Warranty", p.warranty],
    ["SKU", p.sku],
  ];
  return (
    <div data-testid="product-specs-content">
      <div className="divide-y divide-white/5">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[160px_1fr] gap-4 py-2.5 text-[13.5px]">
            <div className="text-neutral-500">{k}</div>
            <div className="text-neutral-100">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
