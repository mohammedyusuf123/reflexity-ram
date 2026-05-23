import { Link } from "react-router-dom";
import ReflexityMark from "@/components/ReflexityMark";

export default function Footer() {
  return (
    <footer
      className="relative z-10 border-t border-white/5 mt-24 pt-16 pb-10"
      data-testid="site-footer"
    >
      <div className="container-tight grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
        {/* LEFT: Brand */}
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <ReflexityMark size={28} />
            <div>
              <div className="font-semibold tracking-tight text-[14px]">Reflexity RAM</div>
            </div>
          </div>
          <p className="text-[12px] text-neutral-400 leading-relaxed mb-3">
            Hardware division of Reflexity.io
          </p>
          <p className="text-[12px] text-neutral-500">
            DDR4 · DDR5 · Server · Laptop
          </p>
        </div>

        {/* CENTER: Shop & Support */}
        <div className="grid grid-cols-2 gap-8">
          <div>
            <div className="mono text-[10px] text-neutral-500 uppercase tracking-widest mb-4">
              Shop
            </div>
            <div className="flex flex-col gap-2.5 text-[13px]">
              <Link to="/shop" className="text-neutral-300 hover:text-white transition-colors">All Memory</Link>
              <Link to="/shop?form=UDIMM" className="text-neutral-300 hover:text-white transition-colors">Desktop</Link>
              <Link to="/shop?form=SO-DIMM" className="text-neutral-300 hover:text-white transition-colors">Laptop</Link>
              <Link to="/shop?form=RDIMM" className="text-neutral-300 hover:text-white transition-colors">Server</Link>
            </div>
          </div>

          <div>
            <div className="mono text-[10px] text-neutral-500 uppercase tracking-widest mb-4">
              Support
            </div>
            <div className="flex flex-col gap-2.5 text-[13px]">
              <Link to="/shipping" className="text-neutral-300 hover:text-white transition-colors">Shipping</Link>
              <Link to="/returns" className="text-neutral-300 hover:text-white transition-colors">Returns</Link>
              <Link to="/warranty" className="text-neutral-300 hover:text-white transition-colors">Warranty</Link>
              <Link to="/faq" className="text-neutral-300 hover:text-white transition-colors">FAQ</Link>
            </div>
          </div>
        </div>

        {/* RIGHT: Contact & Status */}
        <div>
          <a
            href="mailto:reflexityram@gmail.com"
            className="text-[13px] text-neutral-300 hover:text-white transition-colors font-medium"
            data-testid="footer-email"
          >
            reflexityram@gmail.com
          </a>
          <div className="mt-4 flex items-center gap-2 text-[11px] mono text-neutral-500" data-testid="footer-status">
            <span className="dot dot-amber pulse-dot" />
            Demo — Work in Progress
          </div>
        </div>
      </div>

      {/* BOTTOM: Copyright */}
      <div className="container-tight pt-6 border-t border-white/5 mono text-[11px] text-neutral-600">
        <div>© 2026 Reflexity.io — All rights reserved.</div>
      </div>
    </footer>
  );
}
