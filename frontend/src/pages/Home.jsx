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

export default function Home() {
  useSEO({
    title: "Reflexity RAM — Shop RAM",
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

        {/* HERO */}
        <section className="border-b border-white/5" data-testid="hero-section">
          <div className="container-tight py-20 md:py-28">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-none">
              Reflexity RAM
            </h1>
            <p className="text-neutral-400 text-lg mt-4">
              Shop RAM
            </p>
            <div className="mt-8">
              <Link
                to="/categories"
                className="btn-primary inline-flex items-center gap-2"
                data-testid="hero-shop-cta"
              >
                Shop RAM <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </section>

        {/* ABOUT */}
        <section className="border-b border-white/5" data-testid="about-section">
          <div className="container-tight py-16 md:py-20">
            <h2 className="text-2xl font-semibold tracking-tight mb-4">
              About
            </h2>
            <div className="max-w-2xl space-y-4 text-neutral-400 text-[15px] leading-relaxed">
              <p>
                Reflexity RAM is a focused memory operation. We stock DDR4 and
                DDR5 — desktop, laptop, and server — and sell it through a
                straightforward storefront. No gimmicks, no upsells. Specs,
                prices, and a real email address.
              </p>
              <p>
                We handle both wholesale and retail. Small orders ship like
                standard e-commerce. Bulk inquiries are handled directly.
              </p>
            </div>
          </div>
        </section>

        {/* HOW WE OPERATE */}
        <section className="border-b border-white/5" data-testid="principles-section">
          <div className="container-tight py-16 md:py-20">
            <h2 className="text-2xl font-semibold tracking-tight mb-8">
              How we operate
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: "Direct communication", body: "Email us with questions. We respond the same business day." },
                { title: "Clear specifications", body: "Every listing includes full specs, compatibility notes, and condition." },
                { title: "Tested inventory", body: "All modules are verified before dispatch." },
                { title: "Fast dispatch", body: "Orders are processed quickly and ship with tracking." },
                { title: "Wholesale available", body: "Bulk orders welcome. Contact us directly for pricing." },
                { title: "Server pulls available", body: "RDIMM and LRDIMM server memory in stock. ECC verified." },
              ].map((p) => (
                <div
                  key={p.title}
                  className="border border-white/8 rounded-xl p-6"
                  data-testid={`principle-${p.title.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="text-[14px] font-semibold mb-2">{p.title}</div>
                  <div className="text-[13px] text-neutral-500 leading-relaxed">{p.body}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section data-testid="contact-section">
          <div className="container-tight py-16 md:py-20">
            <h2 className="text-2xl font-semibold tracking-tight mb-2">
              Contact
            </h2>
            <p className="text-neutral-400 text-[14px] mb-8">
              Email is the fastest way to reach us. We answer same business day.
            </p>
            <div className="border border-white/8 rounded-xl p-8">
              <div
                className="text-xl md:text-2xl font-mono font-medium break-all mb-6"
                data-testid="contact-email-display"
              >
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
