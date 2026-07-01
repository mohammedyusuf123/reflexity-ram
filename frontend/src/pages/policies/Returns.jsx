import EditablePolicyPage from "@/components/EditablePolicyPage";

// Default content below is the built-in copy. Admins can override it inline via
// the Edit button (persisted server-side); this stays as the fallback.
const DEFAULT_HTML = `<p>We want customers to feel confident when purchasing memory products from Reflexity RAM.</p>
<h2>Return eligibility</h2>
<p>Most products may be eligible for return within a limited period after delivery, provided the item is returned in its original condition and packaging.</p>
<p>Return eligibility may vary depending on product condition, product category, open-box or refurbished status, and wholesale or special-order purchases.</p>
<h2>Dead-on-arrival (DOA) items</h2>
<p>If a product arrives defective or fails initial testing, contact reflexityram@gmail.com with your order details and a brief description of the issue.</p>
<p>Compatibility information such as motherboard model, CPU, BIOS version, or memory test results may help speed up troubleshooting.</p>
<h2>Return condition</h2>
<p>Returned products should be packaged safely in anti-static protection where possible. Products with physical damage, severe misuse, or modification may not qualify for return or replacement.</p>
<h2>Refund timing</h2>
<p>Approved refunds are generally issued back to the original payment method after the returned item has been inspected and processed.</p>
<h2>Questions</h2>
<p>For any return-related questions, contact reflexityram@gmail.com before shipping products back.</p>`;

export default function Returns() {
  return (
    <EditablePolicyPage
      slug="returns"
      num="03"
      label="Policy"
      title="Returns"
      defaultHtml={DEFAULT_HTML}
      testId="returns-page"
    />
  );
}
