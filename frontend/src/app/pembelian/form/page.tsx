import { PembelianPageContent } from "../page";

type PembelianFormPageProps = {
  searchParams?: Promise<{
    id?: string;
  }>;
};

export default async function PembelianFormPage({ searchParams }: PembelianFormPageProps) {
  const params = await searchParams;

  return <PembelianPageContent mode="form" itemId={params?.id || ""} />;
}
