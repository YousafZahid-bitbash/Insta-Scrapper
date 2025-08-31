import ServerComponent from "./components/ServerComponent";
export default async function PurchasePage({ searchParams }: { searchParams: Promise<any> }) {
  const params = await searchParams;
  return <ServerComponent searchParams={params} />;
}
