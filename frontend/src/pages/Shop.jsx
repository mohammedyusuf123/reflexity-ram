import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, X, SlidersHorizontal, Inbox } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import EmptyState from "@/components/EmptyState";
import { PRODUCTS, filterOptions } from "@/lib/data";
import { useSEO } from "@/lib/seo";

const SORTS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low → High" },
  { value: "price-desc", label: "Price: High → Low" },
  { value: "speed-desc", label: "Speed: Fast → Slow" },
  { value: "capacity-desc", label: "Capacity: High → Low" },
];

export default function Shop() {
  useSEO({
    title: "Shop memory",
    description: "Browse DDR4 / DDR5 / Server / Laptop memory. Spec-first search with full filter set.",
  });
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  const q = params.get("q") || "";
  const gen = params.getAll("gen");
  const form = params.getAll("form");
  const cap = params.getAll("cap").map(Number);
  const cond = params.getAll("cond");
  const eccOnly = params.get("ecc") === "true";
  const sort = params.get("sort") || "featured";

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, []);

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value === null || value === undefined || value === "") next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const toggleArr = (key, value) => {
    const next = new URLSearchParams(params);
    const existing = next.getAll(key);
    if (existing.includes(String(value))) {
      next.delete(key);
      existing.filter((v) => v !== String(value)).forEach((v) => next.append(key, v));
    } else {
      next.append(key, String(value));
    }
    setParams(next, { replace: true });
  };

  const clearAll = () => setParams(new URLSearchParams(), { replace: true });

  const filtered = useMemo(() => {
    let out = PRODUCTS.filter((p) => {
      if (gen.length && !gen.includes(p.generation)) return false;
      if (form.length && !form.includes(p.formFactor)) return false;
      if (cap.length && !cap.includes(p.capacity)) return false;
      if (cond.length && !cond.includes(p.condition)) return false;
      if (eccOnly && !p.ecc) return false;
      if (q) {
        const hay = [
          p.sku,
          p.name,
          p.line,
          p.generation,
          p.formFactor,
          p.speedLabel,
          p.cas,
          p.timings,
          p.capacityLabel,
          p.ecc ? "ECC" : "",
          ...(p.tags || []),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });

    switch (sort) {
      case "price-asc":
        out = [...out].sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        out = [...out].sort((a, b) => b.price - a.price);
        break;
      case "speed-desc":
        out = [...out].sort((a, b) => b.speed - a.speed);
        break;
      case "capacity-desc":
        out = [...out].sort((a, b) => b.capacity - a.capacity);
        break;
      default:
        break;
    }
    return out;
  }, [q, gen, form, cap, cond, eccOnly, sort]);

  const activeCount =
    gen.length + form.length + cap.length + cond.length + (eccOnly ? 1 : 0) + (q ? 1 : 0);

  const FilterBody = () => (
    <div className="flex flex-col gap-6">
      <FilterGroup title="Generation">
        {filterOptions.generation.map((g) => (
          <FilterCheck
            key={g}
            label={g}
            checked={gen.includes(g)}
            onChange={() => toggleArr("gen", g)}
            testId={`filter-gen-${g}`}
          />
        ))}
      </FilterGroup>
      <FilterGroup title="Form factor">
        {filterOptions.formFactor.map((f) => (
          <FilterCheck
            key={f}
            label={f}
            checked={form.includes(f)}
            onChange={() => toggleArr("form", f)}
            testId={`filter-form-${f}`}
          />
        ))}
      </FilterGroup>
      <FilterGroup title="Capacity">
        {filterOptions.capacity.map((c) => (
          <FilterCheck
            key={c}
            label={`${c}GB`}
            checked={cap.includes(c)}
            onChange={() => toggleArr("cap", c)}
            testId={`filter-cap-${c}`}
          />
        ))}
      </FilterGroup>
      <FilterGroup title="Condition">
        {filterOptions.condition.map((c) => (
          <FilterCheck
            key={c}
            label={c}
            checked={cond.includes(c)}
            onChange={() => toggleArr("cond", c)}
            testId={`filter-cond-${c}`}
          />
        ))}
      </FilterGroup>
      <FilterGroup title="ECC">
        <FilterCheck
          label="ECC only"
          checked={eccOnly}
          onChange={() => update("ecc", eccOnly ? null : "true")}
          testId="filter-ecc-only"
        />
      </FilterGroup>
    </div>
  );

  return (
    <>
      <Header />
      <main className="page" data-testid="shop-page">
        <div className="container-tight pt-10 pb-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <div className="section-label" data-testid="shop-section-label">
                <span className="num">02</span> / Shop
              </div>
              <h1 className="display-2 display-grad mt-3">All memory.</h1>
              <p className="text-[14px] text-neutral-500 mt-2">
                {filtered.length} {filtered.length === 1 ? "module" : "modules"} ·
                spec-first browsing
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={sort}
                onChange={(e) => update("sort", e.target.value)}
                className="select py-2.5 text-[13px] w-auto"
                data-testid="shop-sort-select"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value} className="bg-black">
                    {s.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowFilters(true)}
                className="md:hidden btn-secondary py-2.5 px-4 text-[13px] gap-2"
                data-testid="shop-mobile-filter-btn"
              >
                <SlidersHorizontal size={14} />
                Filters {activeCount > 0 && <span className="mono text-[10px]">({activeCount})</span>}
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
            />
            <input
              type="text"
              value={q}
              onChange={(e) => update("q", e.target.value || null)}
              placeholder="Search by SKU, spec, generation, CAS, ECC…"
              className="input pl-11 py-3.5 text-[14px]"
              data-testid="shop-search-input"
            />
            {q && (
              <button
                onClick={() => update("q", null)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full hover:bg-white/5 flex items-center justify-center text-neutral-400"
                data-testid="shop-search-clear"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {activeCount > 0 && (
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={clearAll}
                className="mono text-[11px] text-neutral-400 hover:text-white inline-flex items-center gap-1"
                data-testid="shop-clear-filters"
              >
                <X size={12} /> Clear filters ({activeCount})
              </button>
            </div>
          )}

          <div className="grid md:grid-cols-[260px_1fr] gap-8">
            {/* Desktop filters */}
            <aside className="hidden md:block" data-testid="shop-filters-sidebar">
              <FilterBody />
            </aside>

            {/* Products */}
            <div>
              {loading ? (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="shop-loading">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="glass rounded-xl overflow-hidden">
                      <div className="skeleton aspect-[5/4]" />
                      <div className="p-5 space-y-3">
                        <div className="skeleton h-3 w-1/3" />
                        <div className="skeleton h-4 w-4/5" />
                        <div className="skeleton h-3 w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title="No modules match these filters"
                  description="Try widening capacity, switching generation, or clearing filters."
                  ctaLabel="Clear filters"
                  ctaTo="/shop"
                  secondaryLabel="Email us"
                  secondaryTo="/support"
                  testId="shop-empty-state"
                />
              ) : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="shop-grid">
                  {filtered.map((p, i) => (
                    <ProductCard key={p.slug} p={p} index={i} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile filter drawer */}
        {showFilters && (
          <div
            className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm md:hidden"
            onClick={() => setShowFilters(false)}
            data-testid="mobile-filters-overlay"
          >
            <div
              className="absolute inset-y-0 right-0 w-full max-w-sm bg-[#0a0a0c] border-l border-white/10 p-6 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Filters</h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="w-9 h-9 rounded-full hover:bg-white/5 flex items-center justify-center"
                  data-testid="mobile-filters-close"
                >
                  <X size={16} />
                </button>
              </div>
              <FilterBody />
              <div className="sticky bottom-0 -mx-6 mt-8 px-6 py-4 bg-[#0a0a0c]/95 backdrop-blur border-t border-white/10 flex gap-2">
                <button
                  onClick={clearAll}
                  className="btn-secondary flex-1"
                  data-testid="mobile-filters-clear"
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="btn-primary flex-1"
                  data-testid="mobile-filters-apply"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

function FilterGroup({ title, children }) {
  return (
    <div>
      <div className="mono text-[10px] text-neutral-500 uppercase tracking-widest mb-3">
        {title}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function FilterCheck({ label, checked, onChange, testId }) {
  return (
    <label
      className="flex items-center gap-2.5 text-[13px] cursor-pointer group select-none"
      data-testid={testId}
    >
      <span
        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
          checked
            ? "bg-white border-white"
            : "border-white/20 group-hover:border-white/40 bg-transparent"
        }`}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2 6.5L4.8 9 10 3.5" stroke="#050505" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span className="text-neutral-300 group-hover:text-white">{label}</span>
    </label>
  );
}
