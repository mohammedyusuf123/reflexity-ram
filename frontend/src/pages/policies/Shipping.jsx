import EditablePolicyPage from "@/components/EditablePolicyPage";

// Default content below is the built-in copy. Admins can override it inline via
// the Edit button (persisted server-side); this stays as the fallback.
const DEFAULT_HTML = `<p>How we pack, process, and dispatch orders.</p>
<h2>Order processing</h2>
<p>Orders are typically processed within 1–2 business days after purchase. Once an order ships, tracking information will be sent by email when available.</p>
<h2>Shipping rates</h2>
<p>Shipping costs and delivery estimates are calculated during checkout based on destination, order size, and carrier availability.</p>
<p>At this stage, shipping availability may vary depending on inventory location and order type.</p>
<h2>International shipping</h2>
<p>International shipping availability may vary by region. Any duties, taxes, or import fees are the responsibility of the customer.</p>
<h2>Packaging</h2>
<p>Memory modules are packaged in anti-static protection and padded packaging appropriate for transit. Higher-value or multi-module orders may ship in reinforced packaging.</p>
<h2>Delays or delivery issues</h2>
<p>If your tracking has not updated for several business days after dispatch, contact reflexityram@gmail.com and we'll help investigate the shipment status with the carrier.</p>
<h2>Local pickup</h2>
<p>Local pickup availability may be offered for select orders. Contact us before placing an order if you are interested in arranging pickup.</p>`;

export default function Shipping() {
  return (
    <EditablePolicyPage
      slug="shipping"
      num="03"
      label="Policy"
      title="Shipping"
      defaultHtml={DEFAULT_HTML}
      testId="shipping-page"
    />
  );
}
