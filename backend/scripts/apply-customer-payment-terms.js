require("dotenv").config();

const mongoose = require("mongoose");

const { connectDatabase } = require("../config/database");
const { Customer } = require("../models/Customer");
const { Invoice } = require("../models/Invoice");
const { calculateDueDate } = require("../utils/payment-term");

const PAYMENT_TERMS = [
  { customer: "DAIJO INDUSTRIAL", contact: "BU NUR", netDays: 70 },
  { customer: "DAIJO INDUSTRIAL", contact: "BU DIAN", netDays: 100 },
  { customer: "DHARMA POLIPLAST", netDays: 30 },
  { customer: "EVERPRO INDONESIA TECHNOLOGIES", netDays: 15 },
  { customer: "SINO ZONE INDUSTRY INDONESIA", netDays: 14 },
  { customer: "MEILOON TECHNOLOGY INDONESIA", netDays: 30 },
  { customer: "MAXXIS INTERNATIONAL INDONESIA", netDays: 45 },
  { customer: "SEBUKU IRON LATERITIC ORES", netDays: 30 },
  { customer: "SEBUKU FERROALLOY PERKASA", netDays: 30 },
  { customer: "SEBUKU BAJA PERKASA", netDays: 30 },
  { customer: "BLUE COKE INDONESIA", netDays: 30 },
  { customer: "ZHOUJIA SUPPLY CHAIN INDONESIA", netDays: 30 },
  { customer: "HONG XHE INDUSTRIAL", netDays: 30 },
  { customer: "PUNCAK GEMILANG SEMESTA", netDays: 30 },
];

const isApplyMode = process.argv.includes("--apply");

function normalizeText(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/\bPT\.?\b/g, "")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function buildPaymentTerm(netDays) {
  return {
    type: "net",
    netDays,
    downPaymentPercent: 0,
    remainingPaymentPercent: 100,
  };
}

function findRule(customer) {
  const normalizedName = normalizeText(customer.nama);
  const normalizedContact = normalizeText(customer.atasNama);
  const candidates = PAYMENT_TERMS.filter(
    (rule) => normalizeText(rule.customer) === normalizedName
  );

  if (candidates.length <= 1) {
    return candidates[0] || null;
  }

  const contactMatches = candidates.filter((rule) =>
    normalizedContact.includes(normalizeText(rule.contact))
  );

  return contactMatches.length === 1 ? contactMatches[0] : null;
}

async function main() {
  await connectDatabase();

  const customers = await Customer.find(
    {},
    "nama atasNama defaultPaymentTerm"
  ).sort({ nama: 1 }).lean();
  const matchedRuleKeys = new Set();
  const ambiguousCustomers = [];
  const results = [];

  for (const customer of customers) {
    const normalizedName = normalizeText(customer.nama);
    const nameRules = PAYMENT_TERMS.filter(
      (rule) => normalizeText(rule.customer) === normalizedName
    );
    const rule = findRule(customer);

    if (!rule) {
      if (nameRules.length > 1) {
        ambiguousCustomers.push({
          nama: customer.nama,
          atasNama: customer.atasNama,
          availableContacts: nameRules.map((item) => item.contact),
        });
      }
      continue;
    }

    matchedRuleKeys.add(`${normalizeText(rule.customer)}|${normalizeText(rule.contact)}`);
    const paymentTerm = buildPaymentTerm(rule.netDays);
    const invoices = await Invoice.find(
      { idCustomer: customer._id },
      "_id tanggal noInvoice paymentTerm dueDate"
    ).lean();

    if (isApplyMode) {
      await Customer.updateOne(
        { _id: customer._id },
        { $set: { defaultPaymentTerm: paymentTerm } }
      );

      if (invoices.length > 0) {
        await Invoice.bulkWrite(
          invoices.map((invoice) => ({
            updateOne: {
              filter: { _id: invoice._id },
              update: {
                $set: {
                  paymentTerm,
                  dueDate: calculateDueDate(invoice.tanggal, paymentTerm),
                },
              },
            },
          }))
        );
      }
    }

    results.push({
      customer: customer.nama,
      contact: customer.atasNama,
      netDays: rule.netDays,
      currentNetDays: Number(customer.defaultPaymentTerm?.netDays),
      invoices: invoices.length,
      matchingInvoices: invoices.filter((invoice) => {
        const expectedDueDate = calculateDueDate(invoice.tanggal, paymentTerm);
        return (
          invoice.paymentTerm?.type === "net" &&
          Number(invoice.paymentTerm?.netDays) === rule.netDays &&
          expectedDueDate?.getTime() === new Date(invoice.dueDate).getTime()
        );
      }).length,
      action: isApplyMode ? "updated" : "would update",
    });
  }

  const unmatchedRules = PAYMENT_TERMS.filter(
    (rule) =>
      !matchedRuleKeys.has(
        `${normalizeText(rule.customer)}|${normalizeText(rule.contact)}`
      )
  ).map((rule) => ({
    customer: rule.customer,
    contact: rule.contact || "",
    netDays: rule.netDays,
  }));

  console.table(results);
  if (ambiguousCustomers.length > 0) {
    console.log("Customer ambigu (tidak diubah):");
    console.table(ambiguousCustomers);
  }
  if (unmatchedRules.length > 0) {
    console.log("Aturan tanpa customer yang cocok:");
    console.table(unmatchedRules);
  }
  console.log(isApplyMode ? "Migrasi selesai." : "Dry-run selesai. Jalankan dengan --apply untuk menyimpan.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
