/** Stripe emits charge.refunded for partial refunds too; only this flag means full. */
const isFullyRefundedCharge = (charge) => charge?.refunded === true;

module.exports = { isFullyRefundedCharge };
