import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Mail, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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

const PRINCIPLES = [
  { title: "Direct communication", body: "Email us with questions. We respond the same business day." },
  { title: "Clear specifications", body: "Every listing includes full specs, compatibility notes, and condition." },
  { title: "Tested inventory", body: "All modules are verified before dispatch." },
  { title: "Fast dispatch", body: "Orders are processed quickly and ship with tracking." },
  { title: "Wholesale available", body: "Bulk orders welcome. Contact us directly for pricing." },
  { title: "Server pulls available", body: "RDIMM and LRDIMM server memory in stock. ECC verified." },
];

export default function Home() {
  useSEO({
    title: "Reflexity RAM — Tested DDR4 & DDR5 Memory",
    description:
      "Reflexity RAM — DDR4, DDR5, server, and laptop memory. Wholesale and retail with direct communication.",
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

        {/* ── HERO ─────────────────────────────────────────────── */}
        <section
          className="relative overflow-hidden border-b border-white/5"
          data-testid="hero-section"
        >
          {/* Ambient glow layers */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(120,130,255,0.10) 0%, transparent 70%), " +
                "radial-gradient(ellipse 60% 40% at 80% 80%, rgba(80,180,255,0.06) 0%, transparent 60%)",
            }}
          />

          <div className="container-tight relative pt-24 pb-20 md:pt-32 md:pb-28 text-center">
            {/* Live status pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.5)]" />
              <span className="text-[11px] font-mono text-neutral-400 tracking-widest uppercase">
                Catalog Operational
              </span>
            </div>

            {/* Main title */}
            <h1
              className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-none"
              style={{
                background: "linear-gradient(135deg, #ffffff 0%, #a0a8c0 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Reflexity RAM
            </h1>

            <p className="mt-5 text-[17px] text-neutral-400 max-w-lg mx-auto leading-relaxed">
              Tested DDR4, DDR5, laptop, and server memory.
            </p>

            {/* CTA */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/categories"
                className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-[14px] transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_0_20px_4px_rgba(255,255,255,0.08)]"
                data-testid="hero-shop-cta"
              >
                Shop RAM <ArrowRight size={15} />
              </Link>
              <a
                href={GMAIL_COMPOSE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary inline-flex items-center gap-2 px-5 py-3 text-[14px] transition-all duration-200 hover:scale-[1.02]"
              >
                <Mail size={14} /> Contact us
              </a>
            </div>

            {/* Stat strip */}
            <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-px border border-white/8 rounded-2xl overflow-hidden max-w-2xl mx-auto">
              {STATS.map((s, i) => (
                <div
                  key={s.label}
                  className="flex flex-col items-center justify-center gap-1.5 py-5 px-4 bg-white/[0.025] hover:bg-white/[0.045] transition-colors duration-200"
                  data-testid={`hero-stat-${s.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="text-[10px] font-mono text-neutral-500 tracking-widest uppercase">
                    {s.label}
                  </div>
                  <div className="text-[13px] font-medium text-neutral-200">
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── ABOUT ────────────────────────────────────────────── */}
        <section className="border-b border-white/5" data-testid="about-section">
          <div className="container-tight py-16 md:py-20 grid lg:grid-cols-2 gap-10 items-start">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight mb-1">About</h2>
              <div className="h-px w-8 bg-white/20 mt-3 mb-6" />
            </div>
            <div className="space-y-4 text-neutral-400 text-[15px] leading-relaxed">
              <p>
                Reflexity RAM is a focused memory operation. We stock DDR4 and
                DDR5 — desktop, laptop, and server — and sell it through a
                straightforward storefront. No gimmicks, no upsells. Specs,
                prices, and a real email address.
              </p>
              <p>
                We handle both wholesale and retail. Small orders ship like
                standard e-commerce. Bulk inquiries are handled directly. Tell
                us the SKU you need and we'll source it.
              </p>
            </div>
          </div>
        </section>

        {/* ── HOW WE OPERATE ───────────────────────────────────── */}
        <section className="border-b border-white/5" data-testid="principles-section">
          <div className="container-tight py-16 md:py-20">
            <h2 className="text-2xl font-semibold tracking-tight mb-8">
              How we operate
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PRINCIPLES.map((p) => (
                <div
                  key={p.title}
                  className="group border border-white/8 rounded-xl p-6 hover:border-white/18 hover:bg-white/[0.025] transition-all duration-200"
                >
                  <div className="text-[13.5px] font-semibold mb-2 group-hover:text-white transition-colors duration-200">
                    {p.title}
                  </div>
                  <div className="text-[13px] text-neutral-500 leading-relaxed">
                    {p.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CONTACT ──────────────────────────────────────────── */}
        <section data-testid="contact-section">
          <div className="container-tight py-16 md:py-20">
            <h2 className="text-2xl font-semibold tracking-tight mb-2">
              Contact
            </h2>
            <p className="text-neutral-400 text-[14px] mb-8">
              Email is the fastest way to reach us. We answer same business day.
            </p>
            <div className="border border-white/8 rounded-xl p-8 hover:border-white/14 transition-colors duration-300">
              <div
                className="text-xl md:text-2xl font-mono font-medium break-all mb-6 text-neutral-100"
                data-testid="contact-email-display"
              >
                {SUPPORT_EMAIL}
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={copyEmail}
                  className="btn-secondary transition-all duration-200 hover:scale-[1.02]"
                  data-testid="home-copy-email-btn"
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? "Copied" : "Copy email"}
                </button>
                <a
                  href={GMAIL_COMPOSE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary transition-all duration-200 hover:scale-[1.02]"
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
