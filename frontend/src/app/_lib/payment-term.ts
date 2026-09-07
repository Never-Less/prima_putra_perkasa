export type PaymentTermType = "net" | "cashBeforeDelivery" | "cashOnDelivery" | "dpNet";

export type PaymentTerm = {
  type: PaymentTermType;
  netDays: number;
  downPaymentPercent: number;
  remainingPaymentPercent: number;
};

export const defaultPaymentTerm: PaymentTerm = {
  type: "net",
  netDays: 30,
  downPaymentPercent: 0,
  remainingPaymentPercent: 100,
};

export function normalizePaymentTerm(value: unknown): PaymentTerm {
  if (!value || typeof value !== "object") {
    return { ...defaultPaymentTerm };
  }

  const source = value as Record<string, unknown>;
  const validTypes: PaymentTermType[] = ["net", "cashBeforeDelivery", "cashOnDelivery", "dpNet"];
  const type = validTypes.includes(source.type as PaymentTermType)
    ? (source.type as PaymentTermType)
    : "net";
  const numberOr = (candidate: unknown, fallback: number) => {
    const parsed = Number(candidate);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  if (type === "cashBeforeDelivery" || type === "cashOnDelivery") {
    return { type, netDays: 0, downPaymentPercent: 0, remainingPaymentPercent: 100 };
  }

  if (type === "net") {
    return {
      type,
      netDays: numberOr(source.netDays, 30),
      downPaymentPercent: 0,
      remainingPaymentPercent: 100,
    };
  }

  return {
    type,
    netDays: numberOr(source.netDays, 30),
    downPaymentPercent: numberOr(source.downPaymentPercent, 30),
    remainingPaymentPercent: numberOr(source.remainingPaymentPercent, 70),
  };
}

export function formatPaymentTermLabel(
  value: PaymentTerm,
  labels: { cashBeforeDelivery: string; cashOnDelivery: string; days: string }
) {
  const term = normalizePaymentTerm(value);
  if (term.type === "net") return `Net ${term.netDays} ${labels.days}`;
  if (term.type === "dpNet") {
    return `DP ${term.downPaymentPercent}%, Net ${term.remainingPaymentPercent}% / ${term.netDays} ${labels.days}`;
  }
  return term.type === "cashBeforeDelivery" ? labels.cashBeforeDelivery : labels.cashOnDelivery;
}

export function calculatePaymentDueDate(invoiceDate: string, value: PaymentTerm) {
  const date = new Date(invoiceDate);
  if (Number.isNaN(date.getTime())) return "";
  const term = normalizePaymentTerm(value);
  date.setUTCDate(date.getUTCDate() + term.netDays);
  return date.toISOString();
}
