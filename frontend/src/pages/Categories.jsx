import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useSEO } from "@/lib/seo";

const CATEGORIES = [
  {
    title: "Desktop DDR4",
    description: "UDIMM modules for desktop systems. DDR4 generation.",
    to: "/shop?gen=DDR4&form=UDIMM",
    badge: "DDR4 · UDIMM",
  },
  {
    title: "Desktop DDR5",
    description: "UDIMM modules for DDR5-capable desktop platforms.",
    to: "/shop?gen=DDR5&form=UDIMM",
    badge: "DDR5 · UDIMM",
  },
  {
    title: "Laptop DDR4",
    description: "SO-DIMM modules for laptops and mini-PCs. DDR4.",
    to: "/shop?gen=DDR4&form=SO-DIMM",
    badge: "DDR4 · SO-DIMM",
  },
  {
    title: "Laptop DDR5",
    description: "SO-DIMM modules for DDR5 laptops and compact systems.",
    to: "/shop?gen=DDR5&form=SO-DIMM",
    badge: "DDR5 · SO-DIMM",
  },
  {
    title: "Server ECC DDR4",
    description: "RDIMM and LRDIMM ECC registered memory. DDR4.",
    to: "/shop?gen=DDR4&form=RDIMM&ecc=true",
    badge: "DDR4 · RDIMM · ECC",
  },
  {
    title: "Server ECC DDR5",
    description: "RDIMM ECC registered memory for DDR5 server platforms.",
    to: "/shop?gen=DDR5&form=RDIMM&ecc=true",
    badge: "DDR5 · RDIMM · ECC",
  },
];

export default function Categories() {
  useSEO({
    title: "Shop RAM — Select a category",
    description:
      "Browse Reflexity RAM by category: Desktop DDR4, Desktop DDR5, Laptop, Server ECC.",
  });

  return (
    <>
      <Header />
      <main className="page" data-testid="categories-page">
        <div className="container-tight py-14 md:py-20">

          {/* Page header */}
          <div className="mb-10 border-b border-white/5 pb-8">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Shop RAM
            </h1>
            <p className="text-neutral-400 text-[14px] mt-2">
              Select a category to browse available stock.
            </p>
          </div>

          {/* Category grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="categories-grid">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.title}
                to={cat.to}
                className="group border border-white/8 rounded-xl p-6 hover:border-white/20 hover:bg-white/[0.02] transition-all"
                data-testid={`category-card-${cat.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <h2 className="text-[15px] font-semibold tracking-tight leading-snug">
                    {cat.title}
                  </h2>
                  <ArrowRight
                    size={15}
                    className="shrink-0 text-neutral-600 group-hover:text-white transition-colors mt-0.5"
                  />
                </div>
                <p className="text-[13px] text-neutral-500 leading-relaxed mb-4">
                  {cat.description}
                </p>
                <span className="inline-block font-mono text-[11px] text-neutral-600 border border-white/8 rounded px-2 py-0.5">
                  {cat.badge}
                </span>
              </Link>
            ))}
          </div>

          {/* Wholesale / custom inquiry */}
          <div className="mt-10 border border-white/8 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="text-[14px] font-semibold mb-1">
                Need a specific part number?
              </div>
              <div className="text-[13px] text-neutral-500">
                Wholesale orders, server pulls, or QVL-matched kits — email us and we'll source it.
              </div>
            </div>
            <a
              href="https://mail.google.com/mail/u/0/?fs=1&to=reflexityram@gmail.com&su=Reflexity+RAM+%E2%80%94+Inquiry&tf=cm"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary shrink-0 text-[13px]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              Email to inquire
            </a>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
