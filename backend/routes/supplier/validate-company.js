const supplierTypes = ["importer", "distributor", "supplier", "retail", "manufacturer", "agent", "other"];

function normalizeCompanyFields(body = {}) {
  const data = {};
  const errors = {};
  for (const [field, max] of Object.entries({ legalCompanyName: 150, supplierType: 30, supplierTypeOther: 100 })) {
    data[field] = typeof body[field] === "string" ? body[field].trim() : "";
    if ((body[field] !== undefined && typeof body[field] !== "string") || data[field].length > max) errors[field] = `supplierOnboarding.error.${field}`;
  }
  if (data.supplierType && !supplierTypes.includes(data.supplierType)) errors.supplierType = "supplierOnboarding.error.supplierType";
  if (data.supplierType === "other" && !data.supplierTypeOther) errors.supplierTypeOther = "supplierOnboarding.error.supplierTypeOther";
  if (data.supplierType !== "other") data.supplierTypeOther = "";
  return { data, errors };
}

function validateCompany(req, res, next) {
  const { data, errors } = normalizeCompanyFields(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ code: "supplierOnboarding.error.validation", errors });
  for (const field of Object.keys(data)) {
    if (req.body[field] !== undefined || (field === "supplierTypeOther" && req.body.supplierType !== undefined)) req.body[field] = data[field];
  }
  next();
}

module.exports = { supplierTypes, normalizeCompanyFields, validateCompany };
