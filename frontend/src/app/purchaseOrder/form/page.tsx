import { PurchaseOrderPageContent } from "../page";

type PurchaseOrderFormPageProps = {
  searchParams?: Promise<{
    id?: string;
  }>;
};

export default async function PurchaseOrderFormPage({ searchParams }: PurchaseOrderFormPageProps) {
  const params = await searchParams;

  return <PurchaseOrderPageContent mode="form" itemId={params?.id || ""} />;
}
