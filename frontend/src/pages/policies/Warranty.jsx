import PolicyPage from "@/components/PolicyPage";

export default function Warranty() {
  return (
    <PolicyPage
      num="03"
      label="Policy"
      title="Warranty"
      intro="Reflexity RAM aims to provide reliable, properly tested memory products backed by reasonable support coverage."
      testId="warranty-page"
      sections={[
        {
          heading: "Coverage",
          body: [
            "Warranty coverage may vary depending on the specific product, condition, and manufacturer warranty status.",
            "Where applicable, warranty details will be listed directly on the product page.",
          ],
        },
        {
          heading: "What's generally covered",
          body: [
            {
              list: [
                "Products that fail under normal operating conditions",
                "Verified defective modules",
                "Issues identified during standard diagnostic testing",
              ],
            },
          ],
        },
        {
          heading: "What's generally not covered",
          body: [
            {
              list: [
                "Physical damage",
                "Damage caused by improper installation",
                "Damage caused by unsupported voltage or extreme overclocking",
                "Modified or tampered products",
              ],
            },
          ],
        },
        {
          heading: "Warranty claims",
          body: [
            "To begin a warranty request, contact reflexityram@gmail.com with:",
            {
              list: [
                "order information",
                "product SKU or part number",
                "a brief description of the issue",
                "any relevant diagnostic or compatibility information",
              ],
            },
          ],
        },
        {
          heading: "Replacement availability",
          body: [
            "Replacement availability depends on inventory and product availability at the time of the claim. If an identical replacement is unavailable, a similar replacement or alternative resolution may be offered.",
          ],
        },
      ]}
    />
  );
}
