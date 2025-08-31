import ServerComponent from "./components/ServerComponent";

type SearchParamsType = { [key: string]: string | string[] | undefined };

export default async function PurchasePage({ searchParams }: { searchParams: Promise<SearchParamsType> }) {
  const params = await searchParams;
  return <ServerComponent searchParams={params} />;
}
