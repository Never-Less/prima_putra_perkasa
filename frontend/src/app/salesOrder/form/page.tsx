import { PurchaseOrderPageContent } from "../page";

type SalesOrderFormPageProps = {
  searchParams?: Promise<{
    id?: string;
  }>;
};

export default async function SalesOrderFormPage({ searchParams }: SalesOrderFormPageProps) {
  const params = await searchParams;

  return <PurchaseOrderPageContent mode="form" itemId={params?.id || ""} />;
}
