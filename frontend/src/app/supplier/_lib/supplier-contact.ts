export const supplierNpwpPattern = "(?:[0-9]{15,16}|[0-9]{2}\\.[0-9]{3}\\.[0-9]{3}\\.[0-9]\\-[0-9]{3}\\.[0-9]{3})";

export function normalizeSupplierNumberInput(value: string, field: string) {
  return field === "npwp" ? value.replace(/[^0-9.\-]/g, "") : value.replace(/[^0-9]/g, "");
}
