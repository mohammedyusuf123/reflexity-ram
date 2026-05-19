import PolicyPage from "@/components/PolicyPage";

export default function Returns() {
  return (
    <PolicyPage
      num="03"
      label="Policy"
      title="Returns"
      intro="We want customers to feel confident when purchasing memory products from Reflexity RAM."
      testId="returns-page"
      sections={[
        {
          heading: "Return eligibility",
          body: [
            "Most products may be eligible for return within a limited period after delivery, provided the item is returned in its original condition and packaging.",
            "Return eligibility may vary depending on product condition, product category, open-box or refurbished status, and wholesale or special-order purchases.",
          ],
        },
        {
          heading: "Dead-on-arrival (DOA) items",
          body: [
            "If a product arrives defective or fails initial testing, contact reflexityram@gmail.com with your order details and a brief description of the issue.",
            "Compatibility information such as motherboard model, CPU, BIOS version, or memory test results may help speed up troubleshooting.",
          ],
        },
        {
          heading: "Return condition",
          body: [
            "Returned products should be packaged safely in anti-static protection where possible. Products with physical damage, severe misuse, or modification may not qualify for return or replacement.",
          ],
        },
        {
          heading: "Refund timing",
          body: [
            "Approved refunds are generally issued back to the original payment method after the returned item has been inspected and processed.",
          ],
        },
        {
          heading: "Questions",
          body: [
            "For any return-related questions, contact reflexityram@gmail.com before shipping products back.",
          ],
        },
      ]}
    />
  );
}
