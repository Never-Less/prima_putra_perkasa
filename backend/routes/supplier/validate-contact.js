const { validateContactFields } = require("./onboarding/validation");

// Internal profiles may be incomplete; validate only supplied, non-empty fields.
function validateContact(req, res, next) {
  const { data, errors } = validateContactFields(req.body);
  for (const field of ["npwp", "phone", "whatsapp", "email"]) {
    if (req.body[field] === undefined) continue;
    if (typeof req.body[field] !== "string" || (req.body[field].trim() && errors[field])) {
      return res.status(400).json({ code: `supplierOnboarding.error.${field}`, errors: { [field]: `supplierOnboarding.error.${field}` } });
    }
    req.body[field] = req.body[field].trim() ? data[field] : "";
  }
  next();
}

module.exports = { validateContact };
