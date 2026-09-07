const PAYMENT_TERM_TYPES = ["net", "cashBeforeDelivery", "cashOnDelivery", "dpNet"];

const DEFAULT_PAYMENT_TERM = Object.freeze({
  type: "net",
  netDays: 30,
  downPaymentPercent: 0,
  remainingPaymentPercent: 100,
});

function parseFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePaymentTerm(value, fallback = DEFAULT_PAYMENT_TERM) {
  const source = value && typeof value === "object" ? value : fallback;
  const type = PAYMENT_TERM_TYPES.includes(source.type) ? source.type : fallback.type;

  if (type === "cashBeforeDelivery" || type === "cashOnDelivery") {
    return {
      type,
      netDays: 0,
      downPaymentPercent: 0,
      remainingPaymentPercent: 100,
    };
  }

  const netDays = parseFiniteNumber(source.netDays);
  if (netDays === null || !Number.isInteger(netDays) || netDays < 0 || netDays > 3650) {
    return null;
  }

  if (type === "net") {
    return {
      type,
      netDays,
      downPaymentPercent: 0,
      remainingPaymentPercent: 100,
    };
  }

  const downPaymentPercent = parseFiniteNumber(source.downPaymentPercent);
  const remainingPaymentPercent = parseFiniteNumber(source.remainingPaymentPercent);

  if (
    downPaymentPercent === null ||
    remainingPaymentPercent === null ||
    downPaymentPercent <= 0 ||
    downPaymentPercent >= 100 ||
    remainingPaymentPercent <= 0 ||
    remainingPaymentPercent >= 100 ||
    Math.abs(downPaymentPercent + remainingPaymentPercent - 100) > 0.001
  ) {
    return null;
  }

  return { type, netDays, downPaymentPercent, remainingPaymentPercent };
}

function calculateDueDate(invoiceDate, paymentTerm) {
  const date = new Date(invoiceDate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const normalized = normalizePaymentTerm(paymentTerm) || DEFAULT_PAYMENT_TERM;
  date.setUTCDate(date.getUTCDate() + normalized.netDays);
  return date;
}

module.exports = {
  DEFAULT_PAYMENT_TERM,
  PAYMENT_TERM_TYPES,
  calculateDueDate,
  normalizePaymentTerm,
};
