import { InvoicePageContent } from "../page";

type InvoiceFormPageProps = {
  searchParams?: Promise<{
    id?: string;
  }>;
};

export default async function InvoiceFormPage({ searchParams }: InvoiceFormPageProps) {
  const params = await searchParams;

  return <InvoicePageContent mode="form" itemId={params?.id || ""} />;
}
