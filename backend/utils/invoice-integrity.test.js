const test = require("node:test");
const assert = require("node:assert/strict");

const { PurchaseOrder } = require("../models/PurchaseOrder");
const { SuratJalan } = require("../models/SuratJalan");
const { Invoice } = require("../models/Invoice");
const { validateInvoiceIntegrity } = require("./invoice-integrity");

function queryResult(value) {
  return {
    collation() {
      return this;
    },
    lean() {
      return Promise.resolve(value);
    },
  };
}

function buildInvoice(quantity) {
  return {
    _id: "invoice-1",
    noInvoice: "INV-1",
    noPo: "SO-1",
    noPoList: ["SO-1"],
    noSuratJalan: ["SJ-1"],
    idCustomer: "customer-1",
    barang: [
      {
        namaBarang: "Cable",
        spesifikasi: "",
        unit: "PCS",
        kuantitas: quantity,
        sources: [
          {
            suratJalanId: "delivery-1",
            noSuratJalan: "SJ-1",
            noPo: "SO-1",
            barangId: "delivery-item-1",
            kuantitas: quantity,
          },
        ],
      },
    ],
  };
}

test("update keeps an existing over-allocation but rejects a further increase", async () => {
  const originalMethods = {
    purchaseOrderFind: PurchaseOrder.find,
    suratJalanFind: SuratJalan.find,
    invoiceFindOne: Invoice.findOne,
    invoiceFind: Invoice.find,
    invoiceFindById: Invoice.findById,
  };
  const existingInvoice = buildInvoice(10);

  PurchaseOrder.find = () => queryResult([
    {
      noPo: "SO-1",
      namaCustomer: "customer-1",
      barang: [
        {
          namaBarang: "Cable",
          spesifikasi: "",
          unit: "PCS",
          kuantitas: 8,
        },
      ],
    },
  ]);
  SuratJalan.find = () => queryResult([
    {
      _id: "delivery-1",
      noPo: "SO-1",
      noSuratJalan: "SJ-1",
      idCustomer: "customer-1",
      barang: [
        {
          _id: "delivery-item-1",
          nama: "Cable",
          spesifikasi: "",
          unit: "PCS",
          jumlah: 10,
        },
      ],
    },
  ]);
  Invoice.findOne = () => queryResult(null);
  Invoice.find = () => queryResult([]);
  Invoice.findById = () => queryResult(existingInvoice);

  try {
    assert.equal(await validateInvoiceIntegrity(buildInvoice(10), "invoice-1"), null);
    assert.equal(
      await validateInvoiceIntegrity(buildInvoice(11), "invoice-1"),
      "Baris 1 (Cable): total kuantitas tagihan 11 melebihi batas Sales Order 10. Periksa Invoice yang sudah dibuat."
    );
    assert.equal(
      await validateInvoiceIntegrity(buildInvoice(10)),
      "Baris 1 (Cable): total kuantitas tagihan 10 melebihi batas Sales Order 8. Periksa Invoice yang sudah dibuat."
    );

    const mismatchedSourceInvoice = buildInvoice(10);
    mismatchedSourceInvoice.barang[0].sources[0].kuantitas = 9;
    assert.equal(
      await validateInvoiceIntegrity(mismatchedSourceInvoice, "invoice-1"),
      "Baris 1 (Cable): kuantitas Invoice 10 tidak sama dengan total kuantitas sumber Surat Jalan 9."
    );
  } finally {
    PurchaseOrder.find = originalMethods.purchaseOrderFind;
    SuratJalan.find = originalMethods.suratJalanFind;
    Invoice.findOne = originalMethods.invoiceFindOne;
    Invoice.find = originalMethods.invoiceFind;
    Invoice.findById = originalMethods.invoiceFindById;
  }
});

test("repeated HTML entities still match the selected Surat Jalan item", async () => {
  const originalMethods = {
    purchaseOrderFind: PurchaseOrder.find,
    suratJalanFind: SuratJalan.find,
    invoiceFindOne: Invoice.findOne,
    invoiceFind: Invoice.find,
  };

  PurchaseOrder.find = () => queryResult([{
    noPo: "SO-HTML",
    namaCustomer: "customer-1",
    barang: [{
      namaBarang: "THERMOMETER",
      spesifikasi: "TEKTRONIX & FLUKE",
      unit: "PIECE",
      kuantitas: 1,
    }],
  }]);
  SuratJalan.find = () => queryResult([{
    _id: "delivery-html",
    noPo: "SO-HTML",
    noSuratJalan: "SJ-HTML",
    idCustomer: "customer-1",
    barang: [{
      _id: "delivery-item-html",
      nama: "THERMOMETER",
      spesifikasi: "TEKTRONIX & FLUKE",
      unit: "PIECE",
      jumlah: 1,
    }],
  }]);
  Invoice.findOne = () => queryResult(null);
  Invoice.find = () => queryResult([]);

  try {
    const result = await validateInvoiceIntegrity({
      noInvoice: "INV-HTML",
      noPo: "SO-HTML",
      noPoList: ["SO-HTML"],
      noSuratJalan: ["SJ-HTML"],
      idCustomer: "customer-1",
      barang: [{
        namaBarang: "THERMOMETER",
        spesifikasi: "TEKTRONIX &amp;amp;amp; FLUKE",
        unit: "PIECE",
        kuantitas: 1,
        noPoManual: "SO-HTML",
        sources: [],
      }],
    });

    assert.equal(result, null);
  } finally {
    PurchaseOrder.find = originalMethods.purchaseOrderFind;
    SuratJalan.find = originalMethods.suratJalanFind;
    Invoice.findOne = originalMethods.invoiceFindOne;
    Invoice.find = originalMethods.invoiceFind;
  }
});
