import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Cpu,
  Server,
  Laptop,
  HardDrive,
  Copy,
  Mail,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SectionLabel from "@/components/SectionLabel";
import { useSEO } from "@/lib/seo";

const SUPPORT_EMAIL = "reflexityram@gmail.com";
const GMAIL_COMPOSE_URL =
  "https://mail.google.com/mail/u/0/?fs=1&to=reflexityram@gmail.com&su=Reflexity+RAM+%E2%80%94+Inquiry&tf=cm";

const STATS = [
  { label: "Form Factors", value: "4" },
  { label: "Generations", value: "DDR4 · DDR5" },
  { label: "Channels", value: "Wholesale · Retail" },
  { label: "Status", value: "Operational" },
];

const INVENTORY = [
  { icon: Cpu, title: "Desktop Memory", caption: "DDR4 and DDR5 UDIMM", to: "/shop?form=UDIMM" },
  { icon: Laptop, title: "Laptop Memory", caption: "SO-DIMM for laptops & mini-PCs", to: "/shop?form=SO-DIMM" },
  { icon: Server, title: "Server Memory", caption: "RDIMM / LRDIMM, ECC inventory", to: "/shop?form=RDIMM" },
  { icon: HardDrive, title: "Performance Kits", caption: "High-speed EXPO / XMP kits", to: "/shop" },
];

const PRINCIPLES = [
  {
    n: "01",
    title: "Direct communication",
    body: "Email us with questions. We respond quickly.",
  },
  {
    n: "02",
    title: "Clear specs",
    body: "Every product lists full compatibility and test results.",
  },
  {
    n: "03",
    title: "Tested inventory",
    body: "All modules verified before shipping.",
  },
  {
    n: "04",
    title: "Fast dispatch",
    body: "Orders process quickly and ship with tracking.",
  },
  {
    n: "05",
    title: "Wholesale available",
    body: "Bulk orders welcome. Contact us for pricing.",
  },
];

export default function Home() {
  useSEO({
    title: "Memory, made accessible.",
    description:
      "Reflexity RAM — DDR4, DDR5, server, and laptop memory. Wholesale + retail with direct communication.",
  });
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
    } catch {
      // fallback for old browsers
      const t = document.createElement("textarea");
      t.value = SUPPORT_EMAIL;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      document.body.removeChild(t);
    }
    setCopied(true);
    toast.success("Email copied", {
      description: SUPPORT_EMAIL,
      icon: <Check size={16} className="text-emerald-400" />,
    });
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <>
      <Header />
      <main className="page" data-testid="home-page">
        {/* HERO */}
        <section className="relative overflow-hidden" data-testid="hero-section">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(900px 500px at 70% 25%, rgba(120,140,255,0.07), transparent), radial-gradient(700px 400px at 20% 80%, rgba(255,255,255,0.04), transparent)",
            }}
          />
          <div className="container-tight relative pt-0 pb-12">
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              <div className="lg:col-span-7 fade-up">
                <SectionLabel num="00">Reflexity RAM</SectionLabel>
                <h1 className="display-1 display-grad mt-0">Reflexity RAM.</h1>
                <p className="text-[17px] text-neutral-400 max-w-xl leading-relaxed mt-1">
                  Tested DDR4, DDR5, laptop, and server memory.
                </p>
                <div className="flex flex-wrap gap-3 mt-3">
                  <Link to="/shop" className="btn-primary" data-testid="hero-shop-cta">
                    Shop memory <ArrowRight size={15} />
                  </Link>
                  <a
                    href="#inventory"
                    className="btn-secondary"
                    data-testid="hero-inventory-cta"
                  >
                    Browse catalog
                  </a>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mt-5 pt-3 border-t border-white/5">
                  {STATS.map((s) => (
                    <div key={s.label} data-testid={`hero-stat-${s.label.toLowerCase().replace(/\s+/g, "-")}`}>
                      <div className="mono text-[10px] text-neutral-500 tracking-widest mb-1.5">
                        {s.label}
                      </div>
                      <div className="text-[14px] font-medium">{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 fade-up" style={{ animationDelay: "0.15s" }} data-testid="hero-visual">
                <div className="relative glass rounded-2xl overflow-hidden">
                  {/* Hero image */}
                  <div className="relative aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5]">
                    <img
                      src="https://images.unsplash.com/photo-1591488320449-011701bb6704?w=1400&q=85"
                      alt="DDR5 memory module"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(5,5,5,0) 40%, rgba(5,5,5,0.5) 80%, rgba(5,5,5,0.92) 100%)",
                      }}
                    />
                    {/* Floating live status chip */}
                    <div className="absolute top-4 left-4 glass rounded-full px-3 py-1.5 flex items-center gap-2">
                      <span className="dot dot-green pulse-dot" />
                      <span className="mono text-[10px] text-neutral-200 tracking-widest">
                        CATALOG OPERATIONAL
                      </span>
                    </div>
                    {/* Floating spec strip */}
                    <div className="absolute bottom-4 left-4 right-4 glass-soft rounded-xl p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mono text-[9px] text-neutral-500 tracking-widest mb-1">
                          FEATURED SKU
                        </div>
                        <div className="text-[12.5px] font-medium truncate">
                          DDR5-6000 CL30 EXPO · 32GB Kit
                        </div>
                      </div>
                      <Link
                        to="/shop/rfx-d5-32-6000-cl30-expo"
                        className="shrink-0 mono text-[10px] tracking-widest text-white hover:underline whitespace-nowrap"
                      >
                        VIEW →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ABOUT */}
        <section className="relative py-24" data-testid="about-section">
          <div className="container-tight grid lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5">
              <SectionLabel num="01">About</SectionLabel>
              <h2 className="display-2 display-grad mt-6">
                Memory, made accessible.
              </h2>
            </div>
            <div className="lg:col-span-7">
              <p className="text-neutral-300 text-[16px] leading-relaxed">
                Reflexity is a young, focused memory operation. We curate
                DDR4/DDR5 inventory — mainstream, enthusiast, and server — and
                sell it through a calm storefront. No gamer-RGB noise, no
                15-step upsells. Specs, prices, and a real email address.
              </p>
              <p className="text-neutral-400 text-[15px] leading-relaxed mt-4">
                We're operating in wholesale and retail simultaneously: small
                orders ship like consumer e-commerce, bulk inquiries get
                handled directly. Tell us the SKU you need and we'll source it.
              </p>
              <div className="flex flex-wrap gap-2 mt-6">
                {["Wholesale", "Retail", "DDR4", "DDR5", "Server", "Consumer"].map((t) => (
                  <span key={t} className="pill">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* INVENTORY */}
        <section
          id="inventory"
          className="relative py-24 border-t border-white/5"
          data-testid="inventory-section"
        >
          <div className="container-tight">
            <SectionLabel num="02">Catalog</SectionLabel>
            <h2 className="display-2 display-grad mt-6 max-w-2xl">
              Available Memory
            </h2>
            <p className="text-neutral-400 mt-5 max-w-xl leading-relaxed">
              Browse the live catalog or contact us with the exact part number
              you need.
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
              {INVENTORY.map((c, i) => (
                <Link
                  key={c.title}
                  to={c.to}
                  className="glass card-hover rounded-xl p-6 group fade-up"
                  style={{ animationDelay: `${i * 0.06}s` }}
                  data-testid={`inventory-card-${c.title.toLowerCase()}`}
                >
                  <div className="flex items-center justify-between mb-8">
                    <c.icon size={26} className="text-neutral-300" />
                  </div>
                  <div className="text-xl font-semibold tracking-tight">{c.title}</div>
                  <div className="text-[13px] text-neutral-500 mt-1.5">{c.caption}</div>
                  <div className="mt-6 text-[12px] mono text-neutral-500 group-hover:text-white transition-colors flex items-center gap-1.5">
                    View <ArrowRight size={12} />
                  </div>
                </Link>
              ))}
            </div>

            <div className="glass rounded-2xl p-8 mt-10 flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="flex-1">
                <div className="text-lg font-semibold tracking-tight mb-1.5">
                  Need a specific SKU?
                </div>
                <div className="text-[14px] text-neutral-400">
                  Wholesale inquiries, server pulls, or specific QVL-matched
                  kits — email and we'll source.
                </div>
              </div>
              <a
                href={GMAIL_COMPOSE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                data-testid="inventory-email-cta"
              >
                <Mail size={15} /> Email to inquire
              </a>
            </div>
          </div>
        </section>

        {/* PRINCIPLES */}
        <section className="relative py-24 border-t border-white/5" data-testid="principles-section">
          <div className="container-tight">
            <SectionLabel num="03">Principles</SectionLabel>
            <h2 className="display-2 display-grad mt-6 max-w-2xl">
              How we run the shop.
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
              {PRINCIPLES.map((p, i) => (
                <div
                  key={p.n}
                  className="glass card-hover rounded-xl p-6 fade-up"
                  style={{ animationDelay: `${i * 0.05}s` }}
                  data-testid={`principle-${p.n}`}
                >
                  <div className="mono text-[11px] text-neutral-500 tracking-widest mb-4">
                    {p.n}
                  </div>
                  <div className="text-lg font-semibold tracking-tight mb-2">
                    {p.title}
                  </div>
                  <div className="text-[13.5px] text-neutral-400 leading-relaxed">
                    {p.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section className="relative py-24 border-t border-white/5" data-testid="contact-section">
          <div className="container-tight">
            <SectionLabel num="04">Contact</SectionLabel>
            <h2 className="display-2 display-grad mt-6 max-w-2xl">
              Open inbox. Always.
            </h2>
            <p className="text-neutral-400 mt-5 max-w-xl leading-relaxed">
              The fastest way to reach us is email. We answer same business
              day.
            </p>

            <div className="glass rounded-2xl p-8 md:p-12 mt-10 flex flex-col gap-6">
              <div className="text-2xl md:text-4xl font-bold tracking-tight break-all" data-testid="contact-email-display">
                {SUPPORT_EMAIL}
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={copyEmail}
                  className="btn-secondary"
                  data-testid="home-copy-email-btn"
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? "Copied" : "Copy email"}
                </button>
                <a
                  href={GMAIL_COMPOSE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                  data-testid="home-send-email-btn"
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
