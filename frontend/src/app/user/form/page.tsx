import { UserPageContent } from "../page";

type UserFormPageProps = {
  searchParams?: Promise<{
    id?: string;
  }>;
};

export default async function UserFormPage({ searchParams }: UserFormPageProps) {
  const params = await searchParams;

  return <UserPageContent mode="form" itemId={params?.id || ""} />;
}
