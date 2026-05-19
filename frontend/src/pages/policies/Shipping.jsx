import PolicyPage from "@/components/PolicyPage";

export default function Shipping() {
  return (
    <PolicyPage
      num="03"
      label="Policy"
      title="Shipping"
      intro="How we pack, process, and dispatch orders."
      testId="shipping-page"
      sections={[
        {
          heading: "Order processing",
          body: [
            "Orders are typically processed within 1–2 business days after purchase. Once an order ships, tracking information will be sent by email when available.",
          ],
        },
        {
          heading: "Shipping rates",
          body: [
            "Shipping costs and delivery estimates are calculated during checkout based on destination, order size, and carrier availability.",
            "At this stage, shipping availability may vary depending on inventory location and order type.",
          ],
        },
        {
          heading: "International shipping",
          body: [
            "International shipping availability may vary by region. Any duties, taxes, or import fees are the responsibility of the customer.",
          ],
        },
        {
          heading: "Packaging",
          body: [
            "Memory modules are packaged in anti-static protection and padded packaging appropriate for transit. Higher-value or multi-module orders may ship in reinforced packaging.",
          ],
        },
        {
          heading: "Delays or delivery issues",
          body: [
            "If your tracking has not updated for several business days after dispatch, contact reflexityram@gmail.com and we'll help investigate the shipment status with the carrier.",
          ],
        },
        {
          heading: "Local pickup",
          body: [
            "Local pickup availability may be offered for select orders. Contact us before placing an order if you are interested in arranging pickup.",
          ],
        },
      ]}
    />
  );
}
