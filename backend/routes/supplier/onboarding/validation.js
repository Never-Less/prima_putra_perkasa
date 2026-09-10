const crypto = require("node:crypto");

const statuses = ["notGenerated", "generated", "sent", "submitted", "completed"];
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
const validToken = (token) => typeof token === "string" && /^[a-f0-9]{64}$/.test(token);

function validateProfile(body = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) body = {};
  const data = {};
  const errors = {};
  for (const [field, max] of Object.entries({ alamat: 500, npwp: 30, picName: 120, phone: 15, whatsapp: 15, email: 150 })) {
    const value = typeof body[field] === "string" ? body[field].trim() : "";
    if (!value || value.length > max) errors[field] = `supplierOnboarding.error.${field}`;
    data[field] = value;
  }
  // DJP: legacy corporate NPWP is converted to 16 digits by prefixing zero.
  // This checks format only; registration/ownership requires DJP verification.
  if (!/^(?:\d{15,16}|\d{2}\.\d{3}\.\d{3}\.\d-\d{3}\.\d{3})$/.test(data.npwp)) {
    errors.npwp = "supplierOnboarding.error.npwp";
  } else {
    data.npwp = data.npwp.replace(/[.-]/g, "");
    if (data.npwp.length === 15) data.npwp = `0${data.npwp}`;
    if (/^0+$/.test(data.npwp)) errors.npwp = "supplierOnboarding.error.npwp";
  }
  for (const field of ["phone", "whatsapp"]) {
    if (!/^\d{7,15}$/.test(data[field])) errors[field] = `supplierOnboarding.error.${field}`;
  }
  data.email = data.email.toLowerCase();
  const [localPart = ""] = data.email.split("@");
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(data.email)
    || localPart.length > 64 || localPart.startsWith(".") || localPart.endsWith(".") || localPart.includes("..")) errors.email = "supplierOnboarding.error.email";
  for (const field of ["productCategories", "productBrands"]) {
    const source = Array.isArray(body[field]) ? body[field] : typeof body[field] === "string" ? body[field].split(",") : [];
    data[field] = [...new Set(source.filter((value) => typeof value === "string").map((value) => value.trim()).filter(Boolean))];
    if (!data[field].length || data[field].length > 50 || data[field].some((value) => value.length > 100) || source.some((value) => typeof value !== "string")) {
      errors[field] = `supplierOnboarding.error.${field}`;
    }
  }
  return { data, errors, valid: Object.keys(errors).length === 0 };
}

module.exports = { statuses, hashToken, validToken, validateProfile };
