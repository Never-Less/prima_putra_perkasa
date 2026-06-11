import { CustomerPageContent } from "../page";

type CustomerFormPageProps = {
  searchParams?: Promise<{
    id?: string;
  }>;
};

export default async function CustomerFormPage({ searchParams }: CustomerFormPageProps) {
  const params = await searchParams;

  return <CustomerPageContent mode="form" itemId={params?.id || ""} />;
}
