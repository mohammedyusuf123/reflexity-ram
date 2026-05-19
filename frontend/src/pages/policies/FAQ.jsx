import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SectionLabel from "@/components/SectionLabel";
import { useSEO } from "@/lib/seo";

const CATEGORIES = [
  {
    title: "Compatibility",
    items: [
      {
        q: "Will this RAM work in my motherboard?",
        a: "Every product page lists known-compatible platforms. For DDR5 above 6000 MT/s, always cross-reference your motherboard's official QVL — compatibility is board-and-CPU-dependent at high speeds.",
      },
      {
        q: "Can I mix kits?",
        a: "We don't recommend mixing different kits even if specs match. Even modules from the same SKU pulled separately can have different binning. For best stability, buy a single kit at the capacity you need.",
      },
      {
        q: "Will DDR5-6000 boot if my CPU is rated for DDR5-4800?",
        a: "Yes. All EXPO/XMP kits boot at the JEDEC base speed without the profile enabled. You enable the rated speed in BIOS.",
      },
    ],
  },
  {
    title: "Orders & shipping",
    items: [
      {
        q: "How fast do orders ship?",
        a: "Orders are typically processed within 1–2 business days after purchase. Exact timing depends on inventory and order type.",
      },
      {
        q: "Do you ship internationally?",
        a: "International shipping availability may vary by region. Any duties, taxes, or import fees are the responsibility of the customer.",
      },
      {
        q: "Can I change my order after placing it?",
        a: "Contact us as soon as possible after placing your order and we'll do our best to help. After dispatch, you'll need to return and re-order.",
      },
    ],
  },
  {
    title: "Returns & warranty",
    items: [
      {
        q: "What if my module is dead on arrival?",
        a: "Contact reflexityram@gmail.com with your order details and a description of the issue. We'll help troubleshoot and work toward a resolution.",
      },
      {
        q: "How long is the warranty?",
        a: "Warranty coverage varies by product and condition. Details are listed on each product page.",
      },
      {
        q: "Does overclocking void the warranty?",
        a: "Running modules at their rated XMP/EXPO speed is generally covered. Damage from improper installation, unsupported voltage, or extreme overclocking is not covered.",
      },
    ],
  },
  {
    title: "Wholesale",
    items: [
      {
        q: "Do you offer wholesale pricing?",
        a: "Yes — we work with bulk orders. Email reflexityram@gmail.com with the SKUs and quantities you need and we'll provide a quote.",
      },
      {
        q: "Can you source SKUs not in your catalog?",
        a: "We may be able to help. Send us the part number and we'll let you know about availability and pricing.",
      },
      {
        q: "Do you offer NET-30 terms?",
        a: "For wholesale inquiries, contact reflexityram@gmail.com to discuss your specific needs.",
      },
    ],
  },
];

export default function FAQ() {
  useSEO({ title: "FAQ" });
  const [open, setOpen] = useState({});

  return (
    <>
      <Header />
      <main className="page" data-testid="faq-page">
        <div className="container-tight pt-12 pb-16">
          <SectionLabel num="03">FAQ</SectionLabel>
          <h1 className="display-2 display-grad mt-4 mb-4">Common questions.</h1>
          <p className="text-neutral-400 max-w-2xl leading-relaxed">
            Can't find what you're looking for?{" "}
            <a href="mailto:reflexityram@gmail.com" className="text-white underline underline-offset-4">
              Email us
            </a>{" "}
            — we're happy to help.
          </p>

          <div className="mt-12 grid gap-10 max-w-3xl">
            {CATEGORIES.map((cat) => (
              <section key={cat.title} data-testid={`faq-cat-${cat.title.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
                <h2 className="text-xl font-semibold tracking-tight mb-4">{cat.title}</h2>
                <div className="flex flex-col gap-2">
                  {cat.items.map((it, idx) => {
                    const key = `${cat.title}-${idx}`;
                    const isOpen = !!open[key];
                    return (
                      <div key={key} className="glass rounded-xl overflow-hidden" data-testid={`faq-item-${key}`}>
                        <button
                          onClick={() => setOpen((o) => ({ ...o, [key]: !isOpen }))}
                          className="w-full flex items-center justify-between gap-4 p-5 text-left"
                          data-testid={`faq-toggle-${key}`}
                        >
                          <span className="text-[14px] font-medium">{it.q}</span>
                          <ChevronDown
                            size={16}
                            className="text-neutral-400 transition-transform shrink-0"
                            style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}
                          />
                        </button>
                        {isOpen && (
                          <div className="px-5 pb-5 -mt-1 text-[13.5px] text-neutral-400 leading-relaxed">
                            {it.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
