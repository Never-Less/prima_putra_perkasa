export type CustomerItem = {
  id: string;
  Nama: string;
  Alamat: string;
  AtasNama: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerFilter = {
  Nama: string;
  Alamat: string;
  AtasNama: string;
};

export type CustomerFormState = {
  Nama: string;
  Alamat: string;
  AtasNama: string;
};

export const defaultCustomerFilter: CustomerFilter = {
  Nama: "",
  Alamat: "",
  AtasNama: "",
};

export const sampleCustomerRows: CustomerItem[] = [
  {
    id: "cust-260301",
    Nama: "PT Nusantara Bangun",
    Alamat: "Jl. Merdeka No. 21, Jakarta Pusat",
    AtasNama: "Budi Santoso",
    createdAt: "2026-03-01T09:00:00.000Z",
    updatedAt: "2026-03-10T09:00:00.000Z",
  },
  {
    id: "cust-260302",
    Nama: "CV Pilar Teknik",
    Alamat: "Jl. Sudirman No. 100, Bandung",
    AtasNama: "Andi Saputra",
    createdAt: "2026-03-02T10:00:00.000Z",
    updatedAt: "2026-03-11T10:00:00.000Z",
  },
  {
    id: "cust-260303",
    Nama: "PT Sinar Baja Utama",
    Alamat: "Jl. Gatot Subroto No. 77, Surabaya",
    AtasNama: "Rina Wulandari",
    createdAt: "2026-03-03T11:00:00.000Z",
    updatedAt: "2026-03-12T11:00:00.000Z",
  },
  {
    id: "cust-260304",
    Nama: "PT Delima Konstruksi",
    Alamat: "Jl. Ahmad Yani No. 8, Semarang",
    AtasNama: "Fajar Nugroho",
    createdAt: "2026-03-04T12:00:00.000Z",
    updatedAt: "2026-03-13T12:00:00.000Z",
  },
];

export const sampleCustomerNameOptions = sampleCustomerRows.map((customer) => customer.Nama);

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function filterCustomerRows(rows: CustomerItem[], filter: CustomerFilter) {
  return rows.filter((row) => {
    const matchNama = normalize(row.Nama).includes(normalize(filter.Nama));
    const matchAlamat = normalize(row.Alamat).includes(normalize(filter.Alamat));
    const matchAtasNama = normalize(row.AtasNama).includes(normalize(filter.AtasNama));

    return matchNama && matchAlamat && matchAtasNama;
  });
}

export function toCustomerFormState(item: CustomerItem): CustomerFormState {
  return {
    Nama: item.Nama,
    Alamat: item.Alamat,
    AtasNama: item.AtasNama,
  };
}
