import { Link } from "react-router-dom";
import { Clock3, PackageCheck, ShieldCheck } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useSEO } from "@/lib/seo";
import "@/pages/wholesale-concepts.css";

export default function Wholesale() {
  useSEO({
    title: "Wholesale RAM — Coming Soon | Reflexity",
    description:
      "Reflexity's wholesale DDR4 and DDR5 RAM buying, selling, and sourcing desk is coming soon.",
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

            <div className="ws-coming" aria-labelledby="wholesale-coming-title">
              <div className="ws-coming-top">
                <span>REFLEXITY WHOLESALE DESK</span>
                <div><i /> COMING SOON</div>
              </div>
              <div className="ws-coming-icon"><Clock3 size={27} /></div>
              <h2 id="wholesale-coming-title">Wholesale access is being prepared.</h2>
              <p>
                We are building a direct workflow for bulk buying, inventory offers,
                and exact-requirement sourcing.
              </p>
              <div className="ws-coming-list">
                <span><PackageCheck size={15} /> Buy bulk DDR4 and DDR5 memory</span>
                <span><PackageCheck size={15} /> Submit wholesale inventory</span>
                <span><PackageCheck size={15} /> Request hard-to-find configurations</span>
              </div>
              <div className="ws-closed-note">Requests and submissions are currently closed.</div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
