import {
  buildSuratJalanInvoiceSpesifikasi,
  fetchInvoiceRows,
  type InvoiceItem,
  type InvoicePrefillPayload,
  type InvoiceSuratJalanBarangOption,
} from "../invoice/_lib/invoice";
import {
  fetchSuratJalanRows,
  type SuratJalanItem,
} from "../suratJalan/_lib/surat-jalan";

export type ReadyInvoicePoGroup = {
  noPo: string;
  idCustomer: string;
  suratJalanRows: SuratJalanItem[];
};

function normalizeNoSuratJalan(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export function buildInvoicedSuratJalanNumberSet(invoiceRows: InvoiceItem[]) {
  const set = new Set<string>();

  invoiceRows.forEach((invoice) => {
    invoice.noSuratJalan.forEach((noSuratJalan) => {
      const normalizedNoSuratJalan = normalizeNoSuratJalan(noSuratJalan);

      if (normalizedNoSuratJalan) {
        set.add(normalizedNoSuratJalan);
      }
    });
  });

  return set;
}

export function isSuratJalanInvoiced(
  row: SuratJalanItem,
  invoicedSuratJalanNumbers: Set<string>
) {
  return invoicedSuratJalanNumbers.has(normalizeNoSuratJalan(row.noSuratJalan));
}

export function getUninvoicedSuratJalanRows(
  suratJalanRows: SuratJalanItem[],
  invoicedSuratJalanNumbers: Set<string>
) {
  return suratJalanRows.filter(
    (row) => !isSuratJalanInvoiced(row, invoicedSuratJalanNumbers)
  );
}

export async function fetchUninvoicedSuratJalanRows() {
  const [suratJalanRows, invoiceRows] = await Promise.all([
    fetchSuratJalanRows(),
    fetchInvoiceRows(),
  ]);
  const invoicedSuratJalanNumbers = buildInvoicedSuratJalanNumberSet(invoiceRows);

  return getUninvoicedSuratJalanRows(suratJalanRows, invoicedSuratJalanNumbers);
}

export function groupUninvoicedSuratJalanRowsByPo(rows: SuratJalanItem[]) {
  const groupMap = new Map<string, ReadyInvoicePoGroup>();

  rows.forEach((row) => {
    const noPo = String(row.noPo || "").trim();

    if (!noPo) {
      return;
    }

    const currentGroup = groupMap.get(noPo);

    if (currentGroup) {
      currentGroup.idCustomer = currentGroup.idCustomer || row.idCustomer;
      currentGroup.suratJalanRows.push(row);
      return;
    }

    groupMap.set(noPo, {
      noPo,
      idCustomer: row.idCustomer,
      suratJalanRows: [row],
    });
  });

  return Array.from(groupMap.values()).sort((left, right) =>
    left.noPo.localeCompare(right.noPo)
  );
}

export async function fetchReadyInvoicePoGroups() {
  const rows = await fetchUninvoicedSuratJalanRows();

  return groupUninvoicedSuratJalanRowsByPo(rows);
}

function createReadyInvoiceBarangKey(namaBarang: string, spesifikasi: string, unit: string) {
  return `${namaBarang.trim().toLowerCase()}::${spesifikasi.trim().toLowerCase()}::${unit
    .trim()
    .toLowerCase()}`;
}

function buildSalesOrderHargaSatuanMap(barang: InvoiceSuratJalanBarangOption[] = []) {
  const hargaSatuanMap = new Map<string, number>();

  barang.forEach((item) => {
    const namaBarang = String(item.nama || "").trim();
    const spesifikasi = String(item.spesifikasi || "").trim();
    const unit = String(item.unit || "").trim();
    const hargaSatuan = Number(item.hargaSatuan || 0);

    if (!namaBarang || !unit || hargaSatuan <= 0) {
      return;
    }

    const key = createReadyInvoiceBarangKey(namaBarang, spesifikasi, unit);

    if (!hargaSatuanMap.has(key)) {
      hargaSatuanMap.set(key, hargaSatuan);
    }
  });

  return hargaSatuanMap;
}

function findSalesOrderHargaSatuan(
  hargaSatuanMap: Map<string, number>,
  namaBarang: string,
  spesifikasi: string,
  unit: string,
  fallbackSpesifikasi = ""
) {
  const keys = [
    createReadyInvoiceBarangKey(namaBarang, spesifikasi, unit),
    createReadyInvoiceBarangKey(namaBarang, fallbackSpesifikasi, unit),
  ];

  for (const key of keys) {
    const hargaSatuan = hargaSatuanMap.get(key);

    if (hargaSatuan) {
      return hargaSatuan;
    }
  }

  return 0;
}

export function buildInvoicePrefillFromSuratJalan(row: SuratJalanItem): InvoicePrefillPayload {
  return {
    tanggal: row.tanggal,
    noPo: row.noPo,
    noPoList: [row.noPo].filter(Boolean),
    noSuratJalan: [row.noSuratJalan].filter(Boolean),
    idCustomer: row.idCustomer,
    barang: row.barang
      .map((barang) => ({
        namaBarang: barang.nama,
        spesifikasi: buildSuratJalanInvoiceSpesifikasi(barang.spesifikasi, barang.kodeDepartemen),
        kuantitas: Number(barang.jumlah || 0),
        unit: barang.unit,
        noPoManual: row.noPo,
        sources: [
          {
            suratJalanId: row.id,
            noSuratJalan: row.noSuratJalan,
            noPo: row.noPo,
            barangId: barang.id,
            kuantitas: Number(barang.jumlah || 0),
          },
        ],
      }))
      .filter((barang) => barang.namaBarang && barang.kuantitas > 0),
    isPpn: true,
    ppnRate: 11,
  };
}

export function buildInvoicePrefillFromReadyInvoicePoGroup(
  group: ReadyInvoicePoGroup,
  salesOrderBarang: InvoiceSuratJalanBarangOption[] = []
): InvoicePrefillPayload {
  const hargaSatuanMap = buildSalesOrderHargaSatuanMap(salesOrderBarang);
  const barangMap = new Map<
    string,
    {
      namaBarang: string;
      spesifikasi: string;
      kuantitas: number;
      unit: string;
      hargaSatuan?: number;
      noPoManual: string;
      sources: NonNullable<InvoicePrefillPayload["barang"][number]["sources"]>;
    }
  >();
  const noSuratJalan = group.suratJalanRows
    .map((row) => String(row.noSuratJalan || "").trim())
    .filter(Boolean);
  const tanggalValues = group.suratJalanRows
    .map((row) => String(row.tanggal || "").trim())
    .filter(Boolean)
    .sort();
  const tanggal = tanggalValues[tanggalValues.length - 1] || "";

  group.suratJalanRows.forEach((row) => {
    row.barang.forEach((barang) => {
      const namaBarang = String(barang.nama || "").trim();
      const spesifikasi = buildSuratJalanInvoiceSpesifikasi(barang.spesifikasi, barang.kodeDepartemen);
      const originalSpesifikasi = String(barang.spesifikasi || "").trim();
      const unit = String(barang.unit || "").trim();
      const kuantitas = Number(barang.jumlah || 0);

      if (!namaBarang || kuantitas <= 0) {
        return;
      }

      const key = `${namaBarang.toLowerCase()}::${spesifikasi.toLowerCase()}::${unit.toLowerCase()}`;
      const hargaSatuan = findSalesOrderHargaSatuan(
        hargaSatuanMap,
        namaBarang,
        spesifikasi,
        unit,
        originalSpesifikasi
      );
      const source = {
        suratJalanId: row.id,
        noSuratJalan: row.noSuratJalan,
        noPo: row.noPo,
        barangId: barang.id,
        kuantitas,
      };
      const existingBarang = barangMap.get(key);

      if (existingBarang) {
        existingBarang.kuantitas += kuantitas;
        existingBarang.hargaSatuan = existingBarang.hargaSatuan || hargaSatuan || undefined;
        existingBarang.sources.push(source);
        return;
      }

      barangMap.set(key, {
        namaBarang,
        spesifikasi,
        kuantitas,
        unit,
        hargaSatuan: hargaSatuan || undefined,
        noPoManual: row.noPo,
        sources: [source],
      });
    });
  });

  return {
    tanggal,
    noPo: group.noPo,
    noPoList: [group.noPo].filter(Boolean),
    noSuratJalan,
    idCustomer: group.idCustomer,
    barang: Array.from(barangMap.values()),
    isPpn: true,
    ppnRate: 11,
  };
}
