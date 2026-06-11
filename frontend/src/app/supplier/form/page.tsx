import { SupplierPageContent } from "../page";

type SupplierFormPageProps = {
  searchParams?: Promise<{
    id?: string;
  }>;
};

export default async function SupplierFormPage({ searchParams }: SupplierFormPageProps) {
  const params = await searchParams;

  return <SupplierPageContent mode="form" itemId={params?.id || ""} />;
}
