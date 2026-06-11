import { SuratJalanFormRoute } from "../_components/surat-jalan-form-route";

type SuratJalanFormPageProps = {
  searchParams?: Promise<{
    id?: string;
  }>;
};

export default async function SuratJalanFormPage({ searchParams }: SuratJalanFormPageProps) {
  const params = await searchParams;

  return <SuratJalanFormRoute itemId={params?.id || ""} />;
}
