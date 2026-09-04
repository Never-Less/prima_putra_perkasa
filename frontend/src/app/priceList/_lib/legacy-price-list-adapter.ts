import { requestApi } from "../../_lib/api-client";
import { buildListQueryString } from "../../_lib/pagination";
import { createPriceListItemsBulk, type PriceListFormState } from "./price-list";

type LegacyBulkItem = {
  name?: string;
  sell_price?: string | number;
  sell_date?: string;
  unit?: string;
  category?: string;
  description?: string;
  productDetails?: Array<{ source?: string; date?: string; buy_price?: string | number }>;
};

function toLegacyProduct(value: unknown) {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const histories = Array.isArray(row.riwayatPembelian) ? row.riwayatPembelian : [];
  return {
    _id: String(row.id || row._id || ""),
    name: String(row.namaBarang || ""),
    sell_price: Number(row.hargaJual || 0),
    sell_date: String(row.tanggalJual || ""),
    images: (Array.isArray(row.images) ? row.images : [])
      .map((image) => String(image || ""))
      .filter(Boolean),
    productDetails: histories.map((value) => {
      const detail = value && typeof value === "object" ? value as Record<string, unknown> : {};
      return {
        _id: String(detail.id || detail._id || ""),
        source: String(detail.sumber || ""),
        date: String(detail.tanggal || ""),
        buy_price: Number(detail.hargaBeli || 0),
      };
    }),
  };
}

const apiClient = {
  async get(path: string, options: { params?: Record<string, unknown> } = {}) {
    if (path === "/category") {
      const response = await requestApi<{ customers?: Array<{ id?: string; name?: string }> }>(
        "/api/price-list/customer-names",
        { cache: "no-store" }
      );
      return {
        data: (response.customers || []).map((customer) => ({
          _id: customer.id || customer.name || "",
          name: customer.name || "",
        })),
      };
    }

    if (path === "/product") {
      const params = options.params || {};
      const query = buildListQueryString({
        namaBarang: String(params.search || ""),
        namaCustomer: String(params.category || ""),
        page: Number(params.page || 1),
        limit: Number(params.perPage || 10),
      });
      const response = await requestApi<{
        priceList?: unknown[];
        pagination?: { page?: number; limit?: number; totalItems?: number; totalPages?: number };
      }>(`/api/price-list${query}`, { cache: "no-store" });
      return {
        data: {
          productCards: (response.priceList || []).map(toLegacyProduct),
          currentPage: response.pagination?.page || 1,
          postPerPage: response.pagination?.limit || 10,
          totalProducts: response.pagination?.totalItems || 0,
          totalPages: response.pagination?.totalPages || 1,
        },
      };
    }

    throw new Error(`Unsupported legacy Price List path: ${path}`);
  },
};

export async function addProductsBulk(items: LegacyBulkItem[]) {
  const forms: PriceListFormState[] = items.map((item) => {
    const detail = item.productDetails?.[0];
    return {
      namaBarang: String(item.name || "").trim(),
      hargaJual: String(item.sell_price ?? ""),
      tanggalJual: String(item.sell_date || ""),
      idCustomer: "",
      namaCustomer: String(item.category || "").trim(),
      unit: String(item.unit || "").trim(),
      deskripsi: String(item.description || "").trim(),
      riwayatPembelian: [{
        id: "",
        sumber: String(detail?.source || "").trim(),
        tanggal: String(detail?.date || ""),
        hargaBeli: String(detail?.buy_price ?? ""),
      }],
    };
  });
  return createPriceListItemsBulk(forms);
}

export default apiClient;
