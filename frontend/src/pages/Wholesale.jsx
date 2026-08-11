import { Link } from "react-router-dom";
import { Mail, PackageCheck, ShieldCheck } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useSEO } from "@/lib/seo";
import "@/pages/wholesale-concepts.css";

const WHOLESALE_GMAIL_URL =
  "https://mail.google.com/mail/?view=cm&fs=1&to=reflexityram@gmail.com&su=Wholesale%20RAM%20request";

export default function Wholesale() {
  useSEO({
    title: "Wholesale DDR4 & DDR5 RAM | Reflexity",
    description:
      "Contact Reflexity's Toronto wholesale desk to buy, sell, or source exact-SKU DDR4 and DDR5 RAM.",
  });

  return (
    <div className="wholesale-simple-shell">
      <Header />
      <main className="wholesale-simple">
        <section className="ws-one-screen">
          <div className="ws-glow" />
          <div className="ws-grid-lines" />
          <div className="ws-container ws-one-grid">
            <div className="ws-pitch">
              <div className="ws-eyebrow"><span /> REFLEXITY WHOLESALE</div>
              <h1>Bulk RAM.<br /><em>One direct contact.</em></h1>
              <p>
                Reflexity buys, sells and sources DDR4 and DDR5 memory for
                resellers, computer shops and IT teams.
              </p>
              <div className="ws-quick-facts">
                <span>Exact-SKU sourcing</span>
                <i />
                <span>Toronto, Canada</span>
                <i />
                <span>Domestic & international</span>
              </div>
              <div className="ws-trust"><ShieldCheck size={15} /> Inventory source and responsibility are identified in each quote.</div>
              <p className="ws-retail-link">Need only one or two sticks? <Link to="/shop">Shop retail stock.</Link></p>
            </div>

            <div className="ws-coming" aria-labelledby="wholesale-desk-title">
              <div className="ws-coming-top">
                <span>REFLEXITY WHOLESALE DESK</span>
                <div><i /> DIRECT CONTACT</div>
              </div>
              <div className="ws-coming-icon"><Mail size={27} /></div>
              <h2 id="wholesale-desk-title">Send the exact requirement.</h2>
              <p>
                Include the part number, form factor, capacity, speed, quantity,
                condition, destination, and deadline. We confirm availability,
                source, and responsibility before quoting.
              </p>
              <div className="ws-coming-list">
                <span><PackageCheck size={15} /> Buy bulk DDR4 and DDR5 memory</span>
                <span><PackageCheck size={15} /> Submit wholesale inventory</span>
                <span><PackageCheck size={15} /> Request hard-to-find configurations</span>
              </div>
              <a
                className="ws-contact-link"
                href={WHOLESALE_GMAIL_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Email the wholesale desk
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
