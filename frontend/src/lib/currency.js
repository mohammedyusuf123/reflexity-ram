export const STORE_CURRENCY_CODE = "CAD";
export const STORE_CURRENCY_NAME = "Canadian dollars (CAD)";
export const STANDARD_SHIPPING_PRICE = 14;

export function formatStorePrice(value, fractionDigits = 2) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";

  return `$${amount.toLocaleString("en-CA", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}

export function formatStorePriceWithCode(value, fractionDigits = 2) {
  const formatted = formatStorePrice(value, fractionDigits);
  return formatted === "—" ? formatted : `${formatted} ${STORE_CURRENCY_CODE}`;
}
