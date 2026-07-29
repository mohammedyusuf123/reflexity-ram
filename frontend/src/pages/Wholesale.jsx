import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Copy, Check, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useSEO } from "@/lib/seo";

/**
 * Wholesale / bulk landing page.
 *
 * Built from the previous storefront home page, retargeted at bulk-buyer
 * search intent ("wholesale server ram", "bulk ddr4 supplier") so the retail
 * storefront at / stays focused on individual buyers.
 */

const SUPPORT_EMAIL = "reflexityram@gmail.com";
const GMAIL_COMPOSE_URL =
  "https://mail.google.com/mail/u/0/?fs=1&to=reflexityram@gmail.com&su=Reflexity+RAM+%E2%80%94+Wholesale+inquiry&tf=cm";

const STATS = [
  { label: "Focus", value: "Server pulls" },
  { label: "Generations", value: "DDR4 · DDR5" },
  { label: "Form factors", value: "RDIMM · LRDIMM" },
  { label: "Ships from", value: "Toronto, CA" },
];

const TERMS = [
  {
    title: "Tell us the SKU and quantity",
    body: "Give us the part number and how many you need. If we don't have it on the shelf we'll tell you whether we can source it, and by when.",
  },
  {
    title: "Priced per order",
    body: "Bulk pricing depends on quantity, generation, and condition. No fixed tier table — you get a real quote against your actual list.",
  },
  {
    title: "Tested before dispatch",
    body: "Every module is verified before it leaves. Condition is stated plainly; nothing ships as untested.",
  },
  {
    title: "Server memory is the specialty",
    body: "Registered and load-reduced DDR4 ECC server memory is the core of the business. Laptop and desktop stock is available in smaller volumes.",
  },
  {
    title: "Direct contact, no funnel",
    body: "Email reaches a person the same business day. No sales sequence, no mailing list.",
  },
  {
    title: "Retail available too",
    body: "Single sticks and small orders go through the storefront and ship like standard e-commerce.",
  },
];

export default function Wholesale() {
  useSEO({
    title: "Wholesale & Bulk Server RAM — Toronto, Canada",
    description:
      "Bulk and wholesale DDR4/DDR5 server memory from Toronto. RDIMM and LRDIMM ECC server pulls, tested before dispatch. Send your SKU list and quantities for a quote.",
  });
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
    } catch {
      const t = document.createElement("textarea");
      t.value = SUPPORT_EMAIL;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      document.body.removeChild(t);
    }
    setCopied(true);
    toast.success("Email copied", { description: SUPPORT_EMAIL });
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <>
      <Header />
      <main className="page" data-testid="wholesale-page">
        {/* Hero */}
        <section className="border-b" style={{ borderColor: "var(--border)" }}>
          <div className="container-tight pt-16 pb-14">
            <div className="section-label mb-5">
              <span className="num">01</span> WHOLESALE &amp; BULK
            </div>
            <h1 className="display-2 max-w-[18ch]">
              Bulk <span className="hl">server memory</span>, sourced to your list.
            </h1>
            <p className="mt-5 text-[17px] max-w-[56ch]" style={{ color: "var(--fg-muted)" }}>
              We supply DDR4 and DDR5 ECC server memory — RDIMM and LRDIMM — in volume,
              out of Toronto. Send the part numbers and quantities you need and we'll
              quote against your actual list.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href={GMAIL_COMPOSE_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">
                <Mail size={16} /> Send your SKU list
              </a>
              <Link to="/shop" className="btn-secondary">
                Browse retail stock <ArrowRight size={15} />
              </Link>
            </div>

            <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-px rounded-xl overflow-hidden"
                 style={{ background: "var(--border)" }}>
              {STATS.map((s) => (
                <div key={s.label} className="px-5 py-4" style={{ background: "var(--bg)" }}>
                  <div className="mono text-[10.5px] uppercase" style={{ color: "var(--fg-faint)" }}>
                    {s.label}
                  </div>
                  <div className="mt-1 font-semibold text-[15px]">{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How bulk orders work */}
        <section className="border-b" style={{ borderColor: "var(--border)" }}>
          <div className="container-tight pt-16 pb-14">
            <div className="section-label mb-6">
              <span className="num">02</span> HOW BULK ORDERS WORK
            </div>
            <h2 className="display-3 mb-8">Terms, plainly</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TERMS.map((t) => (
                <div key={t.title} className="glass card-hover rounded-xl p-6">
                  <div className="font-semibold text-[15px] mb-2">{t.title}</div>
                  <div className="text-[14px]" style={{ color: "var(--fg-muted)" }}>{t.body}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section>
          <div className="container-tight pt-16 pb-16">
            <div className="section-label mb-6">
              <span className="num">03</span> GET A QUOTE
            </div>
            <h2 className="display-3 mb-3">Send us the list</h2>
            <p className="text-[15px] mb-8" style={{ color: "var(--fg-muted)" }}>
              Part numbers and quantities are enough to start. We answer the same business day.
            </p>
            <div className="glass rounded-xl p-8">
              <div className="mono text-xl md:text-2xl font-medium break-all mb-6">
                {SUPPORT_EMAIL}
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={copyEmail} className="btn-secondary" data-testid="wholesale-copy-email-btn">
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? "Copied" : "Copy email"}
                </button>
                <a
                  href={GMAIL_COMPOSE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                  data-testid="wholesale-send-email-btn"
                >
                  <Mail size={15} /> Send via Gmail
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
