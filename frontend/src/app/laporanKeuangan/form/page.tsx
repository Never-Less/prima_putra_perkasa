import { LaporanKeuanganPageContent } from "../page";

type LaporanKeuanganFormPageProps = {
  searchParams?: Promise<{
    bulan?: string;
  }>;
};

export default async function LaporanKeuanganFormPage({
  searchParams,
}: LaporanKeuanganFormPageProps) {
  const params = await searchParams;

  return <LaporanKeuanganPageContent mode="form" initialBulan={params?.bulan || ""} />;
}
